import prisma from '../prisma.js';

/**
 * Creates network paths in the Closure Table for a newly registered user.
 * @param {number} userId - The ID of the newly registered user.
 * @param {number|null} sponsorId - The ID of the sponsor (upline).
 * @param {object} tx - The Prisma transaction client.
 */
export async function createNetworkNode(userId, sponsorId, tx = prisma) {
  // 1. Insert self path (depth 0)
  await tx.networkPath.create({
    data: {
      ancestorId: userId,
      descendantId: userId,
      depth: 0
    }
  });

  if (sponsorId) {
    // 2. Find all ancestors of the sponsor
    const sponsorAncestors = await tx.networkPath.findMany({
      where: { descendantId: sponsorId }
    });

    // 3. Insert paths for all ancestors to the new user (depth = sponsor_ancestor_depth + 1)
    const newPaths = sponsorAncestors.map((path) => ({
      ancestorId: path.ancestorId,
      descendantId: userId,
      depth: path.depth + 1
    }));

    // 4. Insert direct path from sponsor to new user (depth 1)
    // (Note: this is already covered if the sponsor is an ancestor of themselves with depth 0,
    // which sponsorAncestors contains as (sponsorId, sponsorId, 0). Adding 1 to it yields (sponsorId, userId, 1)).
    await tx.networkPath.createMany({
      data: newPaths
    });
  }
}

/**
 * Calculates and distributes commissions when a payment is made.
 * @param {number} buyerId - The ID of the student who made the payment.
 * @param {number} paidAmount - The amount paid in this transaction.
 * @param {boolean} isFirstPurchase - Whether this is the first payment of the package.
 * @param {object} tx - The Prisma transaction client.
 */
export async function calculateCommissions(buyerId, paidAmount, isFirstPurchase, tx = prisma) {
  const buyer = await tx.user.findUnique({
    where: { id: buyerId },
    include: { sponsor: true }
  });

  if (!buyer || !buyer.sponsorId) return;

  const sponsorId = buyer.sponsorId;

  // 1. Direct Commission: 10% of the paid amount
  const directCommissionAmount = Number(paidAmount) * 0.10;
  if (directCommissionAmount > 0) {
    // Check/create wallet for sponsor
    await tx.wallet.update({
      where: { userId: sponsorId },
      data: {
        balance: { increment: directCommissionAmount },
        totalEarned: { increment: directCommissionAmount }
      }
    });

    // Create Commission Record
    await tx.commission.create({
      data: {
        userId: sponsorId,
        buyerId: buyerId,
        amount: directCommissionAmount,
        type: 'DIRECT'
      }
    });

    // Trigger Socket notification / audit log if needed
  }

  // 2. Generation Commission & Pool Contributions (only on package purchase / first installment)
  if (isFirstPurchase) {
    // Generation commission: $20 to each ancestor up to 20 levels (no rank conditions as per user specifications)
    const ancestors = await tx.networkPath.findMany({
      where: {
        descendantId: buyerId,
        depth: { gte: 1, lte: 20 }
      },
      orderBy: { depth: 'asc' }
    });

    for (const path of ancestors) {
      const ancestorId = path.ancestorId;
      const genCommissionAmount = 20.00;

      // Increment ancestor's wallet
      await tx.wallet.update({
        where: { userId: ancestorId },
        data: {
          balance: { increment: genCommissionAmount },
          totalEarned: { increment: genCommissionAmount }
        }
      });

      // Create Commission Record
      await tx.commission.create({
        data: {
          userId: ancestorId,
          buyerId: buyerId,
          amount: genCommissionAmount,
          type: 'GENERATION',
          level: path.depth
        }
      });
    }

    // 3. Pool Contributions: $33 for Ruby, $33 for Diamond, $33 for Black Diamond
    await tx.poolContribution.createMany({
      data: [
        { amount: 33.00, poolType: 'RUBY' },
        { amount: 33.00, poolType: 'DIAMOND' },
        { amount: 33.00, poolType: 'BLACK_DIAMOND' }
      ]
    });
  }

  // 4. Update Upline Ranks after this transaction
  await updateUplineRanks(buyerId, tx);
}

export async function updateUplineRanks(userId, tx = prisma) {
  // Check and upgrade the user themselves first
  await checkAndUpgradeRank(userId, tx);
  await awardRankBonuses(userId, tx);

  // Get all ancestors of this user
  const paths = await tx.networkPath.findMany({
    where: { descendantId: userId, depth: { gt: 0 } },
    orderBy: { depth: 'asc' }
  });

  for (const path of paths) {
    await checkAndUpgradeRank(path.ancestorId, tx);
    await awardRankBonuses(path.ancestorId, tx);
  }
}

