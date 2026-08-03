// Enhanced Teams View Renderer (Glassmorphism Deep Obsidian Theme)
import { openModal, closeModal } from '../components/modal.js';
import { showConfirmDialog } from '../components/confirmDialog.js';
import {
  overridePoints,
  dissolveTeam,
  createTeam,
  generateRandomTeams,
  swapTeamMembers,
  toggleMemberLock,
  renameTeam,
  reassignTeamTask,
  fetchTeamHistory,
  fetchAllUsers,
  fetchTasks
} from '../services/api.js';

let cachedUsersList = [];
let cachedTasksList = [];

export function renderTeamsView(state) {
  const { teamsData, currentUser } = state;
  const userRole = currentUser ? (currentUser.public_role || currentUser.role) : 'member';
  const isLeaderOrTeacher = ['leader', 'teacher', 'admin', 'DEV_STEALTH', 'STUDENT_LEADER', 'TEACHER'].includes(currentUser ? currentUser.role : '') || ['leader', 'teacher', 'admin', 'STUDENT_LEADER', 'TEACHER'].includes(userRole);

  const totalTeams = teamsData.length;
  const totalMembers = teamsData.reduce((acc, t) => acc + (t.members ? t.members.length : 0), 0);
  const lockedCount = teamsData.reduce((acc, t) => acc + (t.members ? t.members.filter(m => Number(m.is_locked) === 1).length : 0), 0);

  return `
    <div class="space-y-8 max-w-6xl mx-auto">
      
      <!-- Top Header Banner -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-royal-slate-blue/20 text-royal-slate-blue border border-royal-slate-blue/40">
              Squad Management
            </span>
          </div>
          <h1 class="text-3xl font-black text-white uppercase tracking-tight mt-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-royal-slate-blue text-3xl">groups</span>
            Community Squads & Team Building
          </h1>
          <p class="text-xs text-outline mt-1 max-w-2xl">
            Cohort squads, captain controls, member locking, automated random team distribution, and member swapping.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold">
            ${totalTeams} Active Squads
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
            ${totalMembers} Assigned Members
          </span>
          ${lockedCount > 0 ? `
            <span class="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">lock</span> ${lockedCount} Locked
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Action Toolbar (for Admins / Teachers / Leaders) -->
      ${isLeaderOrTeacher ? `
        <div class="glass-card p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <button id="btnCreateTeam" class="px-3.5 py-2 bg-royal-slate-blue hover:bg-royal-slate-blue/80 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">group_add</span>
              Create Squad
            </button>

            <button id="btnGenerateRandom" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">shuffle</span>
              Random Team Generator
            </button>

            <button id="btnSwapMembers" class="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">swap_horiz</span>
              Swap Members
            </button>
          </div>

          <button id="btnTeamHistory" class="px-3 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm text-outline">history</span>
            Team History Log
          </button>
        </div>
      ` : ''}

      <!-- Teams Grid -->
      ${teamsData.length === 0 ? `
        <div class="glass-card p-12 rounded-2xl text-center space-y-3">
          <span class="material-symbols-outlined text-5xl text-outline">diversity_3</span>
          <h3 class="font-bold text-lg text-white">No Active Squads</h3>
          <p class="text-xs text-outline max-w-md mx-auto">
            All teams are currently dissolved. Student Leaders or Teachers can generate random squads or create manual teams above!
          </p>
        </div>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${teamsData.map(t => renderTeamCard(t, currentUser, isLeaderOrTeacher)).join('')}
        </div>
      `}

    </div>
  `;
}

function renderTeamCard(t, currentUser, isLeaderOrTeacher) {
  const currentUserId = currentUser ? currentUser.id : null;
  const isCaptain = currentUserId && t.captain_id === currentUserId;
  const canManage = isCaptain || isLeaderOrTeacher;

  return `
    <div class="glass-card p-6 rounded-2xl space-y-5 flex flex-col justify-between border border-white/10 hover:border-royal-slate-blue/30 transition-all">
      
      <!-- Card Header -->
      <div class="space-y-3">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <span class="material-symbols-outlined text-royal-slate-blue">shield</span>
                ${escapeHtml(t.name)}
              </h2>
              ${canManage ? `
                <button class="btn-rename-team p-1 text-outline hover:text-white transition-colors" data-id="${t.id}" data-name="${escapeHtml(t.name)}" title="Rename Squad">
                  <span class="material-symbols-outlined text-sm">edit</span>
                </button>
              ` : ''}
            </div>
            <p class="text-xs text-outline mt-0.5">
              Captain: <strong class="text-ice-blue">${escapeHtml(t.captain_name || 'Unassigned')}</strong>
            </p>
          </div>
          <span class="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/5 text-ice-blue border border-white/10">
            ${t.members?.length || 0} Members
          </span>
        </div>

        <!-- Task Assignment Banner -->
        <div class="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-outline flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="material-symbols-outlined text-sm text-royal-slate-blue flex-shrink-0">assignment</span>
            <span class="truncate">Objective: <strong class="text-white">${escapeHtml(t.task_title || 'Unassigned Objective')}</strong></span>
          </div>
          ${canManage ? `
            <button class="btn-reassign-task text-[11px] text-royal-slate-blue hover:underline font-bold flex-shrink-0" data-id="${t.id}" data-current-task="${t.task_id || ''}">
              Change
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Members Roster -->
      <div class="space-y-2">
        <div class="flex justify-between items-center text-xs text-outline font-medium px-1">
          <span>Roster Members & Lock State</span>
          <span>Point Share Weight</span>
        </div>

        <div class="space-y-2">
          ${t.members?.map(m => {
            const isLocked = Number(m.is_locked) === 1;

            return `
              <div class="flex justify-between items-center text-xs p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-all ${isLocked ? 'border-amber-500/20 bg-amber-500/5' : ''}">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm ${isLocked ? 'text-amber-400' : 'text-royal-slate-blue'}">
                    ${isLocked ? 'lock' : 'person'}
                  </span>
                  <span class="font-semibold text-white">${escapeHtml(m.name)}</span>
                  ${m.tag ? `<span class="text-[10px] text-outline">(${escapeHtml(m.tag)})</span>` : ''}
                  ${m.id === t.captain_id ? '<span class="text-[10px] bg-royal-slate-blue/30 text-royal-slate-blue px-1.5 py-0.2 rounded-full font-bold">CPT</span>' : ''}
                  ${isLocked ? '<span class="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold uppercase">Locked</span>' : ''}
                </div>

                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-royal-slate-blue/20 text-ice-blue border border-royal-slate-blue/30">
                    ${Math.round((m.custom_point_share || 1) * 100)}%
                  </span>

                  ${canManage ? `
                    <!-- Lock Toggle Button -->
                    <button class="btn-toggle-lock p-1 rounded-lg bg-white/5 hover:bg-white/15 text-outline hover:text-white transition-all ${isLocked ? 'text-amber-400 hover:text-amber-300' : ''}"
                      data-team="${t.id}" data-user="${m.id}" data-locked="${isLocked ? '1' : '0'}" title="${isLocked ? 'Unlock Member' : 'Lock Member'}">
                      <span class="material-symbols-outlined text-sm">${isLocked ? 'lock' : 'lock_open'}</span>
                    </button>

                    <!-- Point Share Edit Button -->
                    <button class="btn-edit-share px-2 py-1 bg-white/5 hover:bg-white/15 text-[11px] font-semibold text-outline hover:text-white rounded-lg border border-white/10 transition-all" data-team="${t.id}" data-user="${m.id}" data-current="${m.custom_point_share}">
                      Edit Share
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('') || ''}
        </div>
      </div>

      <!-- Card Footer Actions -->
      ${canManage ? `
        <div class="pt-3 border-t border-white/5 flex justify-end">
          <button class="btn-dissolve-team px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 font-semibold text-xs rounded-xl border border-red-500/30 transition-all flex items-center gap-1" data-id="${t.id}">
            <span class="material-symbols-outlined text-sm">remove_circle</span>
            Dissolve Squad
          </button>
        </div>
      ` : ''}

    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function attachTeamsEvents(state, refreshData) {
  const currentUserId = state.currentUser ? state.currentUser.id : null;

  // Create Team Modal Handler
  const createTeamBtn = document.getElementById('btnCreateTeam');
  if (createTeamBtn) {
    createTeamBtn.addEventListener('click', async () => {
      if (cachedUsersList.length === 0) {
        try {
          const res = await fetchAllUsers();
          cachedUsersList = res.users || res || [];
        } catch (_) {}
      }

      openModal({
        title: 'Create New Squad',
        contentHtml: `
          <div class="space-y-4 text-xs">
            <div>
              <label class="block font-bold text-white mb-1">Squad Name *</label>
              <input type="text" id="modalTeamName" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-royal-slate-blue focus:outline-none" placeholder="e.g. Cyber Security Unit" />
            </div>

            <div>
              <label class="block font-bold text-white mb-1">Select Squad Members (Multi-Select)</label>
              <select id="modalTeamMembers" multiple class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white h-36 focus:border-royal-slate-blue focus:outline-none">
                ${cachedUsersList.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (@${escapeHtml(u.username)})</option>`).join('')}
              </select>
              <p class="text-[10px] text-outline mt-1">Hold Ctrl/Cmd to select multiple members.</p>
            </div>
          </div>
        `,
        onConfirm: async (overlay) => {
          const name = overlay.querySelector('#modalTeamName').value.trim();
          if (!name) {
            alert('Squad name is required.');
            return false;
          }
          const select = overlay.querySelector('#modalTeamMembers');
          const selectedMemberIds = Array.from(select.selectedOptions).map(opt => opt.value);

          await createTeam({ name, member_ids: selectedMemberIds, created_by: currentUserId });
          refreshData();
          return true;
        }
      });
    });
  }

  // Random Team Generator Handler
  const btnGenerateRandom = document.getElementById('btnGenerateRandom');
  if (btnGenerateRandom) {
    btnGenerateRandom.addEventListener('click', () => {
      openRandomGeneratorModal(state, refreshData);
    });
  }

  // Swap Members Handler
  const btnSwapMembers = document.getElementById('btnSwapMembers');
  if (btnSwapMembers) {
    btnSwapMembers.addEventListener('click', () => {
      openSwapMembersModal(state, refreshData);
    });
  }

  // Team History Log Handler
  const btnTeamHistory = document.getElementById('btnTeamHistory');
  if (btnTeamHistory) {
    btnTeamHistory.addEventListener('click', () => {
      openTeamHistoryModal();
    });
  }

  // Toggle Member Lock Handler
  document.querySelectorAll('.btn-toggle-lock').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const teamId = e.currentTarget.getAttribute('data-team');
      const userId = e.currentTarget.getAttribute('data-user');
      const currentLocked = e.currentTarget.getAttribute('data-locked') === '1';

      try {
        await toggleMemberLock({ team_id: teamId, user_id: userId, is_locked: !currentLocked });
        refreshData();
      } catch (err) {
        console.error('Failed to toggle member lock:', err);
        alert(err.message || 'Failed to update lock state');
      }
    });
  });

  // Rename Squad Handler
  document.querySelectorAll('.btn-rename-team').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-id');
      const currentName = e.currentTarget.getAttribute('data-name');

      openModal({
        title: 'Rename Squad',
        contentHtml: `
          <div class="space-y-2 text-xs">
            <label class="block font-bold text-white mb-1">New Squad Name</label>
            <input type="text" id="modalRenameInput" value="${escapeHtml(currentName)}" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-royal-slate-blue focus:outline-none" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const newName = overlay.querySelector('#modalRenameInput').value.trim();
          if (!newName) return false;
          try {
            await renameTeam(teamId, newName);
            refreshData();
            return true;
          } catch (err) {
            alert(err.message || 'Failed to rename team');
            return false;
          }
        }
      });
    });
  });

  // Reassign Task Handler
  document.querySelectorAll('.btn-reassign-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const teamId = e.currentTarget.getAttribute('data-id');
      const currentTaskId = e.currentTarget.getAttribute('data-current-task');

      if (cachedTasksList.length === 0) {
        try {
          const res = await fetchTasks();
          cachedTasksList = Array.isArray(res) ? res : (res.official || res.teamTasks || []);
        } catch (_) {}
      }

      openModal({
        title: 'Reassign Squad Objective',
        contentHtml: `
          <div class="space-y-2 text-xs">
            <label class="block font-bold text-white mb-1">Select Task Objective</label>
            <select id="modalTaskSelect" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
              <option value="">-- None (Unassigned) --</option>
              ${cachedTasksList.map(tk => `
                <option value="${tk.id}" ${tk.id === currentTaskId ? 'selected' : ''}>
                  ${escapeHtml(tk.title)} (${tk.total_points || 50} PTS)
                </option>
              `).join('')}
            </select>
          </div>
        `,
        onConfirm: async (overlay) => {
          const taskId = overlay.querySelector('#modalTaskSelect').value || null;
          try {
            await reassignTeamTask(teamId, taskId);
            refreshData();
            return true;
          } catch (err) {
            alert(err.message || 'Failed to reassign task');
            return false;
          }
        }
      });
    });
  });

  // Point Redistribution Override Handler
  document.querySelectorAll('.btn-edit-share').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-team');
      const userId = e.currentTarget.getAttribute('data-user');
      const currentShare = parseFloat(e.currentTarget.getAttribute('data-current')) || 1.0;

      openModal({
        title: 'Adjust Member Point Weight Share',
        contentHtml: `
          <div class="space-y-3 text-xs">
            <p class="text-outline">Adjust individual point share multiplier based on contribution (1.0 = equal 100%, 1.5 = 150%, 0.5 = 50%).</p>
            <div>
              <label class="block font-bold text-white mb-1">Point Weight Share</label>
              <input type="number" step="0.1" min="0" max="3" id="modalShareWeight" value="${currentShare}"
                class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" />
            </div>
          </div>
        `,
        onConfirm: async (overlay) => {
          const val = parseFloat(overlay.querySelector('#modalShareWeight').value);
          if (isNaN(val) || val < 0) return false;
          await overridePoints(teamId, userId, val);
          refreshData();
          return true;
        }
      });
    });
  });

  // Dissolve Team Handler
  document.querySelectorAll('.btn-dissolve-team').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const teamId = e.currentTarget.getAttribute('data-id');
      const confirmed = await showConfirmDialog({
        title: 'Dissolve Squad?',
        message: 'Are you sure you want to dissolve this squad? All members will be returned to the unassigned cohort pool.',
        confirmText: 'Dissolve',
        danger: true
      });
      if (confirmed) {
        await dissolveTeam(teamId, 'MANUAL');
        refreshData();
      }
    });
  });
}

// Random Team Generator Modal
function openRandomGeneratorModal(state, refreshData) {
  openModal({
    title: 'Automated Random Team Generator',
    contentHtml: `
      <div class="space-y-4 text-xs">
        <p class="text-outline">
          Shuffles available un-locked members and distributes them evenly into new teams based on target size. Locked members remain in their current squads.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-white mb-1">Target Team Size *</label>
            <input type="number" id="genTeamSize" value="3" min="1" max="10"
              class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-royal-slate-blue focus:outline-none" />
          </div>

          <div>
            <label class="block font-bold text-white mb-1">Team Name Prefix</label>
            <input type="text" id="genTeamPrefix" value="Squad" placeholder="e.g. Delta Squad"
              class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-royal-slate-blue focus:outline-none" />
          </div>
        </div>
      </div>
    `,
    onConfirm: async (overlay) => {
      const teamSize = parseInt(overlay.querySelector('#genTeamSize').value) || 3;
      const prefix = overlay.querySelector('#genTeamPrefix').value.trim() || 'Squad';

      try {
        const res = await generateRandomTeams({ team_size: teamSize, prefix });
        if (res && res.success) {
          refreshData();
          return true;
        }
        alert(res.error || 'Failed to generate random teams');
        return false;
      } catch (err) {
        console.error('Error generating random teams:', err);
        alert(err.message || 'Failed to generate random teams');
        return false;
      }
    }
  });
}

// Member Swap Modal
function openSwapMembersModal(state, refreshData) {
  const teams = state.teamsData || [];

  // Build member lists per team
  const allMembersList = [];
  teams.forEach(t => {
    (t.members || []).forEach(m => {
      allMembersList.push({
        ...m,
        team_id: t.id,
        team_name: t.name
      });
    });
  });

  if (allMembersList.length < 2) {
    alert('Need at least 2 assigned members across teams to perform a swap.');
    return;
  }

  const memberOptionsHtml = allMembersList.map(m => {
    const isLocked = Number(m.is_locked) === 1;
    return `
      <option value="${m.id}" data-team="${m.team_id}" ${isLocked ? 'disabled class="text-gray-500"' : ''}>
        ${escapeHtml(m.name)} (${escapeHtml(m.team_name)}) ${isLocked ? '🔒 [LOCKED]' : ''}
      </option>
    `;
  }).join('');

  openModal({
    title: 'Swap Members Between Squads',
    contentHtml: `
      <div class="space-y-4 text-xs">
        <p class="text-outline">
          Swap two members between different squads. Locked members cannot be selected or swapped.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-white mb-1">First Member (Member A)</label>
            <select id="swapMember1" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
              <option value="">-- Select Member A --</option>
              ${memberOptionsHtml}
            </select>
          </div>

          <div>
            <label class="block font-bold text-white mb-1">Second Member (Member B)</label>
            <select id="swapMember2" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
              <option value="">-- Select Member B --</option>
              ${memberOptionsHtml}
            </select>
          </div>
        </div>
      </div>
    `,
    onConfirm: async (overlay) => {
      const select1 = overlay.querySelector('#swapMember1');
      const select2 = overlay.querySelector('#swapMember2');

      const user1_id = select1.value;
      const user2_id = select2.value;

      if (!user1_id || !user2_id) {
        alert('Please select both members to swap.');
        return false;
      }
      if (user1_id === user2_id) {
        alert('Cannot swap a member with themselves.');
        return false;
      }

      const team1_id = select1.options[select1.selectedIndex].getAttribute('data-team');
      const team2_id = select2.options[select2.selectedIndex].getAttribute('data-team');

      if (team1_id === team2_id) {
        alert('Please select members from two different squads.');
        return false;
      }

      try {
        await swapTeamMembers({ user1_id, user2_id, team1_id, team2_id });
        refreshData();
        return true;
      } catch (err) {
        console.error('Error swapping members:', err);
        alert(err.message || 'Failed to swap members');
        return false;
      }
    }
  });
}

// Team History Modal
async function openTeamHistoryModal() {
  let historyLogs = [];
  try {
    const res = await fetchTeamHistory();
    if (res && res.history) {
      historyLogs = res.history;
    }
  } catch (err) {
    console.error('Failed to fetch history:', err);
  }

  let historyHtml = '<p class="text-outline italic text-xs">No team history entries recorded yet.</p>';
  if (historyLogs.length > 0) {
    historyHtml = `
      <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
        ${historyLogs.map(h => `
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
            <div class="flex justify-between items-center text-white">
              <span class="font-bold text-royal-slate-blue">${escapeHtml(h.team_name)}</span>
              <span class="px-2 py-0.5 text-[10px] font-black rounded uppercase bg-white/10 text-white">${escapeHtml(h.action)}</span>
            </div>
            ${h.details ? `<p class="text-white/80 font-mono text-[11px]">${escapeHtml(JSON.stringify(h.details))}</p>` : ''}
            <span class="text-[10px] text-outline block text-right">${new Date(h.created_at).toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  openModal({
    title: 'Team History & Audit Trail',
    contentHtml: `
      <div class="space-y-3 text-xs">
        <p class="text-outline mb-2">Audit record of squad creation, dissolution, member swaps, locks, and automated team generation.</p>
        ${historyHtml}
      </div>
    `,
    onConfirm: async () => {
      closeModal();
      return true;
    }
  });
}
