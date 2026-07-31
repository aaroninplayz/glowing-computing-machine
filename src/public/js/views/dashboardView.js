// Dashboard View Renderer (Glassmorphism Deep Obsidian Theme)

export function renderDashboard(state) {
  const { tasksData, teamsData, currentUser } = state;
  const teamTasks = tasksData.teamTasks || [];
  const challenges = tasksData.challenges || [];
  const allTasks = [...teamTasks, ...challenges];
  const activeTasks = allTasks.filter(t => t.status !== 'COMPLETED');
  const userRole = currentUser ? (currentUser.public_role || currentUser.role) : 'OPERATIVE';

  // Find user's active team
  const myTeam = teamsData.find(t => t.members && t.members.some(m => m.id === currentUser?.id));

  return `
    <div class="grid grid-cols-12 gap-6">
      <!-- Main Content Column -->
      <section class="col-span-12 lg:col-span-8 space-y-6">
        
        <!-- Objective Progress Card -->
        <div class="glass-card p-8 rounded-xl relative overflow-hidden">
          <div class="absolute top-0 right-0 p-8 opacity-10">
            <span class="material-symbols-outlined text-[140px] select-none text-royal-slate-blue">bolt</span>
          </div>
          <div class="relative z-10 space-y-4">
            <div class="space-y-1">
              <span class="text-xs uppercase tracking-widest text-royal-slate-blue font-bold">Current Active Objective</span>
              <h1 class="text-2xl md:text-3xl font-extrabold text-white">Sprint 01: Core Platform Launch</h1>
            </div>
            <p class="text-sm text-outline max-w-xl">
              Welcome back, <strong class="text-white">${currentUser ? currentUser.name : 'Operative'}</strong>. 
              Role context active: <span class="px-2 py-0.5 rounded text-xs bg-royal-slate-blue/20 text-ice-blue border border-royal-slate-blue/40">${userRole}</span>
            </p>
            <div class="space-y-2 pt-2">
              <div class="flex justify-between items-end text-sm">
                <span class="text-outline font-medium">Sprint Completion Progress</span>
                <span class="text-ice-blue font-bold text-lg">65%</span>
              </div>
              <div class="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div class="h-full bg-royal-slate-blue spring-progress" style="width: 65%"></div>
              </div>
            </div>
            <div class="flex gap-6 pt-2 text-xs">
              <div>
                <span class="text-outline block">Remaining Tasks</span>
                <span class="text-sm font-semibold text-white">${activeTasks.length} Active Items</span>
              </div>
              <div class="w-px h-8 bg-white/10"></div>
              <div>
                <span class="text-outline block">Squad Assignment</span>
                <span class="text-sm font-semibold text-white">${myTeam ? myTeam.name : 'Unassigned Pool'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Task Grid Header -->
        <div class="flex justify-between items-center pt-2">
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-royal-slate-blue">assignment</span>
            Assigned Objectives Overview
          </h2>
          <span class="text-xs text-outline font-medium">${allTasks.length} total tasks registered</span>
        </div>

        <!-- Task Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${allTasks.length === 0 ? `
            <div class="col-span-2 glass-card p-8 rounded-lg text-center text-outline">
              No tasks currently registered. Check Tasks & Marketplace tab!
            </div>
          ` : allTasks.slice(0, 4).map(t => `
            <div class="glass-card p-6 rounded-lg flex flex-col justify-between group">
              <div class="space-y-3">
                <div class="flex justify-between items-start">
                  <span class="px-2.5 py-1 text-xs font-semibold rounded bg-royal-slate-blue/15 text-royal-slate-blue border border-royal-slate-blue/30">
                    ${t.task_type === 'CHALLENGE' ? 'CHALLENGE' : 'TEAM TASK'}
                  </span>
                  <span class="text-xs font-bold px-2.5 py-1 rounded bg-white/5 text-ice-blue border border-white/10">
                    ${t.total_points} PTS
                  </span>
                </div>
                <div>
                  <h3 class="font-bold text-lg text-white group-hover:text-royal-slate-blue transition-colors line-clamp-1">
                    ${t.title}
                  </h3>
                  <p class="text-xs text-outline mt-1.5 line-clamp-2">${t.description}</p>
                </div>
              </div>
              <div class="pt-4 mt-4 border-t border-white/5 flex justify-between items-center text-xs">
                <span class="text-outline flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">schedule</span>
                  ${t.status}
                </span>
                ${t.assigned_team_name ? `
                  <span class="text-ice-blue font-medium">Squad: ${t.assigned_team_name}</span>
                ` : t.assigned_user_name ? `
                  <span class="text-warm-coral font-medium">Assigned: ${t.assigned_user_name}</span>
                ` : `
                  <span class="text-outline">Open</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Sidebar Column -->
      <aside class="col-span-12 lg:col-span-4 space-y-6">
        
        <!-- Squad Status Card -->
        <div class="glass-card rounded-xl p-6">
          <div class="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
            <h2 class="font-bold text-lg text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-royal-slate-blue">groups</span>
              Your Squad Status
            </h2>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-outline">
              ${myTeam ? 'ACTIVE' : 'SOLO'}
            </span>
          </div>

          ${myTeam ? `
            <div class="space-y-4">
              <div>
                <h3 class="font-bold text-xl text-white">${myTeam.name}</h3>
                <p class="text-xs text-outline mt-0.5">Captain: <strong class="text-ice-blue">${myTeam.captain_name || 'Unassigned'}</strong></p>
              </div>

              <div class="space-y-2 pt-2">
                <span class="text-xs font-semibold text-outline uppercase tracking-wider block">Roster Members (${myTeam.members?.length || 0})</span>
                <div class="space-y-2">
                  ${myTeam.members?.map(m => `
                    <div class="flex justify-between items-center text-xs p-2 rounded bg-white/5 border border-white/5">
                      <span class="font-medium text-white flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-sm text-royal-slate-blue">person</span>
                        ${m.name}
                        ${m.id === myTeam.captain_id ? '<span class="text-[10px] bg-royal-slate-blue/30 text-royal-slate-blue px-1.5 py-0.2 rounded">CPT</span>' : ''}
                      </span>
                      <span class="text-ice-blue font-semibold">${Math.round((m.custom_point_share || 1) * 100)}% share</span>
                    </div>
                  `).join('') || ''}
                </div>
              </div>
            </div>
          ` : `
            <div class="text-center py-6 space-y-3">
              <span class="material-symbols-outlined text-4xl text-outline">group_add</span>
              <p class="text-xs text-outline">You are not currently assigned to a squad. Join or wait for squad creation on the Teams page.</p>
            </div>
          `}
        </div>

        <!-- System Activity Feed -->
        <div class="glass-card rounded-xl p-6">
          <h2 class="font-bold text-lg text-white mb-4 flex items-center gap-2 pb-3 border-b border-white/10">
            <span class="material-symbols-outlined text-royal-slate-blue">rss_feed</span>
            Recent Cohort Activity
          </h2>
          <div class="space-y-3 text-xs">
            <div class="flex gap-3 items-start p-2 rounded bg-white/5">
              <span class="material-symbols-outlined text-sm text-royal-slate-blue mt-0.5">verified</span>
              <div>
                <p class="text-white font-medium">Sprint 01 launched</p>
                <span class="text-outline text-[11px]">System Ops • 2 hours ago</span>
              </div>
            </div>
            <div class="flex gap-3 items-start p-2 rounded bg-white/5">
              <span class="material-symbols-outlined text-sm text-warm-coral mt-0.5">thumb_up</span>
              <div>
                <p class="text-white font-medium">Marketplace ideas upvoted</p>
                <span class="text-outline text-[11px]">Cohort members active</span>
              </div>
            </div>
          </div>
        </div>

      </aside>
    </div>
  `;
}

export function attachDashboardEvents(state, refreshData) {
  // Reserved for interactive dashboard widgets if needed
}
