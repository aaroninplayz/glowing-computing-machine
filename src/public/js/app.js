// Main ES Module Entry Point
import { store } from './state/store.js';
import { fetchCurrentUser, fetchTasks, fetchTeams, fetchHallOfFame } from './services/api.js';

import { renderDashboard, attachDashboardEvents } from './views/dashboardView.js';
import { renderTasksView, attachTasksEvents } from './views/tasksView.js';
import { renderTeamsView, attachTeamsEvents } from './views/teamsView.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initUserSelector();

  store.subscribe((state) => {
    renderAppView(state);
    updateHeaderUserBadge(state.currentUser);
  });

  loadAllData();
});

function initNav() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => {
        t.classList.remove('text-royal-slate-blue', 'border-b-2', 'border-royal-slate-blue', 'pb-1');
        t.classList.add('text-outline');
      });

      const target = e.currentTarget;
      target.classList.remove('text-outline');
      target.classList.add('text-royal-slate-blue', 'border-b-2', 'border-royal-slate-blue', 'pb-1');

      const activeTab = target.getAttribute('data-tab');
      store.setState({ activeTab });
    });
  });
}

function initUserSelector() {
  const selector = document.getElementById('userSelector');
  if (selector) {
    selector.addEventListener('change', async (e) => {
      const selectedUserId = e.target.value;
      try {
        const userRes = await fetchCurrentUser(selectedUserId);
        if (userRes && userRes.user) {
          store.setState({ currentUser: userRes.user });
          loadAllData();
        }
      } catch (err) {
        console.error('Failed to switch user context:', err);
      }
    });
  }

  // Load initial user
  fetchCurrentUser('u_dev').then(userRes => {
    if (userRes && userRes.user) {
      store.setState({ currentUser: userRes.user });
    }
  }).catch(console.error);
}

function updateHeaderUserBadge(user) {
  if (!user) return;
  const userTagBadge = document.getElementById('userTagBadge');
  if (userTagBadge) {
    userTagBadge.textContent = `${user.name} (${user.tag || user.public_role || user.role})`;
  }
}

export async function loadAllData() {
  try {
    const currentUser = store.getState().currentUser;
    const userId = currentUser ? currentUser.id : 'u_dev';

    const [tasksRes, teamsRes, hallRes] = await Promise.all([
      fetchTasks(userId),
      fetchTeams(userId),
      fetchHallOfFame(userId)
    ]);

    store.setState({
      tasksData: tasksRes || { teamTasks: [], challenges: [], marketplace: [] },
      teamsData: teamsRes || [],
      hallOfFameData: hallRes || { allTime: [], season1: [], titles: [] }
    });
  } catch (err) {
    console.error('Error loading API data:', err);
  }
}

function renderAppView(state) {
  const appView = document.getElementById('appView');
  if (!appView) return;

  const { activeTab } = state;

  if (activeTab === 'dashboard') {
    appView.innerHTML = renderDashboard(state);
    attachDashboardEvents(state, loadAllData);
  } else if (activeTab === 'tasks') {
    appView.innerHTML = renderTasksView(state);
    attachTasksEvents(state, loadAllData);
  } else if (activeTab === 'teams') {
    appView.innerHTML = renderTeamsView(state);
    attachTeamsEvents(state, loadAllData);
  }
}