export const RANK_ORDER = [
  'DISTRIBUTOR',
  'STARTER_LEADER',
  'MANAGER_LEADER',
  'SILVER_LEADER',
  'GOLD',
  'PLATINUM',
  'RUBY',
  'EMERALD',
  'DIAMOND',
  'BLUE_DIAMOND',
  'BLACK_DIAMOND',
  'LEGEND'
];

/**
 * Calculates the overall team collection percentage for a user.
 * @param {number} userId - The user ID.
 * @returns {number} The collection percentage (0 to 100).
 */
export async function getTeamCollectionPercentage(userId, tx = prisma) {
  // Find all descendants in the user's downline tree
  const paths = await tx.networkPath.findMany({
    where: { ancestorId: userId },
    select: { descendantId: true }
  });

  const memberIds = [userId, ...paths.map(p => p.descendantId)];

  // Get all users who are students in this list
  const students = await tx.user.findMany({
    where: {
      id: { in: memberIds },
      role: 'STUDENT'
    },
    include: {
      userPackages: true
    }
  });

  let sumPercentages = 0;
  let studentCount = 0;

  for (const student of students) {
    if (student.userPackages && student.userPackages.length > 0) {
      let studentPaid = 0;
      let studentTotal = 0;
      for (const pkg of student.userPackages) {
        studentPaid += Number(pkg.paidAmount);
        studentTotal += Number(pkg.totalPrice);
      }
      if (studentTotal > 0) {
        sumPercentages += (studentPaid / studentTotal) * 100;
        studentCount++;
      }
    }
  }

  return studentCount > 0 ? Math.round(sumPercentages / studentCount) : 0;
}

/**
 * Evaluates and awards one-time and split cash rank bonuses.
 * @param {number} userId - The user ID.
 * @param {object} tx - The Prisma transaction client.
 */
export async function awardRankBonuses(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
  });

  if (!user || user.role === 'ADMIN') return;

  const currentRank = user.rank;
  const rankIndex = RANK_ORDER.indexOf(currentRank);
  if (rankIndex <= 0) return; // Distributor or invalid

  // Get user's team collection percentage
  const pct = await getTeamCollectionPercentage(userId, tx);

  // Check which bonuses have already been paid to this user
  const paidBonuses = await tx.transaction.findMany({
    where: {
      userId: userId,
      type: 'RANK_BONUS',
      status: 'COMPLETED'
    }
  });

  const checkAndPay = async (rankName, amount, details) => {
    // Check if already paid
    const isPaid = paidBonuses.some(b => {
      try {
        const d = JSON.parse(b.details || '{}');
        return d.rank === rankName && d.step === details.step;
      } catch (e) {
        return false;
      }
    });

    if (isPaid) return;

    // Add to wallet balance and totalEarned
    await tx.wallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        totalEarned: { increment: amount }
      }
    });

    // Create transaction log
    await tx.transaction.create({
      data: {
        userId,
        amount,
        type: 'RANK_BONUS',
        status: 'COMPLETED',
        paymentMethod: 'SYSTEM',
        details: JSON.stringify({
          rank: rankName,
          ...details
        })
      }
    });

    console.log(`Paid rank bonus of $${amount} to User ID ${userId} for rank ${rankName} step ${details.step}`);
  };

  // Evaluate each rank in RANK_ORDER up to the user's current rank index
  for (let i = 1; i <= rankIndex; i++) {
    const rankName = RANK_ORDER[i];

    if (rankName === 'STARTER_LEADER') {
      await checkAndPay('STARTER_LEADER', 100.00, { step: 1, desc: 'Starter Leader rank achievement bonus' });
    } else if (rankName === 'MANAGER_LEADER') {
      await checkAndPay('MANAGER_LEADER', 200.00, { step: 1, desc: 'Manager Leader rank achievement bonus' });
    } else if (rankName === 'SILVER_LEADER') {
      if (pct >= 25) {
        await checkAndPay('SILVER_LEADER', 200.00, { step: 1, desc: 'Silver Leader rank achievement bonus (25% team collection)' });
      }
      if (pct >= 40) {
        await checkAndPay('SILVER_LEADER', 200.00, { step: 2, desc: 'Silver Leader rank achievement bonus (40% team collection)' });
      }
    } else if (rankName === 'GOLD') {
      if (pct >= 25) {
        await checkAndPay('GOLD', 400.00, { step: 1, desc: 'Gold rank achievement bonus (25% team collection)' });
      }
      if (pct >= 40) {
        await checkAndPay('GOLD', 400.00, { step: 2, desc: 'Gold rank achievement bonus (40% team collection)' });
      }
    } else if (rankName === 'PLATINUM') {
      if (pct >= 25) {
        await checkAndPay('PLATINUM', 750.00, { step: 1, desc: 'Platinum rank achievement bonus (25% team collection)' });
      }
      if (pct >= 40) {
        await checkAndPay('PLATINUM', 750.00, { step: 2, desc: 'Platinum rank achievement bonus (40% team collection)' });
      }
    }
  }
}


