import express from 'express';
import prisma from '../prisma.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Generate E-PIN
router.post('/generate', async (req, res) => {
  const { amount, walletPin } = req.body;
  const userId = req.user.id;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!walletPin) {
    return res.status(400).json({ error: 'Wallet PIN is required to generate E-PINs.' });
  }

  try {
    // Verify wallet PIN
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }
    if (!wallet.walletPin) {
      return res.status(403).json({ error: 'Wallet PIN not set. Please set your wallet PIN first.' });
    }
    const pinMatch = await bcrypt.compare(walletPin, wallet.walletPin);
    if (!pinMatch) {
      return res.status(403).json({ error: 'Invalid wallet PIN.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      
      if (!wallet || Number(wallet.balance) < Number(amount)) {
        throw new Error('Insufficient wallet balance');
      }

      // Deduct from wallet
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } }
      });

      // Create E-PIN
      const rawCode = crypto.randomBytes(8).toString('hex').toUpperCase();
      const code = `EPIN-${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}-${rawCode.slice(8, 12)}`;
      
      const epin = await tx.ePin.create({
        data: {
          code,
          amount,
          ownerId: userId,
          creatorId: userId,
          status: 'ACTIVE'
        }
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          amount,
          type: 'E_PIN_GENERATION',
          status: 'COMPLETED',
          paymentMethod: 'WALLET',
          details: JSON.stringify({ epinCode: code })
        }
      });

      return epin;
    });

    res.json({ message: 'E-PIN generated successfully', epin: result });
  } catch (error) {
    console.error('Generate E-PIN error:', error);
    res.status(400).json({ error: error.message || 'Failed to generate E-PIN' });
  }
});

// List My E-PINs
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // E-Pins owned by the user
    const ownedEPins = await prisma.ePin.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { username: true, name: true, email: true } },
        usedBy: { select: { username: true, name: true, email: true } }
      }
    });

    // E-Pins created by the user but owned by someone else (transferred)
    const transferredEPins = await prisma.ePin.findMany({
      where: { 
        creatorId: userId,
        ownerId: { not: userId }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { username: true, name: true, email: true } },
        usedBy: { select: { username: true, name: true, email: true } }
      }
    });

    res.json({ ownedEPins, transferredEPins });
  } catch (error) {
    console.error('List E-PINs error:', error);
    res.status(500).json({ error: 'Failed to fetch E-PINs' });
  }
});

// Transfer E-PIN
router.post('/transfer', async (req, res) => {
  const { epinId, targetUsername, walletPin } = req.body;
  const userId = req.user.id;

  if (!epinId || !targetUsername) {
    return res.status(400).json({ error: 'Missing epinId or targetUsername' });
  }

  if (!walletPin) {
    return res.status(400).json({ error: 'Wallet PIN is required to transfer E-PINs.' });
  }

  try {
    // Verify wallet PIN
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }
    if (!wallet.walletPin) {
      return res.status(403).json({ error: 'Wallet PIN not set. Please set your wallet PIN first.' });
    }
    const pinMatch = await bcrypt.compare(walletPin, wallet.walletPin);
    if (!pinMatch) {
      return res.status(403).json({ error: 'Invalid wallet PIN.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const epin = await tx.ePin.findUnique({ where: { id: parseInt(epinId) } });
      
      if (!epin) throw new Error('E-PIN not found');
      if (epin.ownerId !== userId) throw new Error('You do not own this E-PIN');
      if (epin.status !== 'ACTIVE') throw new Error('E-PIN is not active');

      const targetUser = await tx.user.findFirst({
        where: {
          OR: [
            { username: targetUsername },
            { email: targetUsername }
          ]
        }
      });

      if (!targetUser) throw new Error('Target user not found');
      if (targetUser.id === userId) throw new Error('Cannot transfer to yourself');

      const updatedEPin = await tx.ePin.update({
        where: { id: epin.id },
        data: { ownerId: targetUser.id }
      });

      // Record transaction for sender
      await tx.transaction.create({
        data: {
          userId,
          amount: epin.amount,
          type: 'E_PIN_TRANSFER_OUT',
          status: 'COMPLETED',
          paymentMethod: 'WALLET',
          details: JSON.stringify({ epinCode: epin.code, to: targetUser.username || targetUser.email })
        }
      });

      // Record transaction for receiver
      await tx.transaction.create({
        data: {
          userId: targetUser.id,
          amount: epin.amount,
          type: 'E_PIN_TRANSFER_IN',
          status: 'COMPLETED',
          paymentMethod: 'WALLET',
          details: JSON.stringify({ epinCode: epin.code, from: req.user.username || req.user.email })
        }
      });

      return updatedEPin;
    });

    res.json({ message: 'E-PIN transferred successfully', epin: result });
  } catch (error) {
    console.error('Transfer E-PIN error:', error);
    res.status(400).json({ error: error.message || 'Failed to transfer E-PIN' });
  }
});

// Redeem E-PIN (to wallet balance)
router.post('/redeem', async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: 'Missing E-PIN code' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const epin = await tx.ePin.findUnique({ where: { code } });
      
      if (!epin) throw new Error('Invalid E-PIN code');
      if (epin.status !== 'ACTIVE') throw new Error('E-PIN has already been used');
      if (epin.ownerId !== userId) throw new Error('You do not own this E-PIN');

      // Mark E-PIN as used
      const updatedEPin = await tx.ePin.update({
        where: { id: epin.id },
        data: { 
          status: 'USED',
          usedById: userId,
          usedAt: new Date()
        }
      });

      // Add amount to wallet
      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: epin.amount } }
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          userId,
          amount: epin.amount,
          type: 'E_PIN_REDEEM',
          status: 'COMPLETED',
          paymentMethod: 'WALLET',
          details: JSON.stringify({ epinCode: epin.code })
        }
      });

      return updatedEPin;
    });

    res.json({ message: 'E-PIN redeemed successfully', amount: result.amount });
  } catch (error) {
    console.error('Redeem E-PIN error:', error);
    res.status(400).json({ error: error.message || 'Failed to redeem E-PIN' });
  }
});

export default router;
