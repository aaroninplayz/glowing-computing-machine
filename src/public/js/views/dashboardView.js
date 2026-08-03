// Dashboard View Renderer (FORGE Platform Theme - Stitch MCP Blueprint)
import { openAnnouncementDetailModal } from './announcementsView.js';
import { markAnnouncementAsRead } from '../services/api.js';
import { createXPProgressBar } from '../components/xpProgressBar.js';

export function renderDashboard(state) {
  const { currentUser, dashboardData = {} } = state;

  const user = (dashboardData && dashboardData.user) || currentUser || {};
  const xpSummary = (dashboardData && dashboardData.xpSummary) || {
    totalXp: user.xp || 0,
    level: user.level || 1,
    currentLevelXp: 0,
    nextLevelXp: 100,
    xpInCurrentLevel: user.xp || 0,
    progressPercent: 0
  };

  const activeTasks = (dashboardData && dashboardData.activeTasks) || [];
  const announcements = (dashboardData && dashboardData.announcements) || [];
  const notifications = (dashboardData && dashboardData.notifications) || [];
  const teamStatus = (dashboardData && dashboardData.teamStatus) || null;
  const leaderboard = (dashboardData && dashboardData.leaderboard) || [];
  const upcomingDeadlines = (dashboardData && dashboardData.upcomingDeadlines) || [];

  const isPrivileged = ['admin', 'teacher', 'leader', 'DEV_STEALTH', 'STUDENT_LEADER', 'TEACHER'].includes(user.role);

  // Unread announcements / notifications count
  const unreadAnnouncementsCount = announcements.filter(a => !a.is_read).length;

  return `
    <div class="space-y-8 max-w-6xl mx-auto font-sans text-slate-800">
      
      <!-- Top Summary Header (Sage White Canvas & Glass Panel) -->
      <div class="glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden border border-slate-200/80 bg-white/90 shadow-sm transition-all hover:border-royal-slate-blue/40">
        <div class="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div class="space-y-3 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-royal-slate-blue/10 text-royal-slate-blue border border-royal-slate-blue/30">
                FORGE Platform
              </span>
              <span class="text-xs text-slate-500">• Live Ecosystem Session</span>
              ${unreadAnnouncementsCount > 0 ? `
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30">
                  📢 ${unreadAnnouncementsCount} New Broadcasts
                </span>
              ` : ''}
            </div>
            <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, <span class="text-royal-slate-blue">${escapeHtml(user.name || 'Operative')}</span>
            </h1>
            <p class="text-xs md:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Your centralized command hub for active missions, squad status, system announcements, and XP progression.
            </p>
          </div>

          <!-- XP Level & Total Counter Badge -->
          <div class="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-inner">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm">
                  Lvl ${xpSummary.level}
                </span>
                <span class="text-sm font-bold text-slate-800">${xpSummary.totalXp.toLocaleString()} XP Total</span>
              </div>
              <span class="text-xs text-slate-500 font-semibold">${xpSummary.progressPercent}% to Lvl ${xpSummary.level + 1}</span>
            </div>
            <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style="width: ${xpSummary.progressPercent}%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Role-Aware Quick Actions Panel -->
      <div class="bg-white/80 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div class="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span class="material-symbols-outlined text-sm text-royal-slate-blue">bolt</span>
          Role Quick Actions (${isPrivileged ? 'Lead / Admin' : 'Student Member'})
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${isPrivileged ? `
            <button class="nav-drawer-item px-3.5 py-2 rounded-lg bg-royal-slate-blue hover:bg-royal-slate-blue/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5" data-tab="tasks" data-action="create-task">
              <span class="material-symbols-outlined text-sm">add_task</span>
              <span>Create Task</span>
            </button>
            <button class="nav-drawer-item px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5" data-tab="announcements">
              <span class="material-symbols-outlined text-sm">campaign</span>
              <span>Broadcast Notice</span>
            </button>
            <button class="nav-drawer-item px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5" data-tab="teams">
              <span class="material-symbols-outlined text-sm">groups</span>
              <span>Manage Squads</span>
            </button>
          ` : `
            <button class="nav-drawer-item px-3.5 py-2 rounded-lg bg-royal-slate-blue hover:bg-royal-slate-blue/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5" data-tab="tasks">
              <span class="material-symbols-outlined text-sm">task_alt</span>
              <span>My Tasks</span>
            </button>
            <button class="nav-drawer-item px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5" data-tab="challenges">
              <span class="material-symbols-outlined text-sm">explore</span>
              <span>Browse Challenges</span>
            </button>
            <button class="nav-drawer-item px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5" data-tab="settings">
              <span class="material-symbols-outlined text-sm">history</span>
              <span>XP History</span>
            </button>
          `}
        </div>
      </div>

      <!-- Main Content Grid (Active Tasks, Team Status, Notifications & Leaderboard) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column: Active Tasks & Team Status (2 Cols) -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Active & Assigned Tasks Widget -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-royal-slate-blue">assignment</span>
                Active & Assigned Tasks
              </h2>
              <button class="nav-drawer-item text-xs text-royal-slate-blue font-bold hover:underline" data-tab="tasks">
                View All →
              </button>
            </div>

            ${activeTasks.length === 0 ? `
              <div class="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No active tasks assigned to you or your squad at present.
              </div>
            ` : `
              <div class="space-y-3">
                ${activeTasks.slice(0, 4).map(t => {
                  const isChallenge = t.task_type === 'CHALLENGE';
                  const statusColors = {
                    OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
                    PENDING_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
                    COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200'
                  };
                  const badgeClass = statusColors[t.status] || 'bg-slate-100 text-slate-600 border-slate-200';
                  const points = t.xp_reward || t.total_points || 50;

                  return `
                    <div class="p-4 rounded-xl border border-slate-200 hover:border-royal-slate-blue/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2">
                          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badgeClass}">
                            ${t.status || 'OPEN'}
                          </span>
                          <span class="text-xs font-semibold text-slate-500">${isChallenge ? 'Challenge' : 'Squad Task'}</span>
                        </div>
                        <h3 class="font-bold text-sm text-slate-900 hover:text-royal-slate-blue transition-colors">
                          ${escapeHtml(t.title)}
                        </h3>
                        <p class="text-xs text-slate-500 line-clamp-1">${escapeHtml(t.description || '')}</p>
                      </div>
                      <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span class="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 font-extrabold text-xs border border-amber-500/20">
                          +${points} XP
                        </span>
                        <button class="nav-drawer-item px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700" data-tab="${isChallenge ? 'challenges' : 'tasks'}">
                          Details
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- Team Status Panel -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-emerald-600">groups</span>
                Squad Team Status
              </h2>
              <button class="nav-drawer-item text-xs text-emerald-600 font-bold hover:underline" data-tab="teams">
                Squad Hub →
              </button>
            </div>

            ${!teamStatus ? `
              <div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                You are currently unassigned to a squad team.
              </div>
            ` : `
              <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                  <div>
                    <h3 class="text-base font-extrabold text-slate-900">${escapeHtml(teamStatus.name)}</h3>
                    <span class="text-xs text-slate-500">Captain: <strong class="text-slate-800">${escapeHtml(teamStatus.captainName)}</strong></span>
                  </div>
                  <div class="text-right">
                    <span class="text-xs uppercase text-slate-500 block font-semibold">Squad Total XP</span>
                    <span class="text-lg font-black text-emerald-700">${teamStatus.totalPoints.toLocaleString()} XP</span>
                  </div>
                </div>

                <div>
                  <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Active Roster (${teamStatus.memberCount} members)</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${teamStatus.members.map(m => `
                      <div class="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 uppercase">
                            ${m.name.charAt(0)}
                          </div>
                          <span class="font-bold text-slate-800">${escapeHtml(m.name)}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-medium">${escapeHtml(m.role || 'Member')}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `}
          </div>

        </div>

        <!-- Right Column: Notifications Feed & Community Leaderboard (1 Col) -->
        <div class="space-y-6">

          <!-- Recent Announcements & Notifications Feed -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-500">campaign</span>
                Announcements & Feed
              </h2>
              <button class="nav-drawer-item text-xs text-amber-600 font-bold hover:underline" data-tab="announcements">
                All Broadcasts →
              </button>
            </div>

            ${announcements.length === 0 ? `
              <p class="text-xs text-slate-500 text-center py-4">No recent announcements.</p>
            ` : `
              <div class="space-y-3">
                ${announcements.map(a => {
                  const isUrgent = (a.priority || '').toLowerCase() === 'urgent';

                  return `
                    <div class="p-3.5 rounded-xl border ${isUrgent ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200 bg-slate-50/50'} space-y-1.5 transition-all hover:border-slate-300">
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="font-bold text-xs ${isUrgent ? 'text-rose-700' : 'text-slate-900'} line-clamp-1">${escapeHtml(a.title)}</span>
                        <span class="text-[10px] text-slate-400">${new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <p class="text-xs text-slate-600 line-clamp-2">${escapeHtml(a.content)}</p>
                      <div class="pt-1 flex justify-end">
                        <button class="btn-dashboard-announcement text-xs text-royal-slate-blue hover:underline font-bold" data-id="${a.id}">
                          Read Details →
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- Community Leaderboard Preview (Top 5) -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-500">emoji_events</span>
                Top 5 Leaderboard
              </h2>
              <button class="nav-drawer-item text-xs text-amber-600 font-bold hover:underline" data-tab="halloffame">
                Full Rankings →
              </button>
            </div>

            ${leaderboard.length === 0 ? `
              <p class="text-xs text-slate-500 text-center py-4">No rankings available.</p>
            ` : `
              <div class="space-y-2.5">
                ${leaderboard.map(item => `
                  <div class="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${item.rank === 1 ? 'bg-amber-400 text-slate-900' : item.rank === 2 ? 'bg-slate-300 text-slate-900' : item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'}">
                        #${item.rank}
                      </div>
                      <div>
                        <span class="font-bold text-xs text-slate-900 block">${escapeHtml(item.name)}</span>
                        <span class="text-[10px] text-slate-400">Level ${item.level} • @${escapeHtml(item.username)}</span>
                      </div>
                    </div>
                    <span class="font-extrabold text-xs text-amber-600">${item.xp.toLocaleString()} XP</span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

      </div>

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

export function attachDashboardEvents(state, refreshData) {
  // Attach Dashboard Announcement view handlers
  document.querySelectorAll('.btn-dashboard-announcement').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      try {
        await markAnnouncementAsRead(id);
        const announcements = state.announcementsData || [];
        const target = announcements.find(a => a.id === id);
        if (target) {
          target.is_read = true;
          openAnnouncementDetailModal(target, refreshData);
        }
        refreshData();
      } catch (err) {
        console.error('Error opening dashboard announcement:', err);
      }
    });
  });
}