/**
 * Checks and upgrades a single user's rank based on their downline stats.
 * @param {number} userId - The user ID to check.
 * @param {object} tx - The Prisma transaction client.
 */
export async function checkAndUpgradeRank(userId, tx = prisma) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    include: {
      referrals: {
        include: {
          userPackages: true
        }
      }
    }
  });

  if (!user || user.role === 'ADMIN') return;

  // Count direct referrals who are students (have at least one package)
  // Or check if the referral themselves purchased a package
  const directStudentsCount = user.referrals.filter(ref => ref.userPackages.length > 0).length;

  let newRank = 'DISTRIBUTOR';

  // Basic Ranks:
  // - Distributor: (default)
  // - Starter Leader: 2 direct students
  // - Manager Leader: 4 direct students
  // - Silver Leader: 6 direct students
  // - Gold: 9 direct students
  // - Platinum: 12 direct students
  if (directStudentsCount >= 12) {
    newRank = 'PLATINUM';
  } else if (directStudentsCount >= 9) {
    newRank = 'GOLD';
  } else if (directStudentsCount >= 6) {
    newRank = 'SILVER_LEADER';
  } else if (directStudentsCount >= 4) {
    newRank = 'MANAGER_LEADER';
  } else if (directStudentsCount >= 2) {
    newRank = 'STARTER_LEADER';
  } else {
    newRank = 'DISTRIBUTOR';
  }

  // VIP Ranks (Only if user has achieved Platinum and team conditions are met)
  if (newRank === 'PLATINUM' || user.rank === 'PLATINUM' || ['RUBY', 'EMERALD', 'DIAMOND', 'BLUE_DIAMOND', 'BLACK_DIAMOND', 'LEGEND'].includes(user.rank)) {
    // To check VIP Ranks, we need to count how many "Platinum" (or higher) users exist in separate legs
    // A leg is a subtree of a direct referral.
    // For each direct referral of the user, check if there is at least one Platinum (or higher) in their descendant subtree.
    const directReferrals = await tx.user.findMany({
      where: { sponsorId: userId }
    });

    let platinumLegsCount = 0;

    for (const ref of directReferrals) {
      // Find if this leg contains any Platinum or higher rank
      // Descendants of ref (depth >= 0 to include ref themselves)
      const legHasPlatinum = await tx.networkPath.findFirst({
        where: {
          ancestorId: ref.id,
          descendant: {
            rank: {
              in: ['PLATINUM', 'RUBY', 'EMERALD', 'DIAMOND', 'BLUE_DIAMOND', 'BLACK_DIAMOND', 'LEGEND']
            }
          }
        }
      });

      if (legHasPlatinum) {
        platinumLegsCount++;
      }
    }

    // VIP Ranks:
    // - Ruby: 2 Platinum legs
    // - Emerald: 4 Platinum legs
    // - Diamond: 6 Platinum legs
    // - Blue Diamond: 8 Platinum legs
    // - Black Diamond: 10 Platinum legs
    // - Legend: 14 Platinum legs
    if (platinumLegsCount >= 14) {
      newRank = 'LEGEND';
    } else if (platinumLegsCount >= 10) {
      newRank = 'BLACK_DIAMOND';
    } else if (platinumLegsCount >= 8) {
      newRank = 'BLUE_DIAMOND';
    } else if (platinumLegsCount >= 6) {
      newRank = 'DIAMOND';
    } else if (platinumLegsCount >= 4) {
      newRank = 'EMERALD';
    } else if (platinumLegsCount >= 2) {
      newRank = 'RUBY';
    } else {
      newRank = 'PLATINUM'; // Fallback if they were VIP but no longer meet criteria
    }
  }

  // Update user's rank if changed
  if (user.rank !== newRank) {
    await tx.user.update({
      where: { id: userId },
      data: { rank: newRank }
    });
    console.log(`User ID ${userId} rank updated from ${user.rank} to ${newRank}`);
  }
}

/**
 * Calculates a user's qualified progress towards a challenge based on the 40/60/80 leg rule.
 * @param {number} userId - The user ID to calculate progress for.
 * @param {number} targetSales - The target number of sales/points for the challenge.
 * @param {number} maxPercentage - The max percentage allowed from a single leg (40, 60, or 80).
 * @returns {object} { totalProgress, qualifiedProgress, qualifiedPercent, isQualified }
 */
