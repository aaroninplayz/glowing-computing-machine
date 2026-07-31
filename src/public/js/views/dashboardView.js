// Dashboard View Renderer

export function renderDashboard(state) {
  const { tasksData } = state;
  const officialTasks = tasksData.official || [];

  return `
    <div class="card" style="margin-bottom: 1.5rem;">
      <h2 style="margin-bottom: 0.5rem;">Sprint 01: Community Platform Launch</h2>
      <p style="opacity: 0.8; margin-bottom: 1rem;">Welcome to Forge. Active tasks and team objectives are tracked below.</p>
      <div style="background: var(--border-color); height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: var(--accent-2); width: 65%; height: 100%;"></div>
      </div>
    </div>

    <h3 style="margin-bottom: 0.5rem;">Official Tasks Summary</h3>
    <div class="grid">
      ${officialTasks.slice(0, 3).map(t => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
            <span class="badge badge-accent2">${t.total_points} PTS</span>
            <span class="badge badge-accent1">${t.status}</span>
          </div>
          <h4 style="margin-bottom:0.5rem;">${t.title}</h4>
          <p style="font-size:0.85rem; opacity:0.8;">${t.description}</p>
        </div>
      `).join('')}
    </div>
  `;
}
