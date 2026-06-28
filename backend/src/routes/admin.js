import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { calculateCommissions, awardRankBonuses, getTeamCollectionPercentage } from '../utils/mlm.js';
import { sendTemplatedEmail } from '../utils/mail.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'SimplySuperSecretJWTKey2026!';

// Multer storage for package images
const packageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `package-${uniqueSuffix}${ext}`);
  }
});

const packageUpload = multer({
  storage: packageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'), false);
    }
  }
});

const challengeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `challenge-${uniqueSuffix}${ext}`);
  }
});

const challengeUpload = multer({
  storage: challengeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'), false);
    }
  }
});

const removeFile = (filePath) => {
  if (!filePath) return;
  const fullPath = path.resolve(filePath);
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (!err) {
      fs.unlink(fullPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting file:', unlinkErr);
      });
    }
  });
};


// Apply auth & admin role middlewares to all admin routes
router.use(authenticateToken, authorizeRoles('ADMIN'));

// Impersonate User
router.post('/users/:id/impersonate', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate token for this user
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '1h' } // Short expiry for impersonation is safer, but 7d is fine too. Let's use 1h.
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ error: 'Server error during impersonation.' });
  }
});


// 1. Get Admin Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const marketersCount = await prisma.user.count({ where: { role: 'MARKETER' } });
    const studentsCount = await prisma.user.count({ where: { role: 'STUDENT' } });

    // Financial calculations
    const salesTotal = await prisma.transaction.aggregate({
      where: { type: 'PACKAGE_PURCHASE', status: 'COMPLETED' },
      _sum: { amount: true }
    });

    const pendingWithdrawalsCount = await prisma.transaction.count({
      where: { type: 'WITHDRAWAL', status: 'PENDING' }
    });

    const pendingDepositsCount = await prisma.transaction.count({
      where: { type: { in: ['DEPOSIT', 'PACKAGE_PURCHASE', 'INSTALLMENT_PAYMENT'] }, status: 'PENDING', paymentMethod: 'BANK_TRANSFER' }
    });

    // Pool accumulations
    const poolsAccumulation = await prisma.poolContribution.groupBy({
      by: ['poolType', 'status'],
      _sum: { amount: true }
    });

    const pools = {
      RUBY: 0,
      DIAMOND: 0,
      BLACK_DIAMOND: 0
    };

    poolsAccumulation.forEach(p => {
      if (p.status === 'PENDING') {
        pools[p.poolType] = Number(p._sum.amount || 0);
      }
    });

    res.json({
      totalUsers,
      marketersCount,
      studentsCount,
      totalSales: Number(salesTotal._sum.amount || 0),
      pendingWithdrawalsCount,
      pendingDepositsCount,
      pools
    });

  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2. Get Users list
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        wallet: true,
        userPackages: {
          include: {
            package: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const collectionPercentage = await getTeamCollectionPercentage(u.id);
        return {
          ...u,
          collectionPercentage
        };
      })
    );

    res.json(usersWithStats);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Update User Status / Rank / Wallet Balance
router.patch('/users/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { status, rank, role, walletBalance, walletLockedBalance, email, username, password, packageId } = req.body;

  try {
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters long and can only contain letters, numbers, and underscores.' });
      }

      const existingUsername = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId }
        }
      });
      if (existingUsername) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
    }

    let hashedPassword = undefined;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (packageId) {
        const pkgId = parseInt(packageId, 10);
        const existingUserPkg = await tx.userPackage.findFirst({
          where: { userId }
        });
        if (existingUserPkg) {
          await tx.userPackage.update({
            where: { id: existingUserPkg.id },
            data: { packageId: pkgId }
          });
        } else {
          const pkg = await tx.package.findUnique({ where: { id: pkgId } });
          await tx.userPackage.create({
            data: {
              userId,
              packageId: pkgId,
              paidAmount: pkg ? pkg.price : 0.00,
              totalPrice: pkg ? pkg.price : 0.00,
              status: 'FULLY_PAID'
            }
          });
        }
      }

      const u = await tx.user.update({
        where: { id: userId },
        data: {
          ...(status && { status }),
          ...(rank && { rank }),
          ...(role && { role }),
          ...(email && { email }),
          ...(username && { username }),
          ...(hashedPassword && { password: hashedPassword }),
          ...(walletBalance !== undefined && {
            wallet: {
              update: {
                balance: parseFloat(walletBalance)
              }
            }
          }),
          ...(walletLockedBalance !== undefined && {
            wallet: {
              update: {
                lockedBalance: parseFloat(walletLockedBalance)
              }
            }
          })
        },
        include: {
          wallet: true,
          userPackages: {
            include: {
              package: true
            }
          }
        }
      });

      // Call awardRankBonuses if the admin changed the rank manually
      if (rank) {
        await awardRankBonuses(userId, tx);
      }

      return u;
    });

    res.json({ message: 'User updated successfully.', user: updatedUser });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Get Pending Bank Transactions
