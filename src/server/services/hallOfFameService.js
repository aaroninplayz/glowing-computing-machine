import { HallOfFameModel } from '../models/HallOfFame.js';

export const HallOfFameService = {
  getHallOfFameData(seasonId) {
    const seasons = HallOfFameModel.getSeasons();
    const currentSeason = HallOfFameModel.getCurrentSeason();
    const selectedSeason = seasonId ? HallOfFameModel.getSeasonById(seasonId) : currentSeason;

    const leaderboard = HallOfFameModel.getLeaderboard({ seasonId: selectedSeason ? selectedSeason.id : null });
    const titles = HallOfFameModel.getTitles({ seasonId: selectedSeason ? selectedSeason.id : null });
    const allTimeBests = HallOfFameModel.getAllTimeBests();

    // Grand Champions Monument visual plaques
    const grandChampions = [
      { title: 'Grand Champion', user: leaderboard[0] || null, rarity: 'Legendary' },
      { title: 'Coding Vanguard', user: leaderboard[1] || null, rarity: 'Epic' },
      { title: 'Master Architect', user: leaderboard[2] || null, rarity: 'Rare' },
      { title: 'Community Pillar', user: allTimeBests.topXp || null, rarity: 'Legendary' }
    ];

    return {
      seasons,
      currentSeason,
      selectedSeason,
      allTime: leaderboard,
      season1: leaderboard,
      leaderboard,
      allTimeBests,
      grandChampions,
      titles
    };
  },

  getHallOfFameLeaderboard(seasonId) {
    return HallOfFameModel.getHallOfFameLeaderboard(seasonId);
  },

  getSeasons() {
    return HallOfFameModel.getSeasons();
  },

  createSeason({ name, start_date, end_date, status, is_current }, currentUser) {
    if (!name || !name.trim()) {
      throw { status: 400, message: 'Season name is required' };
    }
    if (!start_date) {
      throw { status: 400, message: 'Season start date is required' };
    }

    return HallOfFameModel.createSeason({
      name: name.trim(),
      start_date,
      end_date: end_date || null,
      status: status || 'ACTIVE',
      is_current: !!is_current
    });
  },

  updateSeason(id, fields, currentUser) {
    const existing = HallOfFameModel.getSeasonById(id);
    if (!existing) {
      throw { status: 404, message: 'Season not found' };
    }

    return HallOfFameModel.updateSeason(id, fields);
  },

  switchSeason(seasonId, currentUser) {
    const existing = HallOfFameModel.getSeasonById(seasonId);
    if (!existing) {
      throw { status: 404, message: 'Season not found' };
    }

    return HallOfFameModel.setCurrentSeason(seasonId);
  },

  awardTitle({ title_name, category, awarded_to_user_id, awarded_to_team_id, season, season_id }) {
    if (!title_name || !title_name.trim()) {
      throw { status: 400, message: 'Title name is required' };
    }
    const titleId = `hof_${Date.now()}`;
    HallOfFameModel.awardTitle({
      id: titleId,
      title_name: title_name.trim(),
      category: category || 'Academics',
      awarded_to_user_id,
      awarded_to_team_id,
      season,
      season_id
    });
    return titleId;
  }
};
