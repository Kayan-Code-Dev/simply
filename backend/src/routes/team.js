import express from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateChallengeProgress } from '../utils/mlm.js';

const router = express.Router();

// 0. Get All Active Challenges
router.get('/challenges', authenticateToken, async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: { isActive: true }
    });
    res.json(challenges);
  } catch (err) {
    console.error('Error fetching challenges:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 1. Get Team Tree list (Flat list of descendants up to 20 levels)
router.get('/tree', authenticateToken, async (req, res) => {
  let userId = req.user.id;
  let isVirtualRoot = false;

  try {
    // If the user is admin, they can query a specific user's tree, or default to the root of the MLM tree
    if (req.user.role === 'ADMIN') {
      if (req.query.userId) {
        userId = parseInt(req.query.userId, 10);
      } else {
        isVirtualRoot = true;
      }
    }

    if (isVirtualRoot) {
      // Find all root members (role MARKETER or STUDENT, and sponsorId is null or sponsor is ADMIN)
      const rootMembers = await prisma.user.findMany({
        where: {
          role: { in: ['MARKETER', 'STUDENT'] },
          OR: [
            { sponsorId: null },
            { sponsor: { role: 'ADMIN' } }
          ]
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          status: true,
          rank: true,
          sponsorId: true,
          joinedAt: true
        }
      });

      const rootIds = rootMembers.map(r => r.id);

      // Fetch all descendants of all these root members
      const paths = await prisma.networkPath.findMany({
        where: {
          ancestorId: { in: rootIds },
          depth: { gte: 1, lte: 20 }
        },
        include: {
          descendant: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
              status: true,
              rank: true,
              sponsorId: true,
              joinedAt: true,
              userPackages: {
                select: {
                  paidAmount: true,
                  totalPrice: true
                }
              }
            }
          }
        }
      });

      // We want to combine the rootMembers themselves (at depth 1 from the virtual root)
      // and their descendants (depth = path.depth + 1)
      const teamMap = new Map();

      // Add root members
      rootMembers.forEach(r => {
        teamMap.set(r.id, {
          id: r.id,
          name: r.name,
          username: r.username,
          email: r.email,
          role: r.role,
          status: r.status,
          rank: r.rank,
          sponsorId: r.sponsorId,
          joinedAt: r.joinedAt,
          depth: 1,
          totalPaid: 0 // Will sum below if they have packages
        });
      });

      // Fetch packages for root members to calculate their totalPaid
      const rootPackages = await prisma.userPackage.findMany({
        where: { userId: { in: rootIds } },
        select: { userId: true, paidAmount: true }
      });
      rootPackages.forEach(pkg => {
        if (teamMap.has(pkg.userId)) {
          teamMap.get(pkg.userId).totalPaid += Number(pkg.paidAmount);
        }
      });

      // Add descendants
      paths.forEach(path => {
        const desc = path.descendant;
        const totalPaid = desc.userPackages.reduce((sum, pkg) => sum + Number(pkg.paidAmount), 0);
        
        const currentDepth = path.depth + 1;
        if (!teamMap.has(desc.id) || teamMap.get(desc.id).depth > currentDepth) {
          teamMap.set(desc.id, {
            id: desc.id,
            name: desc.name,
            username: desc.username,
            email: desc.email,
            role: desc.role,
            status: desc.status,
            rank: desc.rank,
            sponsorId: desc.sponsorId,
            joinedAt: desc.joinedAt,
            depth: currentDepth,
            totalPaid
          });
        }
      });

      const team = Array.from(teamMap.values());

      res.json({
        rootUser: {
          id: 0,
          name: "Simply Platform",
          username: "platform",
          email: "roots@simply.com",
          role: "ADMIN",
          status: "ACTIVE",
          rank: "PLATINUM",
          sponsorId: null,
          joinedAt: new Date()
        },
        directCount: rootMembers.length,
        totalDownline: team.length,
        team
      });
    } else {
      const rootUserRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          status: true,
          rank: true,
          sponsorId: true,
          joinedAt: true
        }
      });

      if (!rootUserRecord) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Retrieve descendants from closure table up to depth 20
      const paths = await prisma.networkPath.findMany({
        where: {
          ancestorId: userId,
          depth: { gte: 1, lte: 20 }
        },
        include: {
          descendant: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
              status: true,
              rank: true,
              sponsorId: true,
              joinedAt: true,
              userPackages: {
                select: {
                  paidAmount: true,
                  totalPrice: true
                }
              }
            }
          }
        }
      });

      const team = paths.map((path) => {
        const totalPaid = path.descendant.userPackages.reduce((sum, pkg) => sum + Number(pkg.paidAmount), 0);
        return {
          id: path.descendant.id,
          name: path.descendant.name,
          username: path.descendant.username,
          email: path.descendant.email,
          role: path.descendant.role,
          status: path.descendant.status,
          rank: path.descendant.rank,
          sponsorId: path.descendant.sponsorId,
          joinedAt: path.descendant.joinedAt,
          depth: path.depth,
          totalPaid
        };
      });

      const directCount = await prisma.user.count({
        where: { sponsorId: userId }
      });

      res.json({
        rootUser: rootUserRecord,
        directCount,
        totalDownline: team.length,
        team
      });
    }
  } catch (err) {
    console.error('Error fetching team tree:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


// 2. Get Team Legs summary & Collection Percentage
router.get('/legs-performance', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const directReferrals = await prisma.user.findMany({
      where: { sponsorId: userId },
      select: {
        id: true,
        name: true,
        email: true,
        rank: true
      }
    });

    const legsPerformance = [];
    let overallSumPercentages = 0;
    let overallStudentCount = 0;
    let totalTeamPaid = 0;
    let totalTeamRequired = 0;

    for (const ref of directReferrals) {
      // Find all descendants in this leg
      const descendants = await prisma.networkPath.findMany({
        where: { ancestorId: ref.id },
        select: { descendantId: true }
      });

      const memberIds = [ref.id, ...descendants.map(d => d.descendantId)];

      // Query all students in this leg
      const legStudents = await prisma.user.findMany({
        where: {
          id: { in: memberIds },
          role: 'STUDENT'
        },
        include: {
          userPackages: true
        }
      });

      let legSumPercentages = 0;
      let legStudentCount = 0;
      let legPaid = 0;
      let legTotal = 0;

      for (const student of legStudents) {
        if (student.userPackages && student.userPackages.length > 0) {
          let studentPaid = 0;
          let studentTotal = 0;
          for (const pkg of student.userPackages) {
            studentPaid += Number(pkg.paidAmount);
            studentTotal += Number(pkg.totalPrice);
          }
          if (studentTotal > 0) {
            legPaid += studentPaid;
            legTotal += studentTotal;
            legSumPercentages += (studentPaid / studentTotal) * 100;
            legStudentCount++;
          }
        }
      }

      totalTeamPaid += legPaid;
      totalTeamRequired += legTotal;
      overallSumPercentages += legSumPercentages;
      overallStudentCount += legStudentCount;

      legsPerformance.push({
        legUserId: ref.id,
        legUserName: ref.name,
        legUserEmail: ref.email,
        legUserRank: ref.rank,
        totalPaid: legPaid,
        totalRequired: legTotal,
        collectionPercentage: legStudentCount > 0 ? Math.round(legSumPercentages / legStudentCount) : 0
      });
    }

    // Own purchases
    const ownPackages = await prisma.userPackage.findMany({
      where: { userId },
      select: { paidAmount: true, totalPrice: true }
    });
    const ownPaid = ownPackages.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const ownTotal = ownPackages.reduce((sum, p) => sum + Number(p.totalPrice), 0);

    totalTeamPaid += ownPaid;
    totalTeamRequired += ownTotal;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (currentUser?.role === 'STUDENT' && ownTotal > 0) {
      overallSumPercentages += (ownPaid / ownTotal) * 100;
      overallStudentCount++;
    }

    const overallCollectionPercentage = overallStudentCount > 0 
      ? Math.round(overallSumPercentages / overallStudentCount) 
      : 0;

    res.json({
      overallCollectionPercentage,
      totalTeamPaid,
      totalTeamRequired,
      legs: legsPerformance,
      ownPaid,
      ownTotal
    });

  } catch (err) {
    console.error('Error fetching legs performance:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Get Challenge Progress for a specific active challenge
router.get('/challenge/:challengeId', authenticateToken, async (req, res) => {
  const challengeId = parseInt(req.params.challengeId, 10);
  const userId = req.user.id;

  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    const progress = await calculateChallengeProgress(userId, challenge);

    res.json({
      challenge,
      progress
    });

  } catch (err) {
    console.error('Error fetching challenge progress:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Get Pools Information
router.get('/pools', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rank: true, role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // 2. Calculate current pending accumulations per pool
    const pendingPools = await prisma.poolContribution.groupBy({
      where: { status: 'PENDING' },
      by: ['poolType'],
      _sum: { amount: true }
    });

    const pools = {
      RUBY: 0,
      DIAMOND: 0,
      BLACK_DIAMOND: 0
    };

    pendingPools.forEach(p => {
      pools[p.poolType] = Number(p._sum.amount || 0);
    });

    // 3. Count qualifiers for each pool tier
    const rubyRanks = ['RUBY', 'EMERALD'];
    const diamondRanks = ['DIAMOND', 'BLUE_DIAMOND'];
    const blackDiamondRanks = ['BLACK_DIAMOND', 'LEGEND'];

    const rubyQualifiersCount = await prisma.user.count({
      where: { rank: { in: rubyRanks } }
    });

    const diamondQualifiersCount = await prisma.user.count({
      where: { rank: { in: diamondRanks } }
    });

    const blackDiamondQualifiersCount = await prisma.user.count({
      where: { rank: { in: blackDiamondRanks } }
    });

    const qualifiers = {
      RUBY: rubyQualifiersCount,
      DIAMOND: diamondQualifiersCount,
      BLACK_DIAMOND: blackDiamondQualifiersCount
    };

    // 4. Check user's eligibility
    const eligibility = {
      RUBY: rubyRanks.includes(user.rank),
      DIAMOND: diamondRanks.includes(user.rank),
      BLACK_DIAMOND: blackDiamondRanks.includes(user.rank)
    };

    // 5. Fetch user's POOL commission history
    const poolCommissions = await prisma.commission.findMany({
      where: { userId, type: 'POOL' },
      orderBy: { createdAt: 'desc' }
    });

    const myPoolEarnings = poolCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

    res.json({
      userRank: user.rank,
      userRole: user.role,
      pools,
      qualifiers,
      eligibility,
      myPoolEarnings,
      poolCommissions
    });

  } catch (err) {
    console.error('Error fetching pools information:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