router.get('/pending-transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        paymentMethod: 'BANK_TRANSFER'
      },
      include: {
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching pending transactions:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 5. Approve Bank Transaction
router.post('/approve-transaction/:transactionId', async (req, res) => {
  const transactionId = parseInt(req.params.transactionId, 10);

  try {
    const trans = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true }
    });

    if (!trans) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    if (trans.status !== 'PENDING') {
      return res.status(400).json({ error: 'Transaction is already processed.' });
    }

    const details = JSON.parse(trans.details || '{}');

    await prisma.$transaction(async (tx) => {
      // 1. Mark transaction as COMPLETED
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' }
      });

      // 2. Process based on type
      if (trans.type === 'DEPOSIT') {
        await tx.wallet.update({
          where: { userId: trans.userId },
          data: {
            balance: { increment: trans.amount }
          }
        });
      } else if (trans.type === 'PACKAGE_PURCHASE') {
        const { packageId, paidPercentage, discountApplied } = details;

        // Register package for student
        await tx.userPackage.create({
          data: {
            userId: trans.userId,
            packageId: parseInt(packageId, 10),
            paidAmount: trans.amount,
            totalPrice: trans.amount + (discountApplied || 0), // record transaction total
            discountApplied: discountApplied || 0.00,
            status: paidPercentage === 100 ? 'FULLY_PAID' : 'ACTIVE'
          }
        });

        // Upgrade User role to STUDENT and mark as exempt
        await tx.user.update({
          where: { id: trans.userId },
          data: {
            role: 'STUDENT',
            isExempt: true
          }
        });

        // Distribute commissions ($20 gen, 10% direct, pools)
        await calculateCommissions(trans.userId, trans.amount, true, tx);
      } else if (trans.type === 'WITHDRAWAL') {
        // Withdrawal approval: deduct from locked balance (was already subtracted from balance)
        await tx.wallet.update({
          where: { userId: trans.userId },
          data: {
            lockedBalance: { decrement: trans.amount }
          }
        });
      } else if (trans.type === 'ACTIVATION_FEE') {
        // Extend user grace period by 30 days
        let currentGrace = trans.user.gracePeriodEndsAt ? new Date(trans.user.gracePeriodEndsAt) : new Date();
        if (currentGrace < new Date()) {
          currentGrace = new Date();
        }
        currentGrace.setDate(currentGrace.getDate() + 30);

        await tx.user.update({
          where: { id: trans.userId },
          data: { gracePeriodEndsAt: currentGrace }
        });
      } else if (trans.type === 'INSTALLMENT_PAYMENT') {
        // Installment approval: update UserPackage paidAmount and run commissions
        const { userPackageId } = details;

        const userPkg = await tx.userPackage.findUnique({
          where: { id: parseInt(userPackageId, 10) }
        });

        if (userPkg) {
          const newPaidAmount = Number(userPkg.paidAmount) + Number(trans.amount);
          const isFullyPaid = newPaidAmount >= Number(userPkg.totalPrice);

          await tx.userPackage.update({
            where: { id: userPkg.id },
            data: {
              paidAmount: newPaidAmount,
              status: isFullyPaid ? 'FULLY_PAID' : 'ACTIVE'
            }
          });

          // Commissions: isFirstPurchase = false
          // → Only 10% direct commission to upline
          // → No generation commissions, no pool contributions
          // → Updates upline ranks (may trigger pending rank bonuses)
          await calculateCommissions(trans.userId, Number(trans.amount), false, tx);
        }
      }
    });

    res.json({ message: 'Transaction approved and processed successfully.' });

  } catch (err) {
    console.error('Error approving transaction:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 6. Reject Pending Transaction
router.post('/reject-transaction/:transactionId', async (req, res) => {
  const transactionId = parseInt(req.params.transactionId, 10);

  try {
    const trans = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!trans || trans.status !== 'PENDING') {
      return res.status(400).json({ error: 'Transaction not found or already processed.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED' }
      });

      // If it was a withdrawal, release the locked funds back to balance
      if (trans.type === 'WITHDRAWAL') {
        await tx.wallet.update({
          where: { userId: trans.userId },
          data: {
            balance: { increment: trans.amount },
            lockedBalance: { decrement: trans.amount }
          }
        });
      }
    });

    res.json({ message: 'Transaction rejected successfully.' });

  } catch (err) {
    console.error('Error rejecting transaction:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 7. Create/Manage Challenges
router.get('/challenges', async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: { id: 'desc' }
    });
    res.json(challenges);
  } catch (err) {
    console.error('Error fetching challenges:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/challenges', challengeUpload.single('image'), async (req, res) => {
  const { 
    title, 
    description, 
    targetSales, 
    rewardType, 
    performanceLevel, 
    startDate, 
    endDate,
    rewardAmount,
    requiredDirects,
    directsType,
    targetRevenue
  } = req.body;

  if (!title) {
    if (req.file) removeFile(req.file.path);
    return res.status(400).json({ error: 'Challenge title is required.' });
  }

  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description: description || null,
        targetSales: parseInt(targetSales, 10) || 0,
        rewardType: rewardType || 'TRAVEL',
        performanceLevel: parseInt(performanceLevel, 10) || 40,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        imageUrl,
        rewardAmount: parseFloat(rewardAmount) || 0.0,
        requiredDirects: parseInt(requiredDirects, 10) || 0,
        directsType: directsType || 'ANY',
        targetRevenue: parseFloat(targetRevenue) || 0.0
      }
    });
    res.status(201).json({ message: 'Challenge created successfully.', challenge });
  } catch (err) {
    console.error('Error creating challenge:', err);
    if (req.file) removeFile(req.file.path);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/challenges/:id', challengeUpload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    if (req.file) removeFile(req.file.path);
    return res.status(400).json({ error: 'Invalid challenge ID.' });
  }

  const { 
    title, 
    description, 
    targetSales, 
    rewardType, 
    performanceLevel, 
    startDate, 
    endDate, 
    isActive,
    rewardAmount,
    requiredDirects,
    directsType,
    targetRevenue
  } = req.body;

  try {
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) {
      if (req.file) removeFile(req.file.path);
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (targetSales !== undefined) data.targetSales = parseInt(targetSales, 10) || 0;
    if (rewardType !== undefined) data.rewardType = rewardType;
    if (performanceLevel !== undefined) data.performanceLevel = parseInt(performanceLevel, 10) || 40;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
    if (rewardAmount !== undefined) data.rewardAmount = parseFloat(rewardAmount) || 0.0;
    if (requiredDirects !== undefined) data.requiredDirects = parseInt(requiredDirects, 10) || 0;
    if (directsType !== undefined) data.directsType = directsType;
    if (targetRevenue !== undefined) data.targetRevenue = parseFloat(targetRevenue) || 0.0;

    if (req.file) {
      data.imageUrl = `/uploads/${req.file.filename}`;
      // Remove old image
      if (existing.imageUrl) removeFile(existing.imageUrl.substring(1));
    }

    const challenge = await prisma.challenge.update({
      where: { id },
      data
    });
    res.json({ message: 'Challenge updated successfully.', challenge });
  } catch (err) {
    console.error('Error updating challenge:', err);
    if (req.file) removeFile(req.file.path);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/challenges/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid challenge ID.' });

  try {
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Challenge not found.' });

    await prisma.challenge.delete({ where: { id } });

    // Clean up image file
    if (existing.imageUrl) removeFile(existing.imageUrl.substring(1));

    res.json({ message: 'Challenge deleted successfully.' });
  } catch (err) {
    console.error('Error deleting challenge:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 8. Monthly Pools Distribution Trigger
router.post('/distribute-pools', async (req, res) => {
  try {
    // 1. Get all pending pool contributions
    const contributions = await prisma.poolContribution.findMany({
      where: { status: 'PENDING' }
    });

    if (contributions.length === 0) {
      return res.json({ message: 'No accumulated pool funds to distribute.' });
    }

    // Accumulate amounts per pool
    const poolTotals = {
      RUBY: 0,
      DIAMOND: 0,
      BLACK_DIAMOND: 0
    };

    contributions.forEach(c => {
      poolTotals[c.poolType] += Number(c.amount);
    });

    // 2. Find eligible users per pool
    // Ruby Pool -> RUBY and EMERALD
    const rubyEligible = await prisma.user.findMany({
      where: {
        rank: { in: ['RUBY', 'EMERALD'] }
      }
    });

    // Diamond Pool -> DIAMOND and BLUE_DIAMOND
    const diamondEligible = await prisma.user.findMany({
      where: {
        rank: { in: ['DIAMOND', 'BLUE_DIAMOND'] }
      }
    });

    // Black Diamond Pool -> BLACK_DIAMOND and LEGEND
    const blackDiamondEligible = await prisma.user.findMany({
      where: {
        rank: { in: ['BLACK_DIAMOND', 'LEGEND'] }
      }
    });

    const distributions = [];

    await prisma.$transaction(async (tx) => {
      // Process Ruby Pool
      if (poolTotals.RUBY > 0 && rubyEligible.length > 0) {
        const rubyShare = poolTotals.RUBY / rubyEligible.length;
        for (const user of rubyEligible) {
          await tx.wallet.update({
            where: { userId: user.id },
            data: {
              balance: { increment: rubyShare },
              totalEarned: { increment: rubyShare }
            }
          });
          await tx.commission.create({
            data: {
              userId: user.id,
              buyerId: user.id, // self referenced for distributions
              amount: rubyShare,
              type: 'POOL'
            }
          });
        }
        distributions.push({ pool: 'RUBY', total: poolTotals.RUBY, count: rubyEligible.length, share: rubyShare });
      }

      // Process Diamond Pool
      if (poolTotals.DIAMOND > 0 && diamondEligible.length > 0) {
        const diamondShare = poolTotals.DIAMOND / diamondEligible.length;
        for (const user of diamondEligible) {
          await tx.wallet.update({
            where: { userId: user.id },
            data: {
              balance: { increment: diamondShare },
              totalEarned: { increment: diamondShare }
            }
          });
          await tx.commission.create({
            data: {
              userId: user.id,
              buyerId: user.id,
              amount: diamondShare,
              type: 'POOL'
            }
          });
        }
        distributions.push({ pool: 'DIAMOND', total: poolTotals.DIAMOND, count: diamondEligible.length, share: diamondShare });
      }

      // Process Black Diamond Pool
      if (poolTotals.BLACK_DIAMOND > 0 && blackDiamondEligible.length > 0) {
        const blackDiamondShare = poolTotals.BLACK_DIAMOND / blackDiamondEligible.length;
        for (const user of blackDiamondEligible) {
          await tx.wallet.update({
            where: { userId: user.id },
            data: {
              balance: { increment: blackDiamondShare },
              totalEarned: { increment: blackDiamondShare }
            }
          });
          await tx.commission.create({
            data: {
              userId: user.id,
              buyerId: user.id,
              amount: blackDiamondShare,
              type: 'POOL'
            }
          });
        }
        distributions.push({ pool: 'BLACK_DIAMOND', total: poolTotals.BLACK_DIAMOND, count: blackDiamondEligible.length, share: blackDiamondShare });
      }

      // 3. Mark contributions as distributed
      const completedContributionIds = contributions.map(c => c.id);
      await tx.poolContribution.updateMany({
        where: { id: { in: completedContributionIds } },
        data: { status: 'DISTRIBUTED' }
      });
    });

    res.json({
      message: 'Pools distributed successfully.',
      distributions
    });

  } catch (err) {
    console.error('Error distributing pools:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
// Get User specific stats (e.g. Collection Percentage)
router.get('/users/:userId/stats', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Collection percentage logic
    const directReferrals = await prisma.user.findMany({
      where: { referrerId: userId },
      select: { id: true, role: true }
    });

    let overallSumPercentages = 0;
    let overallStudentCount = 0;

    for (const ref of directReferrals) {
      const descendants = await prisma.networkPath.findMany({
        where: { ancestorId: ref.id },
        select: { descendantId: true }
      });
      const memberIds = [ref.id, ...descendants.map(d => d.descendantId)];

      const legStudents = await prisma.user.findMany({
        where: { id: { in: memberIds }, role: 'STUDENT' },
        include: { userPackages: true }
      });

      let legSumPercentages = 0;
      let legStudentCount = 0;

      for (const student of legStudents) {
        if (student.userPackages && student.userPackages.length > 0) {
          let studentPaid = 0;
          let studentTotal = 0;
          for (const pkg of student.userPackages) {
            studentPaid += Number(pkg.paidAmount);
            studentTotal += Number(pkg.totalPrice);
          }
          if (studentTotal > 0) {
            legSumPercentages += (studentPaid / studentTotal) * 100;
            legStudentCount++;
          }
        }
      }

      overallSumPercentages += legSumPercentages;
      overallStudentCount += legStudentCount;
    }

    // Own purchases (if student)
    const ownPackages = await prisma.userPackage.findMany({
      where: { userId },
      select: { paidAmount: true, totalPrice: true }
    });
    const ownTotal = ownPackages.reduce((sum, p) => sum + Number(p.totalPrice), 0);
    const ownPaid = ownPackages.reduce((sum, p) => sum + Number(p.paidAmount), 0);

    if (user.role === 'STUDENT' && ownTotal > 0) {
      overallSumPercentages += (ownPaid / ownTotal) * 100;
      overallStudentCount++;
    }

    const collectionPercentage = overallStudentCount > 0 
      ? Math.round(overallSumPercentages / overallStudentCount) 
      : 0;

    res.json({ collectionPercentage });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 9. Manual Wallet Adjustment (Credit/Debit Available or Locked Balance with transaction log)
router.post('/users/:userId/adjust-wallet', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { amount, targetType, adjustmentType, description } = req.body;

  const adjAmount = parseFloat(amount);
  if (isNaN(adjAmount) || adjAmount <= 0) {
    return res.status(400).json({ error: 'Invalid adjustment amount. Must be positive.' });
  }

  if (!['balance', 'lockedBalance'].includes(targetType)) {
    return res.status(400).json({ error: 'Invalid target type. Must be "balance" or "lockedBalance".' });
  }

  if (!['CREDIT', 'DEBIT'].includes(adjustmentType?.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid adjustment type. Must be "CREDIT" or "DEBIT".' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.wallet) {
      return res.status(404).json({ error: 'User wallet not found.' });
    }

    const currentBalance = Number(user.wallet[targetType]);
    let finalAmount = adjAmount;

    if (adjustmentType === 'DEBIT') {
      if (currentBalance < adjAmount) {
        return res.status(400).json({ error: `Insufficient ${targetType} for DEBIT. Current is $${currentBalance}.` });
      }
      finalAmount = -adjAmount;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update wallet balance
      await tx.wallet.update({
        where: { userId },
        data: {
          [targetType]: { increment: finalAmount }
        }
      });

      // 2. Create custom transaction log
      await tx.transaction.create({
        data: {
          userId,
          amount: adjAmount,
          type: targetType === 'lockedBalance' ? 'WITHDRAWAL' : (finalAmount > 0 ? 'DEPOSIT' : 'WITHDRAWAL'),
          status: 'COMPLETED',
          paymentMethod: 'ADMIN_ADJUSTMENT',
          details: JSON.stringify({
            adminId: req.user.id,
            adminEmail: req.user.email,
            adjustmentType,
            targetType,
            description: description || 'Admin manual adjustment'
          })
        }
      });
    });

    res.json({ message: 'Wallet adjusted and transaction logged successfully.' });

  } catch (err) {
    console.error('Error adjusting user wallet:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 10. Get all transactions in the system (for admin)
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching all transactions:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Get Financial Analytics for Admin Panel Dashboard
router.get('/financial-analytics', async (req, res) => {
  const { preset, startDate: qStart, endDate: qEnd } = req.query;

  try {
    const now = new Date();
    let startDate = new Date(0); // Lifetime default
    let endDate = now;

    if (preset === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (preset === 'last7days') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === 'last30days') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === 'thismonth') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === 'thisyear') {
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (preset === 'custom' && qStart && qEnd) {
      startDate = new Date(qStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(qEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    // 1. Fetch completed revenue-related transactions in the period
    const revenueTransactions = await prisma.transaction.findMany({
      where: {
        type: { in: ['PACKAGE_PURCHASE', 'INSTALLMENT_PAYMENT', 'ACTIVATION_FEE'] },
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    // 2. Fetch commissions in the period
    const commissionsPaid = await prisma.commission.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const totalRevenue = revenueTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalCommissions = commissionsPaid.reduce((sum, c) => sum + Number(c.amount), 0);
    const netProfit = totalRevenue - totalCommissions;
    const commissionCount = commissionsPaid.length;

    // 3. Timeframe-based statistics (Today, This Week, This Month, This Year)
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearStartWithOffset = new Date(yearStart);
    yearStartWithOffset.setHours(0, 0, 0, 0);

    const yearTransactions = await prisma.transaction.findMany({
      where: {
        type: { in: ['PACKAGE_PURCHASE', 'INSTALLMENT_PAYMENT', 'ACTIVATION_FEE'] },
        status: 'COMPLETED',
        createdAt: { gte: yearStartWithOffset }
      }
    });

    const yearCommissions = await prisma.commission.findMany({
      where: {
        createdAt: { gte: yearStartWithOffset }
      }
    });

    // Sub-ranges
    const todayBoundary = new Date();
    todayBoundary.setHours(0, 0, 0, 0);

    const weekBoundary = new Date();
    const currentDay = weekBoundary.getDay();
    const diff = weekBoundary.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Monday start
    weekBoundary.setDate(diff);
    weekBoundary.setHours(0, 0, 0, 0);

    const monthBoundary = new Date(now.getFullYear(), now.getMonth(), 1);
    monthBoundary.setHours(0, 0, 0, 0);

    const getPeriodStats = (txList, commList, boundaryDate) => {
      const filteredTx = txList.filter(t => new Date(t.createdAt) >= boundaryDate);
      const filteredComm = commList.filter(c => new Date(c.createdAt) >= boundaryDate);
      const rev = filteredTx.reduce((sum, t) => sum + Number(t.amount), 0);
      const comm = filteredComm.reduce((sum, c) => sum + Number(c.amount), 0);
      return { revenue: rev, commissions: comm, profit: rev - comm };
    };

    const timeframes = {
      today: getPeriodStats(yearTransactions, yearCommissions, todayBoundary),
      week: getPeriodStats(yearTransactions, yearCommissions, weekBoundary),
      month: getPeriodStats(yearTransactions, yearCommissions, monthBoundary),
      year: {
        revenue: yearTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
        commissions: yearCommissions.reduce((sum, c) => sum + Number(c.amount), 0),
        profit: yearTransactions.reduce((sum, t) => sum + Number(t.amount), 0) - yearCommissions.reduce((sum, c) => sum + Number(c.amount), 0)
      }
    };

    // 4. Chart 1 & 3: Grouping logic (daily or monthly depending on range size)
    const rangeMs = endDate - startDate;
    const isMonthlyGrouping = rangeMs > 31 * 24 * 60 * 60 * 1000 || preset === 'thisyear';

    const groupedData = {};

    revenueTransactions.forEach(tx => {
      const d = new Date(tx.createdAt);
      const key = isMonthlyGrouping
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().split('T')[0];
      if (!groupedData[key]) groupedData[key] = { revenue: 0, commissions: 0 };
      groupedData[key].revenue += Number(tx.amount);
    });

    commissionsPaid.forEach(c => {
      const d = new Date(c.createdAt);
      const key = isMonthlyGrouping
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().split('T')[0];
      if (!groupedData[key]) groupedData[key] = { revenue: 0, commissions: 0 };
      groupedData[key].commissions += Number(c.amount);
    });

    const chartsData = Object.keys(groupedData).sort().map(key => ({
      period: key,
      revenue: groupedData[key].revenue,
      commissions: groupedData[key].commissions,
      netProfit: groupedData[key].revenue - groupedData[key].commissions
    }));

    // 5. Chart 2: Commission split by type
    const commTypeDataMap = {};
    commissionsPaid.forEach(c => {
      const t = c.type || 'OTHER';
      commTypeDataMap[t] = (commTypeDataMap[t] || 0) + Number(c.amount);
    });
    const commissionDistribution = Object.keys(commTypeDataMap).map(type => ({
      type,
      amount: commTypeDataMap[type]
    }));

    // 6. Top performing periods by revenue
    const topPeriods = [...chartsData]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      summary: {
        totalRevenue,
        totalCommissions,
        netProfit,
        commissionCount
      },
      timeframes,
      charts: {
        trend: chartsData,
        distribution: commissionDistribution
      },
      topPeriods
    });
  } catch (err) {
    console.error('Error fetching financial analytics:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ========== PACKAGE MANAGEMENT ==========

// 11. Get all packages with universities
router.get('/packages', async (req, res) => {
  try {
    const universities = await prisma.university.findMany({
      include: {
        packages: {
          include: {
            _count: {
              select: { userPackages: true }
            }
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    res.json(universities);
  } catch (err) {
    console.error('Error fetching admin packages:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 12. Create a new package
router.post('/packages', packageUpload.single('image'), async (req, res) => {
  const { name, price, description, universityId } = req.body;

  if (!name || !price || !universityId) {
    if (req.file) removeFile(req.file.path);
    return res.status(400).json({ error: 'Name, price, and university are required.' });
  }

  try {
    // Verify university exists
    const uni = await prisma.university.findUnique({ where: { id: parseInt(universityId, 10) } });
    if (!uni) {
      if (req.file) removeFile(req.file.path);
      return res.status(404).json({ error: 'University not found.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const pkg = await prisma.package.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        imageUrl,
        universityId: parseInt(universityId, 10)
      },
      include: {
        university: true
      }
    });

    res.status(201).json({ message: 'Package created successfully.', package: pkg });
  } catch (err) {
    console.error('Error creating package:', err);
    if (req.file) removeFile(req.file.path);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 13. Update an existing package
router.put('/packages/:id', packageUpload.single('image'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    if (req.file) removeFile(req.file.path);
    return res.status(400).json({ error: 'Invalid package ID.' });
  }

  const { name, price, description, universityId } = req.body;

  try {
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) {
      if (req.file) removeFile(req.file.path);
      return res.status(404).json({ error: 'Package not found.' });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = parseFloat(price);
    if (description !== undefined) data.description = description || null;
    if (universityId !== undefined) data.universityId = parseInt(universityId, 10);

    if (req.file) {
      data.imageUrl = `/uploads/${req.file.filename}`;
      // Remove old image
      if (existing.imageUrl) removeFile(existing.imageUrl.substring(1));
    }

    const updated = await prisma.package.update({
      where: { id },
      data,
      include: {
        university: true
      }
    });

    res.json({ message: 'Package updated successfully.', package: updated });
  } catch (err) {
    console.error('Error updating package:', err);
    if (req.file) removeFile(req.file.path);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 14. Delete a package
router.delete('/packages/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid package ID.' });

  try {
    const existing = await prisma.package.findUnique({
      where: { id },
      include: {
        _count: { select: { userPackages: true } }
      }
    });

    if (!existing) return res.status(404).json({ error: 'Package not found.' });

    if (existing._count.userPackages > 0) {
      return res.status(400).json({
        error: `Cannot delete this package. ${existing._count.userPackages} student(s) are currently enrolled in it.`
      });
    }

    await prisma.package.delete({ where: { id } });

    // Cleanup image
    if (existing.imageUrl) removeFile(existing.imageUrl.substring(1));

    res.json({ message: 'Package deleted successfully.' });
  } catch (err) {
    console.error('Error deleting package:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ========== UNIVERSITY MANAGEMENT ==========

// 15. Create a new university
router.post('/universities', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'University name is required.' });
  }

  try {
    const uni = await prisma.university.create({
      data: { name }
    });
    res.status(201).json({ message: 'University created successfully.', university: uni });
  } catch (err) {
    console.error('Error creating university:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 16. Update a university name
router.put('/universities/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid university ID.' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'University name is required.' });
  }

  try {
    const existing = await prisma.university.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'University not found.' });
    }

    const updated = await prisma.university.update({
      where: { id },
      data: { name }
    });

    res.json({ message: 'University updated successfully.', university: updated });
  } catch (err) {
    console.error('Error updating university:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 17. Delete a university
router.delete('/universities/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid university ID.' });
  }

  try {
    const existing = await prisma.university.findUnique({
      where: { id },
      include: {
        _count: { select: { packages: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'University not found.' });
    }

    if (existing._count.packages > 0) {
      return res.status(400).json({
        error: `Cannot delete this university. There are currently ${existing._count.packages} package(s) associated with it.`
      });
    }

    await prisma.university.delete({ where: { id } });
    res.json({ message: 'University deleted successfully.' });
  } catch (err) {
    console.error('Error deleting university:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ========== SUPPORT TICKETS MANAGEMENT ==========

// 18. Get all support tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(tickets);
  } catch (err) {
    console.error('Error fetching admin tickets:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 19. Create a support ticket for a specific user
router.post('/tickets', async (req, res) => {
  const { userId, subject, message } = req.body;
  const adminId = req.user.id;

  if (!userId || !subject || !message) {
    return res.status(400).json({ error: 'User ID, subject, and message are required.' });
  }

  const userIntId = parseInt(userId, 10);
  const randNum = Math.floor(100 + Math.random() * 900);
  const ticketIdStr = `TKT-${randNum}`;

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      // Create ticket
      const newTicket = await tx.supportTicket.create({
        data: {
          ticketId: ticketIdStr,
          subject,
          userId: userIntId,
          status: 'PENDING'
        }
      });

      // Create initial message
      await tx.ticketMessage.create({
        data: {
          ticketId: newTicket.id,
          senderId: adminId,
          message
        }
      });

      return newTicket;
    });

    res.status(201).json({ message: 'Ticket opened successfully.', ticket });
  } catch (err) {
    console.error('Error opening ticket as admin:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 20. Get messages for a ticket (admin view)
router.get('/tickets/:id/messages', async (req, res) => {
  const ticketId = parseInt(req.params.id, 10);

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
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
  } catch (err) {
    console.error('Error fetching ticket messages as admin:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 21. Reply to a ticket as admin
router.post('/tickets/:id/messages', async (req, res) => {
  const ticketId = parseInt(req.params.id, 10);
  const { message } = req.body;
  const adminId = req.user.id;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const newMessage = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: adminId,
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

    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error replying to ticket as admin:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 22. Update ticket status (e.g. resolve/reopen)
router.patch('/tickets/:id/status', async (req, res) => {
  const ticketId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['PENDING', 'RESOLVED'].includes(status?.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid status. Must be PENDING or RESOLVED.' });
  }

  try {
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: status.toUpperCase() }
    });

    res.json({ message: `Ticket status updated to ${status}.`, ticket: updated });
  } catch (err) {
    console.error('Error updating ticket status:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 23. Get pending KYC requests
router.get('/kyc/pending', async (req, res) => {
  try {
    const pendingKycUsers = await prisma.user.findMany({
      where: { kycStatus: 'PENDING' },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        rank: true,
        status: true,
        kycStatus: true,
        kycFullName: true,
        kycDocumentType: true,
        kycDocumentNumber: true,
        kycFrontImage: true,
        kycBackImage: true,
        kycSubmittedAt: true,
        joinedAt: true
      },
      orderBy: { kycSubmittedAt: 'asc' }
    });
    res.json(pendingKycUsers);
  } catch (err) {
    console.error('Error fetching pending KYC:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 24. Approve KYC Request
router.post('/kyc/:userId/approve', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid User ID.' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'APPROVED',
        status: 'ACTIVE'
      }
    });

    res.json({ message: 'KYC approved and user account activated successfully.', user: updatedUser });
  } catch (err) {
    console.error('Error approving KYC:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 25. Reject KYC Request
router.post('/kyc/:userId/reject', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid User ID.' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Clean up uploaded documents
    if (user.kycFrontImage) removeFile(user.kycFrontImage.substring(1));
    if (user.kycBackImage) removeFile(user.kycBackImage.substring(1));

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'REJECTED',
        status: 'INACTIVE',
        kycFrontImage: null,
        kycBackImage: null
      }
    });

    res.json({ message: 'KYC verification rejected and documents reset.', user: updatedUser });
  } catch (err) {
    console.error('Error rejecting KYC:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET all email templates
router.get('/email-templates', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(templates);
  } catch (err) {
    console.error('Error fetching email templates:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// UPDATE an email template
router.put('/email-templates/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  const { subject, htmlBody, isActive } = req.body;
  try {
    const template = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        subject,
        htmlBody,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json({ message: 'Template updated successfully.', template });
  } catch (err) {
    console.error('Error updating email template:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// SEND test email for a template
router.post('/email-templates/:id/test', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const templateId = parseInt(req.params.id, 10);
  const { testEmail } = req.body;
  if (!testEmail) {
    return res.status(400).json({ error: 'Test email address is required.' });
  }
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId }
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }
    
    // Construct mockup variables based on the JSON array of variables
    const vars = {};
    let variablesList = [];
    try {
      variablesList = JSON.parse(template.variables);
    } catch (e) {
      variablesList = [];
    }
    
    variablesList.forEach(v => {
      vars[v] = `[Test ${v}]`;
    });
    // Extra defaults just in case
    vars['name'] = req.user?.username || 'Test User';
    vars['email'] = testEmail;
    vars['amount'] = '100.00';
    vars['date'] = new Date().toLocaleDateString();
    vars['otp'] = '123456';
    vars['expiryMinutes'] = '10';
    vars['packageName'] = 'Master';
    vars['university'] = 'Oxford University';
    
    await sendTemplatedEmail(template.slug, testEmail, vars);
    res.json({ message: `Test email sent to ${testEmail} successfully.` });
  } catch (err) {
    console.error('Error sending test email:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /admin/email-broadcast
router.post('/email-broadcast', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  const { subject, htmlBody, recipientsType, selectedUserIds } = req.body;
  if (!subject || !htmlBody || !recipientsType) {
    return res.status(400).json({ error: 'Subject, body, and recipients type are required.' });
  }

  try {
    let usersToEmail = [];
    if (recipientsType === 'all') {
      usersToEmail = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { email: true, name: true }
      });
    } else if (recipientsType === 'marketers') {
      usersToEmail = await prisma.user.findMany({
        where: { role: 'MARKETER', status: 'ACTIVE' },
        select: { email: true, name: true }
      });
    } else if (recipientsType === 'students') {
      usersToEmail = await prisma.user.findMany({
        where: { role: 'STUDENT', status: 'ACTIVE' },
        select: { email: true, name: true }
      });
    } else if (recipientsType === 'selected') {
      if (!Array.isArray(selectedUserIds) || selectedUserIds.length === 0) {
        return res.status(400).json({ error: 'Selected user IDs are required.' });
      }
      usersToEmail = await prisma.user.findMany({
        where: { id: { in: selectedUserIds } },
        select: { email: true, name: true }
      });
    }

    if (usersToEmail.length === 0) {
      return res.status(400).json({ error: 'No active users found for the selected recipient filter.' });
    }

    // Set up nodemailer transporter
    const nodemailer = await import('nodemailer');
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let transporter;
    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    } else {
      // Fallback: Ethereal dynamic test account
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
      } catch (err) {
        console.warn('Failed to create Ethereal account, email sending bypassed.', err.message);
        return res.status(500).json({ error: 'Mail transport error.' });
      }
    }

    console.log(`Sending broadcast to ${usersToEmail.length} users...`);

    const hasHtmlLayout = htmlBody.includes('<html') || htmlBody.includes('<body');
    const styledHtmlBody = hasHtmlLayout ? htmlBody : `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f8fb; color: #2d3748; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #8b5cf6; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; }
          .header h1 span { color: #8b5cf6; }
          .content { padding: 35px 25px; line-height: 1.6; font-size: 15px; color: #334155; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SIMPLY<span>.COM</span></h1>
          </div>
          <div class="content">
            ${htmlBody}
          </div>
          <div class="footer">
            <p>&copy; 2026 Simply.com. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails
    const sendPromises = usersToEmail.map(u => {
      let personalizedSubject = subject.replace(/{{\s*name\s*}}/g, u.name);
      let personalizedBody = styledHtmlBody.replace(/{{\s*name\s*}}/g, u.name);
      
      return transporter.sendMail({
        from: `"${process.env.SITE_NAME || 'Simply.com'}" <no-reply@simply.com>`,
        to: u.email,
        subject: personalizedSubject,
        html: personalizedBody
      }).catch(e => {
        console.error(`Failed to send email to ${u.email}:`, e.message);
        return null;
      });
    });

    await Promise.all(sendPromises);

    res.json({ message: `Broadcast sent to ${usersToEmail.length} users successfully.` });
  } catch (err) {
    console.error('Error sending email broadcast:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;

