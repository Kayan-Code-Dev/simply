import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendOtpEmail } from '../utils/mail.js';

const router = express.Router();

/**
 * Helper function to check if user account is active.
 * Marketers are active during first 2 months (grace period)
 * or if they have paid the $10/month subscription.
 * Students and Admins are permanently active.
 */
async function isUserActive(user) {
  if (user.status !== 'ACTIVE') {
    return false;
  }

  if (user.role === 'ADMIN' || user.isExempt) {
    return true;
  }

  // Check grace period / active subscription period
  if (user.gracePeriodEndsAt && new Date() < new Date(user.gracePeriodEndsAt)) {
    return true;
  }

  // If grace period has passed, the account is inactive
  return false;
}

/**
 * Helper function to verify wallet PIN for financial operations.
 * Returns { valid, error } object.
 */
async function verifyWalletPin(userId, pin) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId }
  });

  if (!wallet) {
    return { valid: false, error: 'Wallet not found.' };
  }

  if (!wallet.walletPin) {
    return { valid: false, error: 'Wallet PIN not set. Please set your wallet PIN first.' };
  }

  const isMatch = await bcrypt.compare(pin, wallet.walletPin);
  if (!isMatch) {
    return { valid: false, error: 'Invalid wallet PIN.' };
  }

  return { valid: true };
}