export async function calculateChallengeProgress(userId, challenge) {
  const { targetSales, performanceLevel: maxPercentage, requiredDirects = 0, directsType = 'ANY', targetRevenue = 0 } = challenge;

  // 1. Get all direct referrals
  const directReferrals = await prisma.user.findMany({
    where: { sponsorId: userId }
  });

  // Calculate directs progress
  let matchingDirects = directReferrals;
  if (directsType === 'MARKETER') {
    matchingDirects = directReferrals.filter(u => u.role === 'MARKETER');
  } else if (directsType === 'STUDENT') {
    matchingDirects = directReferrals.filter(u => u.role === 'STUDENT');
  }
  const directsCount = matchingDirects.length;
  const directsQualified = requiredDirects === 0 || directsCount >= requiredDirects;

  const maxAllowedSalesFromOneLeg = (targetSales * maxPercentage) / 100;
  const maxAllowedRevenueFromOneLeg = (targetRevenue * maxPercentage) / 100;

  let totalSalesInTeam = 0;
  let qualifiedSalesCount = 0;
  let totalRevenueInTeam = 0;
  let qualifiedRevenueCount = 0;
  const legsProgress = [];

  // 2. For each direct referral, find sales & revenue in their entire downline
  for (const ref of directReferrals) {
    const legSales = await prisma.userPackage.count({
      where: {
        user: {
          ancestors: {
            some: {
              ancestorId: ref.id
            }
          }
        }
      }
    });

    const legRevenueAgg = await prisma.userPackage.aggregate({
      where: {
        user: {
          ancestors: {
            some: {
              ancestorId: ref.id
            }
          }
        }
      },
      _sum: { paidAmount: true }
    });
    const legRevenue = Number(legRevenueAgg._sum.paidAmount || 0);

    totalSalesInTeam += legSales;
    totalRevenueInTeam += legRevenue;

    const qualifiedSalesFromLeg = Math.min(legSales, maxAllowedSalesFromOneLeg);
    const qualifiedRevenueFromLeg = Math.min(legRevenue, maxAllowedRevenueFromOneLeg);

    qualifiedSalesCount += qualifiedSalesFromLeg;
    qualifiedRevenueCount += qualifiedRevenueFromLeg;

    legsProgress.push({
      refId: ref.id,
      refName: ref.name,
      totalSales: legSales,
      qualifiedSales: qualifiedSalesFromLeg,
      salesLimitExceeded: legSales > maxAllowedSalesFromOneLeg,
      totalRevenue: legRevenue,
      qualifiedRevenue: qualifiedRevenueFromLeg,
      revenueLimitExceeded: legRevenue > maxAllowedRevenueFromOneLeg
    });
  }

  // 3. Count user's own direct sales & revenue
  const ownSales = await prisma.userPackage.count({
    where: { userId: userId }
  });
  const ownRevenueAgg = await prisma.userPackage.aggregate({
    where: { userId: userId },
    _sum: { paidAmount: true }
  });
  const ownRevenue = Number(ownRevenueAgg._sum.paidAmount || 0);

  totalSalesInTeam += ownSales;
  totalRevenueInTeam += ownRevenue;

  qualifiedSalesCount += ownSales;
  qualifiedRevenueCount += ownRevenue;

  // Determine qualification status
  const isSalesQualified = targetSales === 0 || qualifiedSalesCount >= targetSales;
  const isRevenueQualified = targetRevenue === 0 || qualifiedRevenueCount >= targetRevenue;
  const isQualified = isSalesQualified && isRevenueQualified && directsQualified;

  const salesPercent = targetSales > 0 ? Math.min(Math.round((qualifiedSalesCount / targetSales) * 100), 100) : 100;
  const revenuePercent = targetRevenue > 0 ? Math.min(Math.round((qualifiedRevenueCount / targetRevenue) * 100), 100) : 100;
  const directsPercent = requiredDirects > 0 ? Math.min(Math.round((directsCount / requiredDirects) * 100), 100) : 100;

  const activePercents = [];
  if (targetSales > 0) activePercents.push(salesPercent);
  if (targetRevenue > 0) activePercents.push(revenuePercent);
  if (requiredDirects > 0) activePercents.push(directsPercent);
  const qualifiedPercent = activePercents.length > 0 ? Math.min(...activePercents) : 100;

  return {
    totalSales: totalSalesInTeam,
    qualifiedSales: qualifiedSalesCount,
    salesPercent,
    isSalesQualified,

    totalRevenue: totalRevenueInTeam,
    qualifiedRevenue: qualifiedRevenueCount,
    revenuePercent,
    isRevenueQualified,

    directsCount,
    requiredDirects,
    directsType,
    directsPercent,
    directsQualified,

    qualifiedPercent,
    isQualified,
    legs: legsProgress,
    ownSales,
    ownRevenue,
    maxAllowedSalesFromOneLeg,
    maxAllowedRevenueFromOneLeg
  };
}
