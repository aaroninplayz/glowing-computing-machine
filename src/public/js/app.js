// App State
let activeTab = 'dashboard';
let currentTheme = 'dark';

// API Data Caches
let tasksData = { official: [], marketplace: [] };
let teamsData = [];
let hallOfFameData = { allTime: [], season1: [], titles: [] };

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initThemeToggle();
  loadAllData();
});

function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  toggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
  });
}

function initNav() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      activeTab = e.target.getAttribute('data-tab');
      renderView();
    });
  });
}

async function loadAllData() {
  try {
    const [tasksRes, teamsRes, hallRes] = await Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/hall-of-fame').then(r => r.json())
    ]);

    tasksData = tasksRes || { official: [], marketplace: [] };
    teamsData = teamsRes || [];
    hallOfFameData = hallRes || { allTime: [], season1: [], titles: [] };

    renderView();
  } catch (err) {
    console.error('Error loading API data:', err);
  }
}

function renderView() {
  const appView = document.getElementById('appView');
  if (!appView) return;

  if (activeTab === 'dashboard') {
    appView.innerHTML = renderDashboard();
  } else if (activeTab === 'tasks') {
    appView.innerHTML = renderTasksView();
    attachTasksEvents();
  } else if (activeTab === 'teams') {
    appView.innerHTML = renderTeamsView();
    attachTeamsEvents();
  } else if (activeTab === 'hall-of-fame') {
    appView.innerHTML = renderHallOfFameView();
  }
}

// 1. DASHBOARD VIEW
function renderDashboard() {
  return `
    <div class="card" style="margin-bottom: 1.5rem;">
      <h2 style="margin-bottom: 0.5rem;">Sprint 01: Community Platform Launch</h2>
      <p style="opacity: 0.8; margin-bottom: 1rem;">Welcome to Forge. Active tasks and team objectives are tracked below.</p>
      <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="background: var(--accent-2); width: 65%; height: 100%;"></div>
      </div>
    </div>

    <h3 style="margin-bottom: 0.5rem;">Official Tasks Summary</h3>
    <div class="grid">
      ${tasksData.official.slice(0, 3).map(t => `
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

// 2. TASKS & MARKETPLACE VIEW
function renderTasksView() {
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
      <h2>Tasks & Marketplace</h2>
      <button id="btnSuggestTask" class="btn btn-primary">+ Suggest Marketplace Task</button>
    </div>

    <h3 style="margin-bottom: 0.5rem;">Official Assigned Tasks</h3>
    <div class="grid" style="margin-bottom: 2rem;">
      ${tasksData.official.map(t => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
            <span class="badge badge-accent2">${t.total_points} PTS</span>
            <span class="badge badge-accent1">${t.status}</span>
          </div>
          <h4>${t.title}</h4>
          <p style="font-size:0.85rem; opacity:0.8; margin-bottom:1rem;">${t.description}</p>
          <button class="btn btn-secondary btn-submit-task" data-id="${t.id}">Submit Task Proof</button>
        </div>
      `).join('')}
    </div>

    <h3 style="margin-bottom: 0.5rem;">Task Marketplace (Student Upvote Board)</h3>
    <div class="grid">
      ${tasksData.marketplace.map(m => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
            <span class="badge badge-accent3">${m.total_points} PTS</span>
            <button class="btn btn-secondary btn-upvote" data-id="${m.id}" style="padding:0.2rem 0.6rem;">
              ▲ Upvote (${m.upvotes})
            </button>
          </div>
          <h4>${m.title}</h4>
          <p style="font-size:0.85rem; opacity:0.8;">${m.description}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function attachTasksEvents() {
  document.querySelectorAll('.btn-upvote').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const taskId = e.target.getAttribute('data-id');
      await fetch(`/api/tasks/${taskId}/upvote`, { method: 'POST' });
      loadAllData();
    });
  });

  const suggestBtn = document.getElementById('btnSuggestTask');
  if (suggestBtn) {
    suggestBtn.addEventListener('click', async () => {
      const title = prompt('Enter Task Title:');
      const description = prompt('Enter Task Description:');
      if (title && description) {
        await fetch('/api/tasks/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, total_points: 25 })
        });
        loadAllData();
      }
    });
  }
}

// 3. TEAMS VIEW
function renderTeamsView() {
  return `
    <h2 style="margin-bottom: 1rem;">Community Teams & Captains</h2>
    <div class="grid">
      ${teamsData.map(t => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h3>${t.name}</h3>
            <span class="badge badge-accent2">Captain: ${t.captain_name || 'Unassigned'}</span>
          </div>
          <h5 style="margin-bottom:0.5rem; opacity:0.8;">Roster Members & Custom Point Shares:</h5>
          <ul style="list-style:none; display:flex; flex-direction:column; gap:0.4rem;">
            ${t.members?.map(m => `
              <li style="display:flex; justify-content:space-between; font-size:0.85rem; background:rgba(0,0,0,0.1); padding:0.4rem; border-radius:4px;">
                <span>${m.name} ${m.tag ? `<small>(${m.tag})</small>` : ''}</span>
                <span class="badge badge-accent3">${Math.round(m.custom_point_share * 100)}% Share</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  `;
}

function attachTeamsEvents() {}

// 4. THE HALL OF FAME VIEW (Marble & Granite Theme)
function renderHallOfFameView() {
  return `
    <div class="hall-of-fame-wrapper">
      <div class="hall-header">
        <h2>🏛️ The Hall of Fame</h2>
        <p style="opacity:0.8;">Honoring Academic Excellence, Coding Mastery & Community Titles</p>
      </div>

      <div class="hall-grid">
        <!-- All-Time Leaderboard Sideboard -->
        <div>
          <h3 style="margin-bottom:0.75rem;">All-Time Rankings</h3>
          <ol style="padding-left:1.2rem;">
            ${hallOfFameData.allTime.map(u => `
              <li style="margin-bottom:0.4rem; font-weight:600;">
                ${u.name} <span class="badge badge-accent2">${u.points} PTS</span>
              </li>
            `).join('')}
          </ol>
        </div>

        <!-- Central Monument Wall (Awarded Titles) -->
        <div class="hall-monument">
          <h3 style="margin-bottom:1rem;">Awarded Honors</h3>
          ${hallOfFameData.titles.map(t => `
            <div class="plaque">
              <div style="font-size:1.1rem;">🏆 ${t.title_name}</div>
              <div style="font-size:0.8rem; opacity:0.9;">Awarded to: ${t.user_name || t.team_name || 'Cohort'}</div>
            </div>
          `).join('')}
        </div>

        <!-- Season 1 Leaderboard Sideboard -->
        <div>
          <h3 style="margin-bottom:0.75rem;">Season 1 Rankings</h3>
          <ol style="padding-left:1.2rem;">
            ${hallOfFameData.season1.map(u => `
              <li style="margin-bottom:0.4rem; font-weight:600;">
                ${u.name} <span class="badge badge-accent1">${u.points} PTS</span>
              </li>
            `).join('')}
          </ol>
        </div>
      </div>
    </div>
  `;
}
