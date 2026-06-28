import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';
import { createNetworkNode } from '../utils/mlm.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'SimplySuperSecretJWTKey2026!';

// 1. Signup / Register (Free Marketer Registration)
router.post('/register', async (req, res) => {
  const { username, name, email, password, sponsorUsername, sponsorId } = req.body;

  if (!username || !name || !email || !password) {
    return res.status(400).json({ error: 'Username, name, email, and password are required.' });
  }

  // Basic regex validation for username: alphanumeric & underscores only, 3-20 characters
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.'
    });
  }

  try {
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken.' });
    }

    let parsedSponsorId = null;
    if (sponsorUsername) {
      // First check if it's a number (fallback for old referral links which have ref=userId)
      const numericSponsorId = parseInt(sponsorUsername, 10);
      let sponsorExists = null;
      if (!isNaN(numericSponsorId)) {
        sponsorExists = await prisma.user.findUnique({
          where: { id: numericSponsorId }
        });
      }

      if (!sponsorExists) {
        // Search by username
        sponsorExists = await prisma.user.findUnique({
          where: { username: sponsorUsername }
        });
      }

      if (!sponsorExists) {
        return res.status(400).json({ error: 'Sponsor user does not exist.' });
      }
      parsedSponsorId = sponsorExists.id;
    } else if (sponsorId) {
      parsedSponsorId = parseInt(sponsorId, 10);
      if (isNaN(parsedSponsorId)) {
        return res.status(400).json({ error: 'Invalid sponsor ID.' });
      }

      const sponsorExists = await prisma.user.findUnique({
        where: { id: parsedSponsorId }
      });

      if (!sponsorExists) {
        return res.status(400).json({ error: 'Sponsor user does not exist.' });
      }
    }

    // Grace period ends in 2 months (60 days)
    const gracePeriod = new Date();
    gracePeriod.setDate(gracePeriod.getDate() + 60);

    // Create user in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          name,
          username,
          email,
          password: hashedPassword,
          role: 'MARKETER',
          sponsorId: parsedSponsorId,
          gracePeriodEndsAt: gracePeriod,
          status: 'ACTIVE',
          wallet: {
            create: {
              balance: 0.00,
              lockedBalance: 0.00,
              totalEarned: 0.00
            }
          }
        }
      });

      // Create network node closure paths
      await createNetworkNode(user.id, parsedSponsorId, tx);

      return user;
    });

    // Generate JWT token
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        rank: newUser.rank,
        joinedAt: newUser.joinedAt
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Signin / Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: email },
      include: { wallet: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        rank: user.rank,
        isExempt: user.isExempt,
        gracePeriodEndsAt: user.gracePeriodEndsAt,
        joinedAt: user.joinedAt,
        wallet: user.wallet
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Get Current User Info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const fullUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        wallet: true,
        userPackages: {
          include: {
            package: true
          }
        }
      }
    });
    res.json({ user: fullUser });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Check Sponsor Username
router.get('/sponsor/:username', async (req, res) => {
  const { username } = req.params;

  try {
    let sponsor = await prisma.user.findUnique({
      where: { username }
    });

    if (!sponsor && !isNaN(parseInt(username, 10))) {
      sponsor = await prisma.user.findUnique({
        where: { id: parseInt(username, 10) }
      });
    }

    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor user does not exist.' });
    }

    res.json({
      id: sponsor.id,
      username: sponsor.username,
      name: sponsor.name
    });
  } catch (err) {
    console.error('Error checking sponsor:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
