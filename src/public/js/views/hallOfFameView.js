// Comprehensive Hall of Fame View Component (FORGE Platform Theme - Stitch MCP Blueprint)
import { openModal } from '../components/modal.js';
import { awardTitle, fetchHallOfFame, createSeason } from '../services/api.js';

export function renderHallOfFameView(state) {
  const { hallOfFameData = {}, currentUser } = state;
  const seasons = hallOfFameData.seasons || [];
  const selectedSeason = hallOfFameData.selectedSeason || null;
  const currentSeasonId = selectedSeason ? selectedSeason.id : '';

  const isPrivileged = currentUser && ['admin', 'teacher', 'DEV_STEALTH', 'TEACHER'].includes(currentUser.role);
  const isAdmin = currentUser && ['admin', 'DEV_STEALTH'].includes(currentUser.role);

  return `
    <div id="hallOfFameWrapper" class="space-y-8 max-w-6xl mx-auto font-sans text-slate-800" data-season-id="${escapeHtml(currentSeasonId)}">
      
      <!-- Header Banner & Season Controls -->
      <div class="glass-card p-6 md:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/30">
              Monument of Honor
            </span>
            <span class="text-xs text-slate-500">• Competitive Ecosystem Archive</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            The Hall of Fame
          </h1>
          <p class="text-xs md:text-sm text-slate-500 max-w-xl">
            Honoring academic excellence, coding vanguards, master architects, and historical season champions.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <!-- Season Selector Dropdown -->
          <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span class="material-symbols-outlined text-sm text-slate-500">military_tech</span>
            <select id="seasonSelector" class="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer">
              <option value="" ${!currentSeasonId ? 'selected' : ''}>All-Time Legends</option>
              ${seasons.map(s => `
                <option value="${s.id}" ${currentSeasonId === s.id ? 'selected' : ''}>
                  ${escapeHtml(s.name)} ${s.is_current ? '(Current Active)' : ''}
                </option>
              `).join('')}
            </select>
          </div>

          ${isPrivileged ? `
            <button id="btnAwardTitle" class="px-4 py-2 rounded-xl bg-royal-slate-blue hover:bg-royal-slate-blue/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">workspace_premium</span>
              <span>Award Title</span>
            </button>
          ` : ''}

          ${isAdmin ? `
            <button id="btnCreateSeason" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">add</span>
              <span>New Season</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Main Content Container -->
      <div id="hofDynamicContent" class="space-y-8">
        <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
          Loading Hall of Fame Monuments...
        </div>
      </div>

    </div>
  `;
}

export async function attachHallOfFameEvents(state, refreshData) {
  const wrapper = document.getElementById('hallOfFameWrapper');
  if (!wrapper) return;

  let currentSeasonId = wrapper.getAttribute('data-season-id') || '';

  const loadHofData = async () => {
    const contentArea = document.getElementById('hofDynamicContent');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
        Loading Hall of Fame Monuments...
      </div>
    `;

    try {
      const data = await fetchHallOfFame(currentSeasonId);
      const leaderboard = (data && data.leaderboard) || [];
      const allTimeBests = (data && data.allTimeBests) || {};
      const grandChampions = (data && data.grandChampions) || [];
      const titles = (data && data.titles) || [];

      contentArea.innerHTML = `
        <!-- Grand Champions Monument Showcase -->
        <div class="space-y-4">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-amber-500">emoji_events</span>
            Grand Champions Monument
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${grandChampions.map((gc, idx) => {
              const u = gc.user;
              const borders = ['border-amber-400 bg-amber-50/30', 'border-slate-300 bg-slate-50/50', 'border-amber-700/40 bg-amber-900/5', 'border-indigo-300 bg-indigo-50/30'];
              const borderClass = borders[idx % borders.length];

              return `
                <div class="p-5 rounded-2xl border-2 ${borderClass} shadow-sm text-center relative flex flex-col justify-between space-y-3 transition-all hover:-translate-y-1 ${u ? 'cursor-pointer btn-view-profile' : ''}" data-user-id="${u ? u.id : ''}">
                  <div class="space-y-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white inline-block">
                      ${escapeHtml(gc.title)}
                    </span>

                    <div class="w-16 h-16 mx-auto rounded-full bg-slate-200 text-slate-800 font-black text-2xl flex items-center justify-center border-2 border-white shadow mt-2">
                      ${u ? escapeHtml((u.name || 'U').charAt(0)) : '?'}
                    </div>

                    <h3 class="font-black text-slate-900 text-base line-clamp-1">
                      ${u ? escapeHtml(u.name) : 'Unclaimed'}
                    </h3>
                    <span class="text-xs text-slate-500 font-medium block">
                      ${u ? `Level ${u.level || 1} • @${escapeHtml(u.username)}` : 'Awaiting Champion'}
                    </span>
                  </div>

                  <div class="pt-3 border-t border-slate-200/60">
                    <span class="text-xs font-extrabold text-amber-700">
                      ${u ? `${(u.points !== undefined ? u.points : u.xp || 0).toLocaleString()} XP` : '0 XP'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- All-Time Bests Grid (4 Columns) -->
        <div class="space-y-4">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-royal-slate-blue">stars</span>
            All-Time Platform Legends
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Top XP -->
            <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Top XP Earner</span>
              ${allTimeBests.topXp ? `
                <div class="flex items-center gap-3 cursor-pointer btn-view-profile" data-user-id="${allTimeBests.topXp.id}">
                  <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-sm">
                    ${escapeHtml(allTimeBests.topXp.name.charAt(0))}
                  </div>
                  <div>
                    <h4 class="font-bold text-sm text-slate-900 line-clamp-1">${escapeHtml(allTimeBests.topXp.name)}</h4>
                    <span class="text-xs font-black text-amber-600">${allTimeBests.topXp.xp.toLocaleString()} XP</span>
                  </div>
                </div>
              ` : '<span class="text-xs text-slate-400">None recorded</span>'}
            </div>

            <!-- Most Badges -->
            <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Most Badges Unlocked</span>
              ${allTimeBests.mostBadges ? `
                <div class="flex items-center gap-3 cursor-pointer btn-view-profile" data-user-id="${allTimeBests.mostBadges.id}">
                  <div class="w-10 h-10 rounded-full bg-purple-100 text-purple-800 font-black flex items-center justify-center text-sm">
                    ${escapeHtml(allTimeBests.mostBadges.name.charAt(0))}
                  </div>
                  <div>
                    <h4 class="font-bold text-sm text-slate-900 line-clamp-1">${escapeHtml(allTimeBests.mostBadges.name)}</h4>
                    <span class="text-xs font-black text-purple-600">${allTimeBests.mostBadges.badge_count || 1} Badges</span>
                  </div>
                </div>
              ` : '<span class="text-xs text-slate-400">None recorded</span>'}
            </div>

            <!-- Longest Streak -->
            <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Longest Activity Streak</span>
              ${allTimeBests.longestStreak ? `
                <div class="flex items-center gap-3 cursor-pointer btn-view-profile" data-user-id="${allTimeBests.longestStreak.id}">
                  <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                    ${escapeHtml(allTimeBests.longestStreak.name.charAt(0))}
                  </div>
                  <div>
                    <h4 class="font-bold text-sm text-slate-900 line-clamp-1">${escapeHtml(allTimeBests.longestStreak.name)}</h4>
                    <span class="text-xs font-black text-emerald-600">${allTimeBests.longestStreak.streak_days || 1} Days Active</span>
                  </div>
                </div>
              ` : '<span class="text-xs text-slate-400">None recorded</span>'}
            </div>

            <!-- Season Winners Count -->
            <div class="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Honors Awarded</span>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-sm">
                  <span class="material-symbols-outlined text-lg">workspace_premium</span>
                </div>
                <div>
                  <h4 class="font-bold text-sm text-slate-900">${titles.length} Titles</h4>
                  <span class="text-xs font-bold text-indigo-600">Across ${data.seasons ? data.seasons.length : 1} Seasons</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Awarded Titles & Historical Honors Table -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div class="flex justify-between items-center pb-2 border-b border-slate-100">
            <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-amber-500">workspace_premium</span>
              Awarded Titles & Honors
            </h2>
            <span class="text-xs text-slate-400 font-semibold">${titles.length} Recorded</span>
          </div>

          ${titles.length === 0 ? `
            <div class="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              No titles awarded yet for this competitive period.
            </div>
          ` : `
            <div class="space-y-3">
              ${titles.map(t => `
                <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-700 border border-amber-500/30">
                        ${escapeHtml(t.category || 'Academics')}
                      </span>
                      <span class="text-xs text-slate-400 font-medium">${escapeHtml(t.season_name || t.season || 'Season 1')}</span>
                    </div>
                    <h3 class="font-extrabold text-sm text-slate-900">${escapeHtml(t.title_name)}</h3>
                    <span class="text-xs text-slate-600 block">
                      Awarded to: <strong class="text-slate-900">${escapeHtml(t.user_name || t.team_name || 'Cohort')}</strong>
                    </span>
                  </div>
                  <span class="text-[11px] text-slate-400 font-medium">
                    ${new Date(t.awarded_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;

      // Profile click listener
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
      console.error('Error loading Hall of Fame data:', err);
      contentArea.innerHTML = `
        <div class="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          Failed to load Hall of Fame monuments.
        </div>
      `;
    }
  };

  // Season Selector Handler
  const selector = document.getElementById('seasonSelector');
  if (selector) {
    selector.addEventListener('change', (e) => {
      currentSeasonId = e.target.value;
      wrapper.setAttribute('data-season-id', currentSeasonId);
      loadHofData();
    });
  }

  // Award Title Button Handler
  const btnAward = document.getElementById('btnAwardTitle');
  if (btnAward) {
    btnAward.addEventListener('click', () => {
      openModal({
        title: 'Award Hall of Fame Title',
        contentHtml: `
          <div class="form-group mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1">Title Name</label>
            <input type="text" id="modalTitleName" class="form-control w-full p-2 border rounded-lg text-xs" placeholder="e.g. Master UI Craftsperson" />
          </div>
          <div class="form-group mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1">Category</label>
            <select id="modalTitleCategory" class="form-control w-full p-2 border rounded-lg text-xs">
              <option value="Academics">Academics</option>
              <option value="Coding">Coding</option>
              <option value="Design">Design</option>
              <option value="Leadership">Leadership</option>
              <option value="Collaboration">Collaboration</option>
            </select>
          </div>
          <div class="form-group mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1">Awardee User ID (Optional)</label>
            <input type="text" id="modalAwardeeUser" class="form-control w-full p-2 border rounded-lg text-xs" placeholder="e.g. u_student_1" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const title_name = overlay.querySelector('#modalTitleName').value.trim();
          const category = overlay.querySelector('#modalTitleCategory').value;
          const awarded_to_user_id = overlay.querySelector('#modalAwardeeUser').value.trim() || null;

          if (!title_name) return false;

          await awardTitle({
            title_name,
            category,
            awarded_to_user_id,
            season_id: currentSeasonId || null
          });
          refreshData();
          loadHofData();
          return true;
        }
      });
    });
  }

  // Admin New Season Handler
  const btnCreateSeason = document.getElementById('btnCreateSeason');
  if (btnCreateSeason) {
    btnCreateSeason.addEventListener('click', () => {
      openModal({
        title: 'Create Competitive Season',
        contentHtml: `
          <div class="form-group mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1">Season Name</label>
            <input type="text" id="modalSeasonName" class="form-control w-full p-2 border rounded-lg text-xs" placeholder="e.g. Season 2: Expansion" />
          </div>
          <div class="form-group mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
            <input type="date" id="modalSeasonStart" class="form-control w-full p-2 border rounded-lg text-xs" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group mb-3">
            <label class="block text-xs font-bold text-slate-700 mb-1">End Date (Optional)</label>
            <input type="date" id="modalSeasonEnd" class="form-control w-full p-2 border rounded-lg text-xs" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const name = overlay.querySelector('#modalSeasonName').value.trim();
          const start_date = overlay.querySelector('#modalSeasonStart').value;
          const end_date = overlay.querySelector('#modalSeasonEnd').value || null;

          if (!name || !start_date) return false;

          await createSeason({ name, start_date, end_date, is_current: true });
          refreshData();
          loadHofData();
          return true;
        }
      });
    });
  }

  // Load initial data
  loadHofData();
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
