// Leaderboard View Renderer & Component (FORGE Platform Theme)
import { fetchLeaderboard } from '../services/api.js';

export function renderLeaderboardView(state) {
  const currentCategory = state.leaderboardCategory || 'xp';
  const currentPeriod = state.leaderboardPeriod || 'all_time';

  return `
    <div id="leaderboardViewWrapper" class="space-y-8 max-w-6xl mx-auto font-sans text-slate-800" data-category="${escapeHtml(currentCategory)}" data-period="${escapeHtml(currentPeriod)}">
      
      <!-- Leaderboard Header Hero -->
      <div class="glass-card p-6 md:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/30">
              Community Rankings
            </span>
            <span class="text-xs text-slate-500">• Live Operative Standings</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Hall of Operatives Leaderboard
          </h1>
          <p class="text-xs md:text-sm text-slate-500 max-w-xl">
            Track top-performing operatives across experience, badge acquisitions, login streaks, and active mission contributions.
          </p>
        </div>

        <!-- Time Period Selector Buttons -->
        <div class="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
          <button class="btn-period-toggle px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPeriod === 'all_time' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}" data-period="all_time">
            All Time
          </button>
          <button class="btn-period-toggle px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPeriod === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}" data-period="monthly">
            Monthly
          </button>
          <button class="btn-period-toggle px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentPeriod === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}" data-period="weekly">
            Weekly
          </button>
        </div>
      </div>

      <!-- Category Navigation Tabs -->
      <div class="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button class="btn-category-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${currentCategory === 'xp' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="xp">
          <span class="material-symbols-outlined text-sm">stars</span>
          <span>XP Leaderboard</span>
        </button>
        <button class="btn-category-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${currentCategory === 'badges' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="badges">
          <span class="material-symbols-outlined text-sm">workspace_premium</span>
          <span>Badges & Honors</span>
        </button>
        <button class="btn-category-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${currentCategory === 'streak' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="streak">
          <span class="material-symbols-outlined text-sm">local_fire_department</span>
          <span>Activity Streak</span>
        </button>
        <button class="btn-category-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${currentCategory === 'contributions' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="contributions">
          <span class="material-symbols-outlined text-sm">assignment_turned_in</span>
          <span>Mission Contributions</span>
        </button>
      </div>

      <!-- Leaderboard Content Container -->
      <div id="leaderboardContentArea" class="space-y-8">
        <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
          Computing rankings...
        </div>
      </div>

    </div>
  `;
}

