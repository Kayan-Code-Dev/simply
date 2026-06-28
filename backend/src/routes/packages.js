import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateCommissions } from '../utils/mlm.js';

const router = express.Router();

// 1. Get Universities and their packages
router.get('/universities', async (req, res) => {
  try {
    const universities = await prisma.university.findMany({
      include: {
        packages: true
      }
    });
    res.json(universities);
  } catch (err) {
    console.error('Error fetching universities:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Buy Package (Initiate purchase)
router.post('/purchase', authenticateToken, async (req, res) => {
  const { packageId, paymentPercentage, paymentMethod, epinCode } = req.body;
  const userId = req.user.id;

  if (!packageId || !paymentPercentage || !paymentMethod) {
    return res.status(400).json({ error: 'Package ID, payment percentage, and payment method are required.' });
  }

  const pct = parseFloat(paymentPercentage);
  if (isNaN(pct) || pct < 25 || pct > 100) {
    return res.status(400).json({ error: 'Payment percentage must be between 25% and 100%.' });
  }

  const allowedMethods = ['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'EPIN'];
  const methodUpper = paymentMethod.toUpperCase();
  if (!allowedMethods.includes(methodUpper)) {
    return res.status(400).json({ error: 'Invalid payment method. Supported: Stripe, PayPal, Bank Transfer, EPIN.' });
  }

  try {
    // Check gateway status in settings
    const settingsSetting = await prisma.systemSetting.findUnique({
      where: { key: 'payment_settings' }
    });
    let gateways = {
      stripe: { enabled: true },
      paypal: { enabled: true },
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
    if (methodUpper === 'BANK_TRANSFER' && !gateways.manual?.enabled) {
      return res.status(400).json({ error: 'Bank transfer payments are currently disabled.' });
    }
    // Get Package details
    const pkg = await prisma.package.findUnique({
      where: { id: parseInt(packageId, 10) },
      include: { university: true }
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found.' });
    }

    // Check if user already owns this package
    const existingUserPkg = await prisma.userPackage.findFirst({
      where: { userId, packageId: pkg.id }
    });

    if (existingUserPkg) {
      return res.status(400).json({ error: 'You are already registered in this study program.' });
    }

    // Calculate raw payment amount based on percentage
    const rawPrice = Number(pkg.price);
    let amountToPay = rawPrice * (pct / 100);

    // Apply 10% discount if payment exceeds $2000
    let discountApplied = 0.00;
    if (amountToPay > 2000) {
      discountApplied = amountToPay * 0.10;
      amountToPay = amountToPay - discountApplied;
    }

    // If Stripe or PayPal, auto-complete transaction immediately.
    // If Bank Transfer, set to PENDING for admin approval.
    const isCompleted = paymentMethod.toUpperCase() !== 'BANK_TRANSFER';
    const status = isCompleted ? 'COMPLETED' : 'PENDING';

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Handle E-PIN validation and consumption if applicable
      if (paymentMethod.toUpperCase() === 'EPIN') {
        if (!epinCode) throw new Error('E-PIN code is required when paying with E-PIN.');
        
        const epin = await tx.ePin.findUnique({ where: { code: epinCode } });
        if (!epin || epin.status !== 'ACTIVE') {
          throw new Error('Invalid or already used E-PIN.');
        }
        
        if (Number(epin.amount) < amountToPay) {
          throw new Error(`E-PIN amount ($${epin.amount}) is insufficient. Required: $${amountToPay}.`);
        }

        // Mark E-PIN as used
        await tx.ePin.update({
          where: { id: epin.id },
          data: {
            status: 'USED',
            usedById: userId,
            usedAt: new Date()
          }
        });

        // Credit remainder to user wallet
        const remainder = Number(epin.amount) - amountToPay;
        if (remainder > 0) {
          await tx.wallet.update({
            where: { userId },
            data: { balance: { increment: remainder } }
          });
        }
      }

      // 2. Create Transaction
      const trans = await tx.transaction.create({
        data: {
          userId,
          amount: amountToPay,
          type: 'PACKAGE_PURCHASE',
          status,
          paymentMethod: paymentMethod.toUpperCase(),
          details: JSON.stringify({
            packageId: pkg.id,
            packageName: pkg.name,
            universityName: pkg.university.name,
            paidPercentage: pct,
            rawAmount: rawPrice * (pct / 100),
            discountApplied
          })
        }
      });

      // 2. If completed, register package, update user role, exempt them, and run commissions
      if (isCompleted) {
        await tx.userPackage.create({
          data: {
            userId,
            packageId: pkg.id,
            paidAmount: amountToPay,
            totalPrice: rawPrice - (rawPrice * (pct / 100) > 2000 ? (rawPrice * (pct / 100) * 0.10) : 0), // record price
            discountApplied,
            status: pct === 100 ? 'FULLY_PAID' : 'ACTIVE'
          }
        });

        // Update User role to STUDENT and mark as exempt from $10 activation fee
        await tx.user.update({
          where: { id: userId },
          data: {
            role: 'STUDENT',
            isExempt: true
          }
        });

        // Trigger commission calculations ($20 generation, 10% direct, pools)
        await calculateCommissions(userId, amountToPay, true, tx);
      }

      return trans;
    });

    if (isCompleted) {
      return res.status(200).json({
        message: 'Purchase completed successfully! You are now enrolled.',
        transaction
      });
    } else {
      return res.status(200).json({
        message: 'Your bank transfer request is pending. Please upload the receipt or contact administration to activate.',
        transaction
      });
    }

  } catch (err) {
    console.error('Purchase error:', err);
    // If it's a thrown Error from our transaction block, send that message
    if (err.message && !err.message.includes('prisma')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Upload bank receipt for a pending transaction
router.post('/upload-receipt/:transactionId', authenticateToken, async (req, res) => {
  const transactionId = parseInt(req.params.transactionId, 10);
  const userId = req.user.id;

  // Wait, normally we would use multer to upload a file here.
  // For the API representation, we accept a text field/JSON parameter `receiptPath` (or mock multer file path)
  const { receiptPath } = req.body;

  if (!receiptPath) {
    return res.status(400).json({ error: 'Receipt path or reference number is required.' });
  }

  try {
    const trans = await prisma.transaction.findFirst({
      where: { id: transactionId, userId, status: 'PENDING' }
    });

    if (!trans) {
      return res.status(404).json({ error: 'Pending transaction not found.' });
    }

    const currentDetails = JSON.parse(trans.details || '{}');
    const updatedDetails = {
      ...currentDetails,
      receiptUploadedAt: new Date().toISOString(),
      receiptPath
    };

    const updatedTrans = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        details: JSON.stringify(updatedDetails)
      }
    });

    res.json({
      message: 'Receipt details updated successfully. Pending admin review.',
      transaction: updatedTrans
    });

  } catch (err) {
    console.error('Receipt upload error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Pay Installment on an existing package
router.post('/pay-installment', authenticateToken, async (req, res) => {
  const { userPackageId, amount, paymentMethod, epinCode } = req.body;
  const userId = req.user.id;

  if (!userPackageId || !amount || !paymentMethod) {
    return res.status(400).json({ error: 'User Package ID, amount, and payment method are required.' });
  }

  const installmentAmount = parseFloat(amount);
  if (isNaN(installmentAmount) || installmentAmount <= 0) {
    return res.status(400).json({ error: 'Invalid installment amount.' });
  }

  const allowedMethods = ['STRIPE', 'PAYPAL', 'BANK_TRANSFER', 'EPIN'];
  const methodUpper = paymentMethod.toUpperCase();
  if (!allowedMethods.includes(methodUpper)) {
    return res.status(400).json({ error: 'Invalid payment method. Supported: Stripe, PayPal, Bank Transfer, EPIN.' });
  }

  try {
    // Check gateway status in settings
    const settingsSetting = await prisma.systemSetting.findUnique({
      where: { key: 'payment_settings' }
    });
    let gateways = {
      stripe: { enabled: true },
      paypal: { enabled: true },
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
    if (methodUpper === 'BANK_TRANSFER' && !gateways.manual?.enabled) {
      return res.status(400).json({ error: 'Bank transfer payments are currently disabled.' });
    }
    // 1. Find the user's package
    const userPkg = await prisma.userPackage.findFirst({
      where: {
        id: parseInt(userPackageId, 10),
        userId
      },
      include: { package: true }
    });

    if (!userPkg) {
      return res.status(404).json({ error: 'Package not found or does not belong to you.' });
    }

    if (userPkg.status === 'FULLY_PAID') {
      return res.status(400).json({ error: 'This package is already fully paid.' });
    }

    // 2. Calculate remaining amount
    const paidSoFar = Number(userPkg.paidAmount);
    const totalPrice = Number(userPkg.totalPrice);
    const remaining = totalPrice - paidSoFar;

    if (remaining <= 0) {
      return res.status(400).json({ error: 'No remaining balance on this package.' });
    }

    // Cap the installment to the remaining amount
    let amountToPay = Math.min(installmentAmount, remaining);

    // 3. Determine if transaction completes immediately
    const isCompleted = paymentMethod.toUpperCase() !== 'BANK_TRANSFER';
    const status = isCompleted ? 'COMPLETED' : 'PENDING';

    const transaction = await prisma.$transaction(async (tx) => {
      // Handle E-PIN validation and consumption
      if (paymentMethod.toUpperCase() === 'EPIN') {
        if (!epinCode) throw new Error('E-PIN code is required when paying with E-PIN.');

        const epin = await tx.ePin.findUnique({ where: { code: epinCode } });
        if (!epin || epin.status !== 'ACTIVE') {
          throw new Error('Invalid or already used E-PIN.');
        }

        if (Number(epin.amount) < amountToPay) {
          throw new Error(`E-PIN amount ($${epin.amount}) is insufficient. Required: $${amountToPay}.`);
        }

        // Mark E-PIN as used
        await tx.ePin.update({
          where: { id: epin.id },
          data: {
            status: 'USED',
            usedById: userId,
            usedAt: new Date()
          }
        });

        // Credit remainder to user wallet
        const remainder = Number(epin.amount) - amountToPay;
        if (remainder > 0) {
          await tx.wallet.update({
            where: { userId },
            data: { balance: { increment: remainder } }
          });
        }
      }

      // Create Transaction record
      const trans = await tx.transaction.create({
        data: {
          userId,
          amount: amountToPay,
          type: 'INSTALLMENT_PAYMENT',
          status,
          paymentMethod: paymentMethod.toUpperCase(),
          details: JSON.stringify({
            userPackageId: userPkg.id,
            packageId: userPkg.packageId,
            packageName: userPkg.package.name,
            installmentAmount: amountToPay,
            paidBefore: paidSoFar,
            paidAfter: paidSoFar + amountToPay,
            totalPrice,
            remainingAfter: remaining - amountToPay
          })
        }
      });

      // If payment completes immediately, process it
      if (isCompleted) {
        const newPaidAmount = paidSoFar + amountToPay;
        const isFullyPaid = newPaidAmount >= totalPrice;

        // Update UserPackage
        await tx.userPackage.update({
          where: { id: userPkg.id },
          data: {
            paidAmount: newPaidAmount,
            status: isFullyPaid ? 'FULLY_PAID' : 'ACTIVE'
          }
        });

        // Calculate commissions: isFirstPurchase = false
        // → Only 10% direct commission to upline
        // → No generation commissions, no pool contributions
        // → Updates upline ranks (may trigger pending rank bonuses via collection %)
        await calculateCommissions(userId, amountToPay, false, tx);
      }

      return trans;
    });

    if (isCompleted) {
      const newRemaining = remaining - amountToPay;
      return res.status(200).json({
        message: newRemaining <= 0
          ? 'Installment paid successfully! Package is now fully paid.'
          : `Installment paid successfully! Remaining: $${newRemaining.toFixed(2)}.`,
        transaction
      });
    } else {
      return res.status(200).json({
        message: 'Installment payment pending. Please upload the bank transfer receipt or contact administration.',
        transaction
      });
    }

  } catch (err) {
    console.error('Installment payment error:', err);
    if (err.message && !err.message.includes('prisma')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Get student's packages with payment progress
router.get('/my-packages', authenticateToken, async (req, res) => {
  try {
    const userPackages = await prisma.userPackage.findMany({
      where: { userId: req.user.id },
      include: {
        package: {
          include: { university: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const packagesWithProgress = userPackages.map(up => ({
      ...up,
      remaining: Number(up.totalPrice) - Number(up.paidAmount),
      paymentPercentage: Number(up.totalPrice) > 0
        ? Math.round((Number(up.paidAmount) / Number(up.totalPrice)) * 100)
        : 100
    }));

    res.json(packagesWithProgress);
  } catch (err) {
    console.error('Error fetching user packages:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