// 1. Get Wallet Balance and History
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    const active = await isUserActive(req.user);

    res.json({
      wallet,
      isActive: active,
      transactions
    });
  } catch (err) {
    console.error('Error fetching wallet info:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Deposit Funds (Simulated Stripe/PayPal or Pending Bank Transfer)
router.post('/deposit', authenticateToken, async (req, res) => {
  const { amount, paymentMethod, receiptReference } = req.body;
  const userId = req.user.id;

  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }

  const allowedMethods = ['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'PAYONEER'];
  const methodUpper = paymentMethod?.toUpperCase();
  if (!allowedMethods.includes(methodUpper)) {
    return res.status(400).json({ error: 'Invalid payment method.' });
  }

  try {
    // Check if the payment method is enabled in gateway settings
    const settingsSetting = await prisma.systemSetting.findUnique({
      where: { key: 'payment_settings' }
    });
    let gateways = {
      stripe: { enabled: true },
      paypal: { enabled: true },
      payoneer: { enabled: true },
      manual: { enabled: true }
    };
    if (settingsSetting) {
      try {
        gateways = JSON.parse(settingsSetting.value);
      } catch (e) {}
    }

    if (methodUpper === 'STRIPE' && !gateways.stripe?.enabled) {
      return res.status(400).json({ error: 'Stripe payments are currently disabled.' });
    }
    if (methodUpper === 'PAYPAL' && !gateways.paypal?.enabled) {
      return res.status(400).json({ error: 'PayPal payments are currently disabled.' });
    }
    if (methodUpper === 'PAYONEER' && !gateways.payoneer?.enabled) {
      return res.status(400).json({ error: 'Payoneer deposits are currently disabled.' });
    }
    if (methodUpper === 'BANK_TRANSFER' && !gateways.manual?.enabled) {
      return res.status(400).json({ error: 'Bank transfer deposits are currently disabled.' });
    }
    // 10% discount if deposit exceeds $2000
    let discountApplied = 0.00;
    let netAmount = depositAmount;
    if (depositAmount > 2000) {
      discountApplied = depositAmount * 0.10;
      netAmount = depositAmount - discountApplied;
    }

    const isCompleted = paymentMethod.toUpperCase() !== 'BANK_TRANSFER';
    const status = isCompleted ? 'COMPLETED' : 'PENDING';

    const transaction = await prisma.$transaction(async (tx) => {
      const trans = await tx.transaction.create({
        data: {
          userId,
          amount: netAmount,
          type: 'DEPOSIT',
          status,
          paymentMethod: paymentMethod.toUpperCase(),
          details: JSON.stringify({
            rawAmount: depositAmount,
            discountApplied,
            receiptPath: receiptReference || null
          })
        }
      });

      if (isCompleted) {
        await tx.wallet.update({
          where: { userId },
          data: {
            balance: { increment: netAmount }
          }
        });
      }

      return trans;
    });

    res.json({
      message: isCompleted ? 'Deposit completed successfully.' : 'Deposit pending approval.',
      transaction
    });

  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Initiate Withdrawal (Minimum $15, requires active status for marketers)
router.post('/withdraw', authenticateToken, async (req, res) => {
  const { amount, paymentMethod, bankDetails } = req.body;
  const userId = req.user.id;

  const withdrawalAmount = parseFloat(amount);
  if (isNaN(withdrawalAmount) || withdrawalAmount < 15.00) {
    return res.status(400).json({ error: 'Minimum withdrawal is $15.' });
  }

  if (!bankDetails) {
    return res.status(400).json({ error: 'Payout or bank details are required.' });
  }

  const selectedMethod = paymentMethod?.toUpperCase() || 'BANK_TRANSFER';
  const allowedWithdrawMethods = ['BANK_TRANSFER', 'PAYONEER'];
  if (!allowedWithdrawMethods.includes(selectedMethod)) {
    return res.status(400).json({ error: 'Invalid withdrawal method.' });
  }

  try {
    // Check if user is active
    const active = await isUserActive(req.user);
    if (!active) {
      return res.status(403).json({
        error: 'Your account is inactive. Please activate your account by paying the $10 monthly fee to enable withdrawals.'
      });
    }

    // Check balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (Number(wallet.balance) < withdrawalAmount) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    const isCompleted = selectedMethod === 'PAYONEER';

    // Process withdrawal in database transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // Deduct from balance, add to locked if pending review (BANK_TRANSFER)
      await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: withdrawalAmount },
          ...(isCompleted ? {} : { lockedBalance: { increment: withdrawalAmount } })
        }
      });

      // Create transaction
      const trans = await tx.transaction.create({
        data: {
          userId,
          amount: withdrawalAmount,
          type: 'WITHDRAWAL',
          status: isCompleted ? 'COMPLETED' : 'PENDING',
          paymentMethod: selectedMethod,
          details: JSON.stringify({ bankDetails })
        }
      });

      return trans;
    });

    res.json({
      message: isCompleted ? 'Withdrawal processed and completed automatically.' : 'Withdrawal request submitted successfully.',
      transaction
    });

  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Transfer Funds Internally to another user (Requires active status for marketers)
router.post('/transfer', authenticateToken, async (req, res) => {
  const { recipientEmail, amount, walletPin } = req.body;
  const userId = req.user.id;

  const transferAmount = parseFloat(amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'Invalid transfer amount.' });
  }

  if (!walletPin) {
    return res.status(400).json({ error: 'Wallet PIN is required for transfers.' });
  }

  if (recipientEmail === req.user.email) {
    return res.status(400).json({ error: 'Cannot transfer funds to yourself.' });
  }

  try {
    // Verify wallet PIN
    const pinCheck = await verifyWalletPin(userId, walletPin);
    if (!pinCheck.valid) {
      return res.status(403).json({ error: pinCheck.error });
    }

    // Check if sender is active
    const active = await isUserActive(req.user);
    if (!active) {
      return res.status(403).json({
        error: 'Your account is inactive. Please pay the $10 monthly fee to unlock transfers.'
      });
    }

    // Check balance
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (Number(senderWallet.balance) < transferAmount) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // Find recipient
    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail }
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient email not found.' });
    }

    // Perform transfer in transaction
    await prisma.$transaction(async (tx) => {
      // Deduct from sender
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: transferAmount } }
      });

      // Create transaction for sender
      await tx.transaction.create({
        data: {
          userId,
          amount: transferAmount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          paymentMethod: 'BANK_TRANSFER',
          details: JSON.stringify({ recipientEmail, action: 'SENT' })
        }
      });

      // Add to recipient
      await tx.wallet.update({
        where: { userId: recipient.id },
        data: { balance: { increment: transferAmount } }
      });

      // Create transaction for recipient
      await tx.transaction.create({
        data: {
          userId: recipient.id,
          amount: transferAmount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          paymentMethod: 'BANK_TRANSFER',
          details: JSON.stringify({ senderEmail: req.user.email, action: 'RECEIVED' })
        }
      });
    });

    res.json({ message: `Successfully transferred $${transferAmount} to ${recipientEmail}.` });

  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Pay Marketer Monthly Activation Fee ($10)
