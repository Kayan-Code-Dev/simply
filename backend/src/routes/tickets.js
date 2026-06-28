import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// 1. Get all tickets for current user
router.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Server error fetching tickets.' });
  }
});

// 2. Create a ticket (user side)
router.post('/', async (req, res) => {
  const userId = req.user.id;
  const { subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  // Generate ticketId: e.g. TKT-992
  const randNum = Math.floor(100 + Math.random() * 900);
  const ticketIdStr = `TKT-${randNum}`;

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      // Create ticket
      const newTicket = await tx.supportTicket.create({
        data: {
          ticketId: ticketIdStr,
          subject,
          userId,
          status: 'PENDING'
        }
      });

      // Create initial message
      await tx.ticketMessage.create({
        data: {
          ticketId: newTicket.id,
          senderId: userId,
          message
        }
      });

      return newTicket;
    });

    res.status(201).json({ message: 'Ticket created successfully.', ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Server error creating ticket.' });
  }
});

// 3. Get messages for a ticket
router.get('/:id/messages', async (req, res) => {
  const userId = req.user.id;
  const ticketId = parseInt(req.params.id, 10);

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ ticket, messages });
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    res.status(500).json({ error: 'Server error fetching messages.' });
  }
});

// 4. Send reply message in a ticket (user side)
router.post('/:id/messages', async (req, res) => {
  const userId = req.user.id;
  const ticketId = parseInt(req.params.id, 10);
  const { message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        message
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Reopen ticket if it was resolved
    if (ticket.status === 'RESOLVED') {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'PENDING' }
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error replying to ticket:', error);
    res.status(500).json({ error: 'Server error replying to ticket.' });
  }
});

export default router;
