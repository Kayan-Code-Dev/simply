import cron from 'node-cron';
import prisma from '../prisma.js';

const MONTHLY_SUBSCRIPTION_FEE = 10.00;

export const startSubscriptionCronJob = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running hourly subscription deduction check...');
    try {
      const now = new Date();

      // Find all marketers whose grace period has ended or is ending right now
      // and they are not exempt from the subscription fee
      const expiredMarketers = await prisma.user.findMany({
        where: {
          role: 'MARKETER',
          isExempt: false,
          gracePeriodEndsAt: {
            lte: now
          }
        },
        include: {
          wallet: true
        }
      });

      if (expiredMarketers.length === 0) {
        console.log('[CRON] No users require subscription deduction at this time.');
        return;
      }

      console.log(`[CRON] Found ${expiredMarketers.length} user(s) whose subscription needs renewal.`);

      for (const user of expiredMarketers) {
        if (!user.wallet) continue; // Safety check

        // Check if wallet has enough balance for the deduction
        if (Number(user.wallet.balance) >= MONTHLY_SUBSCRIPTION_FEE) {
          try {
            await prisma.$transaction(async (tx) => {
              // 1. Deduct from wallet
              await tx.wallet.update({
                where: { userId: user.id },
                data: {
                  balance: { decrement: MONTHLY_SUBSCRIPTION_FEE }
                }
              });

              // 2. Record transaction
              await tx.transaction.create({
                data: {
                  userId: user.id,
                  amount: MONTHLY_SUBSCRIPTION_FEE,
                  type: 'ACTIVATION_FEE', // Using the existing logic type
                  status: 'COMPLETED',
                  paymentMethod: 'WALLET_DEDUCTION',
                  details: JSON.stringify({ description: 'Automated Monthly Subscription Deduction' })
                }
              });

              // 3. Extend the grace period by 30 days
              const newGracePeriod = new Date();
              newGracePeriod.setDate(newGracePeriod.getDate() + 30);

              await tx.user.update({
                where: { id: user.id },
                data: {
                  gracePeriodEndsAt: newGracePeriod
                }
              });
            });

            console.log(`[CRON] Successfully deducted $${MONTHLY_SUBSCRIPTION_FEE} from user ${user.id} (${user.username}). Grace period extended.`);
          } catch (txErr) {
            console.error(`[CRON] Transaction failed for user ${user.id}:`, txErr);
          }
        } else {
          // Insufficient funds
          console.log(`[CRON] User ${user.id} (${user.username}) has insufficient funds for subscription renewal (Balance: $${user.wallet.balance}).`);
          // The gracePeriodEndsAt remains in the past, so they remain inactive.
        }
      }
    } catch (err) {
      console.error('[CRON] Error during subscription deduction check:', err);
    }
  });

  console.log('[CRON] Hourly subscription deduction job scheduled.');
};