router.post('/activate-account', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { paymentMethod } = req.body; // STRIPE, PAYPAL

  const fee = 10.00;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user.role === 'ADMIN' || user.isExempt) {
      return res.status(400).json({ error: 'Your account is exempt and does not require monthly activation fees.' });
    }

    // If Stripe or PayPal is used, autocomplete it. If bank, user can use deposit first.
    const isCompleted = paymentMethod?.toUpperCase() !== 'BANK_TRANSFER';
    const status = isCompleted ? 'COMPLETED' : 'PENDING';

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          amount: fee,
          type: 'ACTIVATION_FEE',
          status,
          paymentMethod: paymentMethod?.toUpperCase() || 'STRIPE',
          details: JSON.stringify({ description: 'Monthly Marketer Subscription Fee' })
        }
      });

      // If paid from wallet balance (alternative route, not Stripe/Paypal)
      if (paymentMethod?.toUpperCase() === 'WALLET') {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (Number(wallet.balance) < fee) {
          throw new Error('Insufficient wallet balance to pay activation fee.');
        }

        await tx.wallet.update({
          where: { userId },
          data: { balance: { decrement: fee } }
        });
      }

      if (isCompleted) {
        let currentGrace = user.gracePeriodEndsAt ? new Date(user.gracePeriodEndsAt) : new Date();
        if (currentGrace < new Date()) {
          currentGrace = new Date();
        }
        currentGrace.setDate(currentGrace.getDate() + 30);

        await tx.user.update({
          where: { id: userId },
          data: { gracePeriodEndsAt: currentGrace }
        });
      }
    });

    res.json({ message: 'Account activation processed successfully.' });

  } catch (err) {
    console.error('Activation error:', err);
    res.status(400).json({ error: err.message || 'Internal server error.' });
  }
});

// Get user commissions list
router.get('/commissions', authenticateToken, async (req, res) => {
  try {
    const commissions = await prisma.commission.findMany({
      where: { userId: req.user.id },
      include: { buyer: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(commissions);
  } catch (err) {
    console.error('Error fetching user commissions:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ========== WALLET PIN MANAGEMENT & OTP STORE ==========

const otpStore = new Map(); // key: userId, value: { otp, expiresAt }

// Request OTP for Wallet PIN setup/change
router.post('/request-otp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    otpStore.set(userId, { otp, expiresAt });

    await sendOtpEmail(email, otp);

    res.json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Error requesting OTP:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Check if wallet PIN is set
router.get('/pin-status', authenticateToken, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      select: { walletPin: true }
    });

    res.json({ hasPinSet: !!(wallet && wallet.walletPin) });
  } catch (err) {
    console.error('Error checking PIN status:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Set Wallet PIN (first time)
router.post('/set-pin', authenticateToken, async (req, res) => {
  const { pin, otp } = req.body;
  const userId = req.user.id;

  if (!pin || pin.length < 4 || pin.length > 6) {
    return res.status(400).json({ error: 'PIN must be 4 to 6 digits.' });
  }

  if (!/^\d+$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must contain only digits.' });
  }

  if (!otp) {
    return res.status(400).json({ error: 'Verification code (OTP) is required.' });
  }

  const storedOtpData = otpStore.get(userId);
  if (!storedOtpData || storedOtpData.otp !== otp || storedOtpData.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    if (wallet.walletPin) {
      return res.status(400).json({ error: 'Wallet PIN is already set. Use the change-pin endpoint to update it.' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    await prisma.wallet.update({
      where: { userId },
      data: { walletPin: hashedPin }
    });

    // Clear OTP
    otpStore.delete(userId);

    res.json({ message: 'Wallet PIN set successfully.' });
  } catch (err) {
    console.error('Error setting wallet PIN:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Change Wallet PIN (requires current PIN)
router.post('/change-pin', authenticateToken, async (req, res) => {
  const { currentPin, newPin, otp } = req.body;
  const userId = req.user.id;

  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Current PIN and new PIN are required.' });
  }

  if (newPin.length < 4 || newPin.length > 6) {
    return res.status(400).json({ error: 'New PIN must be 4 to 6 digits.' });
  }

  if (!/^\d+$/.test(newPin)) {
    return res.status(400).json({ error: 'PIN must contain only digits.' });
  }

  if (!otp) {
    return res.status(400).json({ error: 'Verification code (OTP) is required.' });
  }

  const storedOtpData = otpStore.get(userId);
  if (!storedOtpData || storedOtpData.otp !== otp || storedOtpData.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }

  try {
    const pinCheck = await verifyWalletPin(userId, currentPin);
    if (!pinCheck.valid) {
      return res.status(403).json({ error: pinCheck.error });
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    await prisma.wallet.update({
      where: { userId },
      data: { walletPin: hashedPin }
    });

    // Clear OTP
    otpStore.delete(userId);

    res.json({ message: 'Wallet PIN changed successfully.' });
  } catch (err) {
    console.error('Error changing wallet PIN:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