export async function attachLeaderboardEvents(state, refreshData) {
  const wrapper = document.getElementById('leaderboardViewWrapper');
  if (!wrapper) return;

  let currentCategory = wrapper.getAttribute('data-category') || 'xp';
  let currentPeriod = wrapper.getAttribute('data-period') || 'all_time';

  const loadData = async () => {
    const contentArea = document.getElementById('leaderboardContentArea');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
        Computing rankings...
      </div>
    `;

    try {
      const res = await fetchLeaderboard(currentCategory, currentPeriod);
      const rankings = (res && res.data && res.data.rankings) || [];

      if (rankings.length === 0) {
        contentArea.innerHTML = `
          <div class="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl">
            No operatives recorded for this category and time period yet.
          </div>
        `;
        return;
      }

      const top3 = rankings.slice(0, 3);
      const rest = rankings.slice(3);

      const metricLabels = {
        xp: 'XP',
        badges: 'Badges',
        streak: 'Days Streak',
        contributions: 'Tasks Done'
      };
      const label = metricLabels[currentCategory] || 'Points';

      // 1st, 2nd, 3rd podium order: [2nd, 1st, 3rd]
      const first = top3[0] || null;
      const second = top3[1] || null;
      const third = top3[2] || null;

      contentArea.innerHTML = `
        <!-- Top 3 Podium Component -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 pb-2">
          
          <!-- 2nd Place (Silver) -->
          ${second ? `
            <div class="bg-white border-2 border-slate-300 rounded-2xl p-6 text-center shadow-md relative order-2 md:order-1 hover:-translate-y-1 transition-all cursor-pointer btn-view-profile" data-user-id="${second.id}">
              <div class="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-sm flex items-center justify-center border-2 border-white shadow">
                2
              </div>
              <div class="w-16 h-16 mx-auto rounded-full bg-slate-200 text-slate-700 font-black text-2xl flex items-center justify-center border-2 border-slate-300 mb-3">
                ${escapeHtml(second.name.charAt(0))}
              </div>
              <h3 class="font-extrabold text-slate-900 text-base line-clamp-1">${escapeHtml(second.name)}</h3>
              <span class="text-xs text-slate-400 font-medium block">Level ${second.level} • @${escapeHtml(second.username)}</span>
              <div class="mt-4 pt-3 border-t border-slate-100">
                <span class="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                  ${second.score.toLocaleString()} ${label}
                </span>
              </div>
            </div>
          ` : '<div class="hidden md:block"></div>'}

          <!-- 1st Place (Gold Hero) -->
          ${first ? `
            <div class="bg-gradient-to-b from-amber-50 to-white border-2 border-amber-400 rounded-2xl p-7 text-center shadow-lg relative order-1 md:order-2 hover:-translate-y-1 transition-all cursor-pointer ring-4 ring-amber-400/20 btn-view-profile" data-user-id="${first.id}">
              <div class="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center border-2 border-white shadow-lg">
                👑
              </div>
              <div class="w-20 h-20 mx-auto rounded-full bg-amber-200 text-amber-900 font-black text-3xl flex items-center justify-center border-2 border-amber-400 mb-3 shadow-inner">
                ${escapeHtml(first.name.charAt(0))}
              </div>
              <h3 class="font-black text-slate-900 text-lg line-clamp-1">${escapeHtml(first.name)}</h3>
              <span class="text-xs text-slate-500 font-bold block">Level ${first.level} • @${escapeHtml(first.username)}</span>
              <div class="mt-4 pt-3 border-t border-amber-200/60">
                <span class="px-4 py-1.5 rounded-full text-sm font-black bg-amber-400 text-slate-950 shadow-sm">
                  ${first.score.toLocaleString()} ${label}
                </span>
              </div>
            </div>
          ` : '<div class="hidden md:block"></div>'}

          <!-- 3rd Place (Bronze) -->
          ${third ? `
            <div class="bg-white border-2 border-amber-700/40 rounded-2xl p-6 text-center shadow-md relative order-3 hover:-translate-y-1 transition-all cursor-pointer btn-view-profile" data-user-id="${third.id}">
              <div class="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center border-2 border-white shadow">
                3
              </div>
              <div class="w-16 h-16 mx-auto rounded-full bg-amber-100 text-amber-800 font-black text-2xl flex items-center justify-center border-2 border-amber-700/40 mb-3">
                ${escapeHtml(third.name.charAt(0))}
              </div>
              <h3 class="font-extrabold text-slate-900 text-base line-clamp-1">${escapeHtml(third.name)}</h3>
              <span class="text-xs text-slate-400 font-medium block">Level ${third.level} • @${escapeHtml(third.username)}</span>
              <div class="mt-4 pt-3 border-t border-slate-100">
                <span class="px-3 py-1 rounded-full text-xs font-black bg-amber-900/10 text-amber-800 border border-amber-900/20">
                  ${third.score.toLocaleString()} ${label}
                </span>
              </div>
            </div>
          ` : '<div class="hidden md:block"></div>'}

        </div>

        <!-- Ranks 4+ List Table -->
        ${rest.length === 0 ? '' : `
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Extended Rankings</h3>
            <div class="divide-y divide-slate-100">
              ${rest.map(u => `
                <div class="py-3 px-2 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between gap-4 cursor-pointer btn-view-profile" data-user-id="${u.id}">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      #${u.rank}
                    </div>
                    <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center uppercase">
                      ${escapeHtml(u.name.charAt(0))}
                    </div>
                    <div>
                      <span class="font-bold text-sm text-slate-900 block">${escapeHtml(u.name)}</span>
                      <span class="text-[11px] text-slate-400">Level ${u.level} • @${escapeHtml(u.username)}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="font-extrabold text-sm text-slate-900">${u.score.toLocaleString()} ${label}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `}
      `;

      // Attach profile navigation clicks
      contentArea.querySelectorAll('.btn-view-profile').forEach(el => {
        el.addEventListener('click', (e) => {
          const uid = e.currentTarget.getAttribute('data-user-id');
          if (uid) {
            state.profileUserId = uid;
            document.dispatchEvent(new CustomEvent('forge:navigate', { detail: { tab: 'profile' } }));
          }
        });
      });

    } catch (err) {
      console.error('Error loading leaderboard rankings:', err);
      contentArea.innerHTML = `
        <div class="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          Failed to load leaderboard rankings.
        </div>
      `;
    }
  };

  // Category Tab Click Handlers
  wrapper.querySelectorAll('.btn-category-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.currentTarget.getAttribute('data-category');
      if (cat) {
        currentCategory = cat;
        state.leaderboardCategory = cat;
        wrapper.querySelectorAll('.btn-category-tab').forEach(b => {
          b.classList.remove('border-royal-slate-blue', 'text-royal-slate-blue');
          b.classList.add('border-transparent', 'text-slate-500');
        });
        e.currentTarget.classList.remove('border-transparent', 'text-slate-500');
        e.currentTarget.classList.add('border-royal-slate-blue', 'text-royal-slate-blue');
        loadData();
      }
    });
  });

  // Period Toggle Handlers
  wrapper.querySelectorAll('.btn-period-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const p = e.currentTarget.getAttribute('data-period');
      if (p) {
        currentPeriod = p;
        state.leaderboardPeriod = p;
        wrapper.querySelectorAll('.btn-period-toggle').forEach(b => {
          b.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
          b.classList.add('text-slate-500');
        });
        e.currentTarget.classList.remove('text-slate-500');
        e.currentTarget.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        loadData();
      }
    });
  });

  // Load initial data
  loadData();
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
