// Main ES Module Entry Point
import { store } from './state/store.js';
import { initTheme, toggleTheme } from './services/theme.js';
import { fetchCurrentUser, fetchTasks, fetchTeams, fetchHallOfFame } from './services/api.js';

import { renderDashboard } from './views/dashboardView.js';
import { renderTasksView, attachTasksEvents } from './views/tasksView.js';
import { renderTeamsView, attachTeamsEvents } from './views/teamsView.js';
import { renderHallOfFameView, attachHallOfFameEvents } from './views/hallOfFameView.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initThemeToggle();
  initNav();
  initAuth();

  store.subscribe((state) => {
    renderAppView(state);
  });

  loadAllData();
});

function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }
}

function initNav() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      const activeTab = target.getAttribute('data-tab');
      store.setState({ activeTab });
    });
  });
}

async function initAuth() {
  try {
    const userRes = await fetchCurrentUser();
    if (userRes && userRes.user) {
      store.setState({ currentUser: userRes.user });
    }
  } catch (err) {
    console.error('Failed to load current user context:', err);
  }
}

export async function loadAllData() {
  try {
    const [tasksRes, teamsRes, hallRes] = await Promise.all([
      fetchTasks(),
      fetchTeams(),
      fetchHallOfFame()
    ]);

    store.setState({
      tasksData: tasksRes || { official: [], marketplace: [] },
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
  } else if (activeTab === 'tasks') {
    appView.innerHTML = renderTasksView(state);
    attachTasksEvents(state, loadAllData);
  } else if (activeTab === 'teams') {
    appView.innerHTML = renderTeamsView(state);
    attachTeamsEvents(state, loadAllData);
  } else if (activeTab === 'hall-of-fame') {
    appView.innerHTML = renderHallOfFameView(state);
    attachHallOfFameEvents(state, loadAllData);
  }
}
