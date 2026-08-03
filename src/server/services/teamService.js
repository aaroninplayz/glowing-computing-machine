import { TeamModel } from '../models/Team.js';
import { sanitizeUser } from '../utils/sanitize.js';
import { ActivityService } from './activity.js';
import { db } from '../db/database.js';

export const TeamService = {
  getTeams() {
    const teams = TeamModel.getAllActive();
    return teams.map(team => ({
      ...team,
      members: team.members.map(sanitizeUser)
    }));
  },

  createTeam({ name, captain_id, member_ids, task_id, created_by }, currentUser) {
    if (!name) {
      throw { status: 400, message: 'Team name required' };
    }
    const teamId = `t_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    TeamModel.create({ id: teamId, name, captain_id, member_ids, task_id });

    const user = currentUser || (created_by ? { id: created_by, name: 'User' } : null);
    ActivityService.logTeamChange(user, 'TEAM_CREATE', { id: teamId, name });
    TeamModel.recordHistory({
      team_id: teamId,
      team_name: name,
      captain_id: captain_id || (member_ids && member_ids[0]) || null,
      action: 'CREATED',
      details: { created_by: user ? user.id : null, member_count: (member_ids || []).length }
    });
    return teamId;
  },

  generateRandomTeams({ team_size = 3, member_ids, prefix = 'Squad' }, currentUser) {
    const targetSize = Math.max(1, parseInt(team_size) || 3);
    let candidateIds = [];

    if (Array.isArray(member_ids) && member_ids.length > 0) {
      candidateIds = [...member_ids];
    } else {
      const users = db.prepare("SELECT id FROM users WHERE role != 'DEV_STEALTH'").all();
      candidateIds = users.map(u => u.id);
    }

    // Exclude members that are currently locked in any active team
    const availableMemberIds = candidateIds.filter(uid => !TeamModel.isMemberLocked(uid));

    if (availableMemberIds.length === 0) {
      throw { status: 400, message: 'No available unlocked members to distribute into teams' };
    }

    // Shuffle using Fisher-Yates algorithm
    const shuffled = [...availableMemberIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const total = shuffled.length;
    const numTeams = Math.max(1, Math.round(total / targetSize));
    const baseSize = Math.floor(total / numTeams);
    const remainder = total % numTeams;

    const createdTeamIds = [];
    let currentIndex = 0;

    for (let i = 0; i < numTeams; i++) {
      const currentTeamSize = baseSize + (i < remainder ? 1 : 0);
      const teamMembers = shuffled.slice(currentIndex, currentIndex + currentTeamSize);
      currentIndex += currentTeamSize;

      if (teamMembers.length === 0) continue;

      const teamId = `t_rand_${Date.now()}_${i + 1}`;
      const teamName = `${prefix} ${i + 1}`;
      const captainId = teamMembers[0];

      TeamModel.create({
        id: teamId,
        name: teamName,
        captain_id: captainId,
        member_ids: teamMembers
      });

      TeamModel.recordHistory({
        team_id: teamId,
        team_name: teamName,
        captain_id: captainId,
        action: 'RANDOM_GENERATED',
        details: { target_size: targetSize, actual_size: teamMembers.length, members: teamMembers }
      });

      createdTeamIds.push(teamId);
    }

    ActivityService.logTeamChange(currentUser, 'TEAM_GENERATE_RANDOM', {
      total_members: total,
      teams_created: createdTeamIds.length,
      target_size: targetSize
    });

    return {
      success: true,
      created_teams_count: createdTeamIds.length,
      total_members_distributed: total,
      team_ids: createdTeamIds
    };
  },

  swapMembers({ user1_id, user2_id, team1_id, team2_id }, currentUser) {
    if (!user1_id || !user2_id) {
      throw { status: 400, message: 'Both user1_id and user2_id are required for swap' };
    }

    // Resolve team1_id if missing
    let t1 = team1_id;
    if (!t1) {
      const row1 = db.prepare('SELECT team_id FROM team_memberships WHERE user_id = ?').get(user1_id);
      if (!row1) throw { status: 404, message: 'Member 1 has no active team membership' };
      t1 = row1.team_id;
    }

    // Resolve team2_id if missing
    let t2 = team2_id;
    if (!t2) {
      const row2 = db.prepare('SELECT team_id FROM team_memberships WHERE user_id = ?').get(user2_id);
      if (!row2) throw { status: 404, message: 'Member 2 has no active team membership' };
      t2 = row2.team_id;
    }

    if (t1 === t2) {
      throw { status: 400, message: 'Cannot swap members within the same team' };
    }

    // Check if either member is locked!
    if (TeamModel.isMemberLocked(user1_id, t1)) {
      throw { status: 400, message: `Cannot swap member: member ${user1_id} is locked in team` };
    }
    if (TeamModel.isMemberLocked(user2_id, t2)) {
      throw { status: 400, message: `Cannot swap member: member ${user2_id} is locked in team` };
    }

    TeamModel.swapMembers(user1_id, t1, user2_id, t2);

    const team1Obj = TeamModel.getById(t1);
    const team2Obj = TeamModel.getById(t2);

    TeamModel.recordHistory({
      team_id: t1,
      team_name: team1Obj ? team1Obj.name : t1,
      action: 'MEMBER_SWAPPED',
      details: { outgoing_user: user1_id, incoming_user: user2_id, target_team: t2 }
    });

    TeamModel.recordHistory({
      team_id: t2,
      team_name: team2Obj ? team2Obj.name : t2,
      action: 'MEMBER_SWAPPED',
      details: { outgoing_user: user2_id, incoming_user: user1_id, target_team: t1 }
    });

    ActivityService.logTeamChange(currentUser, 'TEAM_MEMBER_SWAP', { user1_id, team1_id: t1, user2_id, team2_id: t2 });
    return { success: true, message: 'Members swapped successfully' };
  },

  toggleMemberLock({ team_id, user_id, is_locked }, currentUser) {
    if (!team_id || !user_id) {
      throw { status: 400, message: 'team_id and user_id are required' };
    }

    const team = TeamModel.getById(team_id);
    if (!team) {
      throw { status: 404, message: 'Team not found' };
    }

    const isLockedBool = is_locked === true || is_locked === 1 || is_locked === '1' || is_locked === 'true';
    TeamModel.setMemberLock(team_id, user_id, isLockedBool);

    TeamModel.recordHistory({
      team_id,
      team_name: team.name,
      action: isLockedBool ? 'MEMBER_LOCKED' : 'MEMBER_UNLOCKED',
      details: { user_id, is_locked: isLockedBool ? 1 : 0 }
    });

    ActivityService.logTeamChange(currentUser, 'TEAM_MEMBER_LOCK', { team_id, user_id, is_locked: isLockedBool });
    return { success: true, is_locked: isLockedBool ? 1 : 0 };
  },

  renameTeam(teamId, name, currentUser) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw { status: 400, message: 'Valid team name required' };
    }
    const team = TeamModel.getById(teamId);
    if (!team) {
      throw { status: 404, message: 'Team not found' };
    }
    const newName = name.trim();
    TeamModel.updateName(teamId, newName);

    TeamModel.recordHistory({
      team_id: teamId,
      team_name: newName,
      action: 'RENAMED',
      details: { old_name: team.name, new_name: newName }
    });

    ActivityService.logTeamChange(currentUser, 'TEAM_RENAME', { id: teamId, old_name: team.name, new_name: newName });
    return { success: true, id: teamId, name: newName };
  },

  reassignTask(teamId, taskId, currentUser) {
    const team = TeamModel.getById(teamId);
    if (!team) {
      throw { status: 404, message: 'Team not found' };
    }
    TeamModel.updateTask(teamId, taskId);

    TeamModel.recordHistory({
      team_id: teamId,
      team_name: team.name,
      action: 'TASK_REASSIGNED',
      details: { old_task_id: team.task_id, new_task_id: taskId }
    });

    ActivityService.logTeamChange(currentUser, 'TEAM_TASK_REASSIGN', { id: teamId, task_id: taskId });
    return { success: true, id: teamId, task_id: taskId };
  },

  getTeamHistory(teamId = null) {
    return TeamModel.getHistory(teamId);
  },

  overridePoints(teamId, userId, customPointShare, currentUser) {
    if (!teamId || !userId || typeof customPointShare !== 'number' || !isFinite(customPointShare) || customPointShare < 0) {
      throw { status: 400, message: 'Team ID, User ID, and valid custom_point_share required' };
    }
    const team = TeamModel.getById(teamId);
    if (!team) {
      return;
    }

    TeamModel.updateCustomPointShare(teamId, userId, customPointShare);
    ActivityService.logTeamChange(currentUser, 'TEAM_OVERRIDE', { id: teamId, name: team.name });
  },

  dissolveTeam(teamId, reason = 'MANUAL', currentUser) {
    const team = TeamModel.getById(teamId);
    if (!team) {
      throw { status: 404, message: 'Team not found' };
    }
    TeamModel.dissolve(teamId, reason);
    TeamModel.recordHistory({
      team_id: teamId,
      team_name: team.name,
      action: 'DISSOLVED',
      details: { reason, dissolved_by: currentUser ? currentUser.id : null }
    });
    ActivityService.logTeamChange(currentUser, 'TEAM_DISSOLVE', { id: teamId, name: team.name, reason });
    return teamId;
  }
};
