import schedule from 'node-schedule';
import { redisClient } from '../config/db';
import logger from '../utils/logger';
import config from '../config';

// Import necessary services
import * as seasonService from '../services/seasonService';
import * as marketplaceService from '../services/marketplaceService';
import * as rewardService from '../services/rewardService';
import * as securityService from '../services/securityService';
import * as analyticsService from '../services/analyticsService';

// Lock name constants
const LOCKS = {
  DAILY_REWARDS: 'scheduler:lock:daily-rewards',
  SEASON_UPDATE: 'scheduler:lock:season-update',
  MARKETPLACE_CLEANUP: 'scheduler:lock:marketplace-cleanup',
  ANALYTICS_ROLLUP: 'scheduler:lock:analytics-rollup',
  SECURITY_SCAN: 'scheduler:lock:security-scan',
};

// Lock duration in seconds (default: 10 minutes)
const LOCK_DURATION = 600;

/**
 * Acquire a distributed lock to prevent multiple instances running the same job
 * @param lockName The name of the lock
 * @param duration Lock duration in seconds
 */
async function acquireLock(lockName: string, duration: number = LOCK_DURATION): Promise<boolean> {
  try {
    // Use Redis SETNX for atomic lock acquisition
    const result = await redisClient.set(lockName, Date.now().toString(), {
      NX: true, // Only set if key doesn't exist
      EX: duration // Expiration in seconds
    });
    
    return result === 'OK';
  } catch (error) {
    logger.error(`Failed to acquire lock ${lockName}:`, error);
    return false;
  }
}

/**
 * Release a distributed lock
 * @param lockName The name of the lock
 */
async function releaseLock(lockName: string): Promise<void> {
  try {
    await redisClient.del(lockName);
  } catch (error) {
    logger.error(`Failed to release lock ${lockName}:`, error);
  }
}

/**
 * Run a scheduled job with distributed locking
 * @param lockName The name of the lock
 * @param jobFn The job function to execute
 */
async function runWithLock(lockName: string, jobFn: () => Promise<void>): Promise<void> {
  const lockAcquired = await acquireLock(lockName);
  
  if (!lockAcquired) {
    logger.info(`Skipping job, lock ${lockName} already acquired by another instance`);
    return;
  }
  
  try {
    logger.info(`Running scheduled job with lock: ${lockName}`);
    await jobFn();
    logger.info(`Completed scheduled job with lock: ${lockName}`);
  } catch (error) {
    logger.error(`Error in scheduled job with lock ${lockName}:`, error);
  } finally {
    await releaseLock(lockName);
  }
}

// Daily rewards distribution job (runs daily at 00:00 UTC)
const scheduleDailyRewards = () => {
  schedule.scheduleJob('0 0 * * *', async () => {
    await runWithLock(LOCKS.DAILY_REWARDS, async () => {
      logger.info('Running daily rewards distribution job');
      await rewardService.distributeDailyRewards();
      logger.info('Daily rewards distribution completed');
    });
  });
};

// Season update job (runs daily at 00:15 UTC)
const scheduleSeasonUpdates = () => {
  schedule.scheduleJob('15 0 * * *', async () => {
    await runWithLock(LOCKS.SEASON_UPDATE, async () => {
      logger.info('Running season update check job');
      await seasonService.checkAndUpdateSeason();
      logger.info('Season update check completed');
    });
  });
};

// Marketplace cleanup job (runs daily at 00:30 UTC)
const scheduleMarketplaceCleanup = () => {
  schedule.scheduleJob('30 0 * * *', async () => {
    await runWithLock(LOCKS.MARKETPLACE_CLEANUP, async () => {
      logger.info('Running marketplace cleanup job');
      await marketplaceService.cleanupExpiredListings();
      await marketplaceService.settleCompletedAuctions();
      logger.info('Marketplace cleanup completed');
    });
  });
};

// Analytics data rollup job (runs daily at 01:00 UTC)
const scheduleAnalyticsRollup = () => {
  schedule.scheduleJob('0 1 * * *', async () => {
    await runWithLock(LOCKS.ANALYTICS_ROLLUP, async () => {
      logger.info('Running analytics data rollup job');
      await analyticsService.rollupDailyData();
      logger.info('Analytics data rollup completed');
    });
  });
};

// Security scan job (runs daily at 02:00 UTC)
const scheduleSecurityScan = () => {
  schedule.scheduleJob('0 2 * * *', async () => {
    await runWithLock(LOCKS.SECURITY_SCAN, async () => {
      logger.info('Running security scan job');
      await securityService.scanForSuspiciousActivity();
      logger.info('Security scan completed');
    });
  });
};

// Hourly active users count (runs every hour at :05)
const scheduleActiveUsersCount = () => {
  schedule.scheduleJob('5 * * * *', async () => {
    logger.info('Recording hourly active users count');
    await analyticsService.recordActiveUsersCount();
  });
};

// Market price update (runs every 15 minutes)
const scheduleMarketPriceUpdate = () => {
  schedule.scheduleJob('*/15 * * * *', async () => {
    logger.info('Updating market prices');
    await marketplaceService.updateMarketPrices();
  });
};

// Token price update (runs every hour at :10)
const scheduleTokenPriceUpdate = () => {
  schedule.scheduleJob('10 * * * *', async () => {
    logger.info('Updating token prices');
    await marketplaceService.updateTokenPrices();
  });
};

// Weekly analytics report (runs every Monday at 09:00 UTC)
const scheduleWeeklyAnalyticsReport = () => {
  schedule.scheduleJob('0 9 * * 1', async () => {
    logger.info('Generating weekly analytics report');
    await analyticsService.generateWeeklyReport();
  });
};

// Monthly rewards summary (runs on the 1st of each month at 06:00 UTC)
const scheduleMonthlyRewardsSummary = () => {
  schedule.scheduleJob('0 6 1 * *', async () => {
    logger.info('Generating monthly rewards summary');
    await rewardService.generateMonthlySummary();
  });
};

/**
 * Initialize all scheduled jobs
 */
export const initScheduler = () => {
  if (config.env === 'test') {
    logger.info('Skipping scheduler initialization in test environment');
    return;
  }

  logger.info('Initializing scheduler...');
  
  // Daily jobs
  scheduleDailyRewards();
  scheduleSeasonUpdates();
  scheduleMarketplaceCleanup();
  scheduleAnalyticsRollup();
  scheduleSecurityScan();
  
  // Hourly jobs
  scheduleActiveUsersCount();
  scheduleTokenPriceUpdate();
  
  // More frequent jobs
  scheduleMarketPriceUpdate();
  
  // Weekly jobs
  scheduleWeeklyAnalyticsReport();
  
  // Monthly jobs
  scheduleMonthlyRewardsSummary();
  
  logger.info('Scheduler initialized successfully');
};

export default {
  initScheduler
};
