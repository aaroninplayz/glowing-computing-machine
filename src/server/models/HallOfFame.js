import { db } from '../db/database.js';

export const HallOfFameModel = {
  // Season Management Database Methods
  getSeasons() {
    return db.prepare(`SELECT * FROM seasons ORDER BY start_date DESC`).all();
  },

  getCurrentSeason() {
    const current = db.prepare(`SELECT * FROM seasons WHERE is_current = 1 LIMIT 1`).get();
    if (current) return current;
    return db.prepare(`SELECT * FROM seasons ORDER BY created_at ASC LIMIT 1`).get() || null;
  },

  getSeasonById(id) {
    if (!id) return null;
    return db.prepare(`SELECT * FROM seasons WHERE id = ?`).get(id);
  },

  createSeason({ id, name, start_date, end_date, status = 'ACTIVE', is_current = 0 }) {
    const seasonId = id || `season_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    if (is_current) {
      db.prepare(`UPDATE seasons SET is_current = 0`).run();
    }

    db.prepare(`
      INSERT INTO seasons (id, name, start_date, end_date, status, is_current)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(seasonId, name, start_date, end_date || null, status, is_current ? 1 : 0);

    return this.getSeasonById(seasonId);
  },

  updateSeason(id, { name, start_date, end_date, status, is_current }) {
    const season = this.getSeasonById(id);
    if (!season) return null;

    if (is_current) {
      db.prepare(`UPDATE seasons SET is_current = 0`).run();
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (is_current !== undefined) { updates.push('is_current = ?'); params.push(is_current ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE seasons SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    return this.getSeasonById(id);
  },

  setCurrentSeason(id) {
    db.prepare(`UPDATE seasons SET is_current = 0`).run();
    db.prepare(`UPDATE seasons SET is_current = 1, status = 'ACTIVE' WHERE id = ?`).run(id);
    return this.getSeasonById(id);
  },

  // Hall of Fame Leaderboard Aggregation
  getLeaderboard({ seasonId } = {}) {
    const season = seasonId ? this.getSeasonById(seasonId) : this.getCurrentSeason();
    
    let dateFilter = '';
    const dateParams = [];
    if (season && season.start_date) {
      if (season.end_date) {
        dateFilter = 'AND x.created_at BETWEEN ? AND ?';
        dateParams.push(season.start_date, season.end_date);
      } else {
        dateFilter = 'AND x.created_at >= ?';
        dateParams.push(season.start_date);
      }
    }

    const users = db.prepare(`
      SELECT id, name, username, email, phone, role, tag, xp, level
      FROM users 
      WHERE role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
    `).all();

    const leaderboard = users.map(user => {
      let seasonXp = user.xp || 0;
      if (dateFilter) {
        const xpRow = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as period_xp
          FROM xp_history x
          WHERE x.user_id = ? AND x.amount > 0 ${dateFilter}
        `).get(user.id, ...dateParams);
        seasonXp = xpRow ? xpRow.period_xp : 0;
      }

      const publicRole = user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role;
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        tag: user.tag || 'Student',
        role: publicRole,
        public_role: publicRole,
        level: user.level || 1,
        total_xp: user.xp || 0,
        points: seasonXp
      };
    });

    return leaderboard.sort((a, b) => b.points - a.points);
  },

  // Explicit alias function for backward compatibility and direct route calls
  getHallOfFameLeaderboard(seasonId) {
    return this.getLeaderboard({ seasonId });
  },

  // All-Time Bests Aggregation
  getAllTimeBests() {
    const topXpUser = db.prepare(`
      SELECT id, name, username, role, tag, xp, level
      FROM users
      WHERE role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
      ORDER BY xp DESC, level DESC LIMIT 1
    `).get() || null;

    const mostBadgesUser = db.prepare(`
      SELECT u.id, u.name, u.username, u.role, u.tag, u.xp, u.level,
             COUNT(ub.badge_id) as badge_count
      FROM users u
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      WHERE u.role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
      GROUP BY u.id
      ORDER BY badge_count DESC, u.xp DESC LIMIT 1
    `).get() || null;

    const longestStreakUser = db.prepare(`
      SELECT u.id, u.name, u.username, u.role, u.tag, u.xp, u.level,
             COUNT(DISTINCT DATE(a.created_at)) as streak_days
      FROM users u
      LEFT JOIN activity_log a ON u.id = a.user_id
      WHERE u.role NOT IN ('admin', 'teacher', 'DEV_STEALTH')
      GROUP BY u.id
      ORDER BY streak_days DESC, u.xp DESC LIMIT 1
    `).get() || null;

    const seasonWinners = db.prepare(`
      SELECT h.*, u.name as winner_name, u.username as winner_username, s.name as season_name
      FROM hall_of_fame_titles h
      LEFT JOIN users u ON h.awarded_to_user_id = u.id
      LEFT JOIN seasons s ON h.season_id = s.id
      ORDER BY h.awarded_at DESC LIMIT 5
    `).all();

    return {
      topXp: topXpUser,
      mostBadges: mostBadgesUser,
      longestStreak: longestStreakUser,
      seasonWinners
    };
  },

  getTitles({ seasonId } = {}) {
    let sql = `
      SELECT h.*, u.name as user_name, u.username as user_username, tm.name as team_name, s.name as season_name
      FROM hall_of_fame_titles h 
      LEFT JOIN users u ON h.awarded_to_user_id = u.id 
      LEFT JOIN teams tm ON h.awarded_to_team_id = tm.id
      LEFT JOIN seasons s ON h.season_id = s.id
    `;
    const params = [];
    if (seasonId) {
      sql += ` WHERE h.season_id = ? OR h.season = ?`;
      params.push(seasonId, seasonId);
    }
    sql += ` ORDER BY h.awarded_at DESC`;
    return db.prepare(sql).all(...params);
  },

  awardTitle({ id, title_name, category, awarded_to_user_id, awarded_to_team_id, season, season_id }) {
    const titleId = id || `hof_${Date.now()}`;
    const activeSeason = season_id ? this.getSeasonById(season_id) : this.getCurrentSeason();
    const seasonName = season || (activeSeason ? activeSeason.name : 'Season 1');
    const seasonIdRef = season_id || (activeSeason ? activeSeason.id : 'season_1');

    db.prepare(`
      INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id, awarded_to_team_id, season, season_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(titleId, title_name, category || 'Academics', awarded_to_user_id || null, awarded_to_team_id || null, seasonName, seasonIdRef);

    return titleId;
  }
};
