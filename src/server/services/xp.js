import { db } from '../db/database.js';
import { XpModel } from '../models/Xp.js';
import { ActivityService } from './activity.js';

export const MAX_DAILY_AUTOMATED_XP = 5000;
export const ADMIN_OVERSIGHT_THRESHOLD = 10000;

export function calculateLevel(xp) {
  const points = Math.max(0, parseInt(xp, 10) || 0);
  return Math.max(1, Math.floor(Math.sqrt(points / 100)) + 1);
}

export function getXpProgress(xp) {
  const totalXp = Math.max(0, parseInt(xp, 10) || 0);
  const level = calculateLevel(totalXp);
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const xpInCurrentLevel = totalXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100)));

  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent
  };
}

export const XpService = {
  calculateLevel,
  getXpProgress,

  awardXP({ userId, amount, reason, sourceType = 'MANUAL', sourceId = null, awardedBy = null, isAutomated = false }) {
    if (!userId) {
      throw { status: 400, message: 'User ID is required' };
    }
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw { status: 400, message: 'Award amount must be a positive integer' };
    }

    const user = XpModel.getUserXp(userId);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    const automatedTypes = ['AUTOMATED', 'SYSTEM', 'AUTO', 'TASK_AUTO', 'REVIEW_AUTO'];
    const isAuto = isAutomated || automatedTypes.includes(String(sourceType).toUpperCase());

    if (isAuto) {
      const dailyEarned = XpModel.getDailyAutomatedXp(userId);
      if (dailyEarned + numAmount > MAX_DAILY_AUTOMATED_XP) {
        throw {
          status: 400,
          message: `Daily automated XP limit of ${MAX_DAILY_AUTOMATED_XP} exceeded. Currently earned: ${dailyEarned} XP.`
        };
      }
    }

    const isFlagged = numAmount >= ADMIN_OVERSIGHT_THRESHOLD;

    let result;
    const txn = db.transaction(() => {
      const entryId = `xp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      XpModel.createLedgerEntry({
        id: entryId,
        userId,
        amount: numAmount,
        reason,
        sourceType,
        sourceId,
        awardedBy
      });

      const currentXp = Math.max(0, parseInt(user.xp, 10) || 0);
      const newXp = currentXp + numAmount;
      const oldLevel = Math.max(1, parseInt(user.level, 10) || 1);
      const newLevel = calculateLevel(newXp);

      XpModel.updateUserXpAndLevel(userId, newXp, newLevel);

      ActivityService.logActivity({
        userId: awardedBy || userId,
        action: 'XP_AWARDED',
        entityType: 'user',
        entityId: userId,
        details: {
          amount: numAmount,
          reason,
          sourceType,
          sourceId,
          oldXp: currentXp,
          newXp,
          oldLevel,
          newLevel,
          levelUp: newLevel > oldLevel,
          flaggedForAdmin: isFlagged
        }
      });

      result = {
        userId,
        amount: numAmount,
        xp: newXp,
        level: newLevel,
        oldLevel,
        levelUp: newLevel > oldLevel,
        flaggedForAdmin: isFlagged,
        entryId
      };
    });

    txn();
    return result;
  },

  deductXP({ userId, amount, reason, sourceType = 'SPEND', sourceId = null, deductedBy = null }) {
    if (!userId) {
      throw { status: 400, message: 'User ID is required' };
    }
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw { status: 400, message: 'Deduct amount must be a positive integer' };
    }

    const user = XpModel.getUserXp(userId);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    const currentXp = Math.max(0, parseInt(user.xp, 10) || 0);
    if (currentXp < numAmount) {
      throw {
        status: 400,
        message: `Insufficient XP balance. Current: ${currentXp}, requested deduction: ${numAmount}`
      };
    }

    let result;
    const txn = db.transaction(() => {
      const entryId = `xp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      XpModel.createLedgerEntry({
        id: entryId,
        userId,
        amount: -numAmount,
        reason,
        sourceType,
        sourceId,
        awardedBy: deductedBy
      });

      const newXp = currentXp - numAmount;
      const oldLevel = Math.max(1, parseInt(user.level, 10) || 1);
      const newLevel = calculateLevel(newXp);

      XpModel.updateUserXpAndLevel(userId, newXp, newLevel);

      ActivityService.logActivity({
        userId: deductedBy || userId,
        action: 'XP_DEDUCTED',
        entityType: 'user',
        entityId: userId,
        details: {
          amount: numAmount,
          reason,
          sourceType,
          sourceId,
          oldXp: currentXp,
          newXp,
          oldLevel,
          newLevel
        }
      });

      result = {
        userId,
        amount: -numAmount,
        xp: newXp,
        level: newLevel,
        oldLevel,
        entryId
      };
    });

    txn();
    return result;
  },

  getUserXpHistory(userId, { page = 1, limit = 20 } = {}) {
    if (!userId) {
      throw { status: 400, message: 'User ID is required' };
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (parsedPage - 1) * parsedLimit;

    const user = XpModel.getUserXp(userId);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    const { history, total } = XpModel.getUserXpHistory(userId, { limit: parsedLimit, offset });
    const progress = getXpProgress(user.xp || 0);

    return {
      history,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1
      },
      summary: progress
    };
  }
};
