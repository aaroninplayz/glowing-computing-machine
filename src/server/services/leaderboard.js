import { db } from '../db/database.js';

export const LeaderboardService = {
  getLeaderboard({ category = 'xp', period = 'all_time', limit = 50, page = 1 } = {}) {
    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const normCategory = ['xp', 'badges', 'streak', 'contributions'].includes(category) ? category : 'xp';
    const normPeriod = ['all_time', 'monthly', 'weekly'].includes(period) ? period : 'all_time';

    let dateFilter = '';
    if (normPeriod === 'weekly') {
      dateFilter = ">= datetime('now', '-7 days')";
    } else if (normPeriod === 'monthly') {
      dateFilter = ">= datetime('now', '-30 days')";
    }

    let sql = '';
    const params = [];

    if (normCategory === 'xp') {
      if (normPeriod === 'all_time') {
        sql = `
          SELECT u.id, u.name, u.username, u.role, u.tag, u.xp, u.level, u.created_at,
                 u.xp as score
          FROM users u
          WHERE u.role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
          ORDER BY u.xp DESC, u.level DESC, u.name ASC
          LIMIT ? OFFSET ?
        `;
        params.push(parsedLimit, offset);
      } else {
        sql = `
          SELECT u.id, u.name, u.username, u.role, u.tag, u.level, u.xp as total_xp,
                 COALESCE(SUM(x.amount), 0) as score
          FROM users u
          LEFT JOIN xp_history x ON u.id = x.user_id AND x.amount > 0 AND x.created_at ${dateFilter}
          WHERE u.role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
          GROUP BY u.id
          ORDER BY score DESC, total_xp DESC, u.name ASC
          LIMIT ? OFFSET ?
        `;
        params.push(parsedLimit, offset);
      }
    } else if (normCategory === 'badges') {
      sql = `
        SELECT u.id, u.name, u.username, u.role, u.tag, u.xp, u.level,
               (
                 1
                 + (CASE WHEN u.level >= 5 THEN 1 ELSE 0 END)
                 + (CASE WHEN EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.user_id = u.id) THEN 1 ELSE 0 END)
                 + (CASE WHEN (SELECT COUNT(*) FROM tasks t WHERE t.assigned_user_id = u.id AND t.status IN ('COMPLETED', 'CLOSED')) >= 5 THEN 1 ELSE 0 END)
                 + (CASE WHEN (SELECT COUNT(*) FROM tasks t WHERE t.assigned_user_id = u.id AND t.task_type = 'CHALLENGE' AND t.status IN ('COMPLETED', 'CLOSED')) >= 1 THEN 1 ELSE 0 END)
               ) as score
        FROM users u
        WHERE u.role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
        ORDER BY score DESC, u.xp DESC, u.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(parsedLimit, offset);
    } else if (normCategory === 'streak') {
      sql = `
        SELECT u.id, u.name, u.username, u.role, u.tag, u.xp, u.level,
               COALESCE(COUNT(DISTINCT DATE(a.created_at)), 0) as score
        FROM users u
        LEFT JOIN activity_log a ON u.id = a.user_id ${dateFilter ? `AND a.created_at ${dateFilter}` : ''}
        WHERE u.role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
        GROUP BY u.id
        ORDER BY score DESC, u.xp DESC, u.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(parsedLimit, offset);
    } else if (normCategory === 'contributions') {
      sql = `
        SELECT u.id, u.name, u.username, u.role, u.tag, u.xp, u.level,
               COALESCE(COUNT(t.id), 0) as score
        FROM users u
        LEFT JOIN tasks t ON u.id = t.assigned_user_id AND t.status IN ('COMPLETED', 'CLOSED') ${dateFilter ? `AND t.created_at ${dateFilter}` : ''}
        WHERE u.role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
        GROUP BY u.id
        ORDER BY score DESC, u.xp DESC, u.name ASC
        LIMIT ? OFFSET ?
      `;
      params.push(parsedLimit, offset);
    }

    const rows = db.prepare(sql).all(...params);

    const rankings = rows.map((u, idx) => ({
      rank: offset + idx + 1,
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role === 'DEV_STEALTH' ? 'MEMBER' : u.role,
      tag: u.tag || 'Student',
      level: u.level || 1,
      total_xp: u.total_xp !== undefined ? u.total_xp : (u.xp || 0),
      score: Math.max(0, u.score || 0)
    }));

    return {
      category: normCategory,
      period: normPeriod,
      page: parsedPage,
      limit: parsedLimit,
      rankings
    };
  }
};
