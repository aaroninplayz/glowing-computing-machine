// Public User Profile View Component (FORGE Platform Theme - Stitch MCP Blueprint)
import { fetchUserProfile } from '../services/api.js';

export function renderProfileView(state, targetUserId = null) {
  const currentUser = state.currentUser || {};
  const profileId = targetUserId || state.profileUserId || currentUser.id;

  return `
    <div id="profileViewContainer" class="space-y-8 max-w-6xl mx-auto font-sans text-slate-800" data-user-id="${escapeHtml(profileId)}">
      <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
        Loading Operative Profile...
      </div>
    </div>
  `;
}

export async function attachProfileEvents(state, refreshData) {
  const container = document.getElementById('profileViewContainer');
  if (!container) return;

  const profileId = container.getAttribute('data-user-id') || (state.currentUser && state.currentUser.id);
  if (!profileId) return;

  try {
    const res = await fetchUserProfile(profileId);
    if (!res || !res.profile) {
      container.innerHTML = `
        <div class="p-12 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl">
          Operative profile not found.
        </div>
      `;
      return;
    }

    const { user, xpSummary, stats, teamStatus, badges, activityFeed } = res.profile;
    const isSelf = state.currentUser && state.currentUser.id === user.id;

    container.innerHTML = `
      <!-- Profile Header Hero -->
      <div class="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm space-y-6">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <!-- Large Avatar -->
            <div class="relative">
              <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-royal-slate-blue to-indigo-700 text-white font-black text-3xl md:text-4xl flex items-center justify-center shadow-md uppercase border-2 border-white">
                ${escapeHtml((user.name || 'U').charAt(0))}
              </div>
              <span class="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" title="Active Operative"></span>
            </div>

            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  ${escapeHtml(user.name)}
                </h1>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-royal-slate-blue/10 text-royal-slate-blue border border-royal-slate-blue/30 uppercase">
                  ${escapeHtml(user.public_role || user.role || 'Member')}
                </span>
                <span class="text-xs text-slate-400 font-medium">@${escapeHtml(user.username)}</span>
              </div>
              
              <p class="text-xs md:text-sm text-slate-600 max-w-xl leading-relaxed">
                ${escapeHtml(user.bio || 'No public biography provided yet.')}
              </p>

              <!-- External Links -->
              <div class="flex flex-wrap items-center gap-3 pt-1 text-xs font-bold text-slate-500">
                ${user.github_url ? `
                  <a href="${escapeHtml(user.github_url)}" target="_blank" rel="noopener noreferrer" class="hover:text-royal-slate-blue flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">code</span> GitHub
                  </a>
                ` : ''}
                ${user.portfolio_url ? `
                  <a href="${escapeHtml(user.portfolio_url)}" target="_blank" rel="noopener noreferrer" class="hover:text-royal-slate-blue flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">language</span> Portfolio
                  </a>
                ` : ''}
                <span class="text-slate-400">• Joined ${new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 w-full md:w-auto justify-end">
            ${isSelf ? `
              <button class="nav-drawer-item px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5" data-tab="settings">
                <span class="material-symbols-outlined text-sm">edit</span> Edit Profile
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Statistics Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <span class="material-symbols-outlined text-2xl">military_tech</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 font-bold uppercase block">Level & XP</span>
            <span class="text-base font-black text-slate-900">Lvl ${xpSummary.level} • ${xpSummary.totalXp.toLocaleString()} XP</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <span class="material-symbols-outlined text-2xl">task_alt</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 font-bold uppercase block">Completed Tasks</span>
            <span class="text-xl font-black text-slate-900">${stats.completedTasksCount}</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <span class="material-symbols-outlined text-2xl">emoji_events</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 font-bold uppercase block">Challenge Wins</span>
            <span class="text-xl font-black text-slate-900">${stats.challengeWinsCount}</span>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <span class="material-symbols-outlined text-2xl">leaderboard</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 font-bold uppercase block">Community Rank</span>
            <span class="text-xl font-black text-slate-900">#${stats.communityRank}</span>
          </div>
        </div>
      </div>

      <!-- Main Content Grid (Badge Showcase & Activity Timeline) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column: Badge Showcase Grid (2 Cols) -->
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-500">verified</span>
                Badge & Achievement Showcase
              </h2>
              <span class="text-xs text-slate-400 font-semibold">${badges.filter(b => b.unlocked).length}/${badges.length} Unlocked</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              ${badges.map(b => {
                const rarityColors = {
                  Legendary: 'bg-amber-100 text-amber-800 border-amber-300',
                  Rare: 'bg-purple-100 text-purple-800 border-purple-300',
                  Common: 'bg-slate-100 text-slate-700 border-slate-300'
                };
                const rarityStyle = rarityColors[b.rarity] || rarityColors.Common;

                return `
                  <div class="p-4 rounded-xl border ${b.unlocked ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/50 opacity-60'} flex items-start gap-3">
                    <div class="w-10 h-10 rounded-xl ${b.unlocked ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-200 text-slate-400'} flex items-center justify-center flex-shrink-0 font-bold">
                      <span class="material-symbols-outlined text-xl">${b.unlocked ? 'workspace_premium' : 'lock'}</span>
                    </div>
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-sm text-slate-900">${escapeHtml(b.title)}</span>
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${rarityStyle}">
                          ${b.rarity}
                        </span>
                      </div>
                      <p class="text-xs text-slate-500">${escapeHtml(b.description)}</p>
                      ${b.unlocked ? `<span class="text-[10px] text-slate-400 block pt-1">Earned ${new Date(b.earned_at || Date.now()).toLocaleDateString()}</span>` : `<span class="text-[10px] text-slate-400 block pt-1">Locked</span>`}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Squad Team Context -->
          ${teamStatus ? `
            <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
              <h3 class="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span class="material-symbols-outlined text-emerald-600 text-base">groups</span>
                Active Squad Team
              </h3>
              <div class="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-200/60 rounded-xl">
                <div>
                  <h4 class="text-base font-extrabold text-slate-900">${escapeHtml(teamStatus.name)}</h4>
                  <span class="text-xs text-slate-500">${teamStatus.memberCount} Squad Members</span>
                </div>
                <button class="nav-drawer-item px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold" data-tab="teams">
                  View Squad
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Right Column: Activity & Contribution Timeline (1 Col) -->
        <div class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="material-symbols-outlined text-royal-slate-blue">history</span>
                Activity Timeline
              </h2>
            </div>

            ${activityFeed.length === 0 ? `
              <div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No contribution or XP activity recorded yet.
              </div>
            ` : `
              <div class="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                ${activityFeed.map(item => `
                  <div class="relative space-y-1">
                    <div class="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-royal-slate-blue border-2 border-white"></div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-bold text-slate-900 line-clamp-1">${escapeHtml(item.title)}</span>
                      <span class="text-[10px] text-slate-400">${new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p class="text-xs text-slate-500 line-clamp-2">${escapeHtml(item.description)}</p>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

      </div>
    </div>
  `;

  // Attach navigation drawer events inside container
  container.querySelectorAll('.nav-drawer-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      if (tab) {
        document.dispatchEvent(new CustomEvent('forge:navigate', { detail: { tab } }));
      }
    });
  });
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
