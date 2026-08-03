// Notification Center & Preferences View Component (FORGE Platform Theme)
import {
  fetchNotifications,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../services/api.js';
import { updateNotificationBadge } from '../components/notificationBell.js';

export function renderNotificationsView(state) {
  const activeCategory = state.notificationCategory || 'all';

  return `
    <div id="notificationsViewWrapper" class="space-y-8 max-w-6xl mx-auto font-sans text-slate-800" data-category="${escapeHtml(activeCategory)}">
      
      <!-- Header Hero -->
      <div class="glass-card p-6 md:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 border border-indigo-500/30">
              Communication Hub
            </span>
            <span class="text-xs text-slate-500">• Real-Time Dispatch Engine</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p class="text-xs md:text-sm text-slate-500 max-w-xl">
            Manage your real-time alerts, review updates, mission assignments, and notification delivery preferences.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button id="btnMarkAllRead" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 shadow-sm">
            <span class="material-symbols-outlined text-sm text-slate-600">done_all</span>
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      <!-- Main Layout: Feed + Preferences Sidebar -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <!-- Main Notifications Feed Area (2 Columns on Large Screens) -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Category Tabs -->
          <div class="flex border-b border-slate-200 overflow-x-auto gap-2">
            <button class="btn-notif-cat px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeCategory === 'all' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="all">
              <span>All Alerts</span>
            </button>
            <button class="btn-notif-cat px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeCategory === 'tasks' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="tasks">
              <span class="material-symbols-outlined text-sm">assignment</span>
              <span>Tasks</span>
            </button>
            <button class="btn-notif-cat px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeCategory === 'reviews' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="reviews">
              <span class="material-symbols-outlined text-sm">rate_review</span>
              <span>Reviews</span>
            </button>
            <button class="btn-notif-cat px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeCategory === 'system' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="system">
              <span class="material-symbols-outlined text-sm">campaign</span>
              <span>System</span>
            </button>
            <button class="btn-notif-cat px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeCategory === 'social' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-category="social">
              <span class="material-symbols-outlined text-sm">diversity_3</span>
              <span>Social</span>
            </button>
          </div>

          <!-- Notification Feed List -->
          <div id="notificationsFeedArea" class="space-y-3">
            <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
              Loading notification feed...
            </div>
          </div>

        </div>

        <!-- Preferences Panel Sidebar -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div class="space-y-1 pb-3 border-b border-slate-100">
            <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
              <span class="material-symbols-outlined text-royal-slate-blue">tune</span>
              Alert Preferences
            </h3>
            <p class="text-xs text-slate-500">Mute specific notification categories to customize your feed.</p>
          </div>

          <div id="preferencesLoadingArea" class="text-center text-xs text-slate-400 py-4 animate-pulse">
            Loading preference switches...
          </div>

          <div id="preferencesFormArea" class="space-y-4 hidden">
            
            <label class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Task Assignment Alerts</span>
                <span class="text-[11px] text-slate-400">New assignments and upcoming deadlines</span>
              </div>
              <input type="checkbox" id="prefTaskAlerts" class="toggle-checkbox w-4 h-4 text-royal-slate-blue rounded border-slate-300 focus:ring-royal-slate-blue cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Task Review & Feedback</span>
                <span class="text-[11px] text-slate-400">Submission reviews and ratings</span>
              </div>
              <input type="checkbox" id="prefReviewAlerts" class="toggle-checkbox w-4 h-4 text-royal-slate-blue rounded border-slate-300 focus:ring-royal-slate-blue cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
              <div>
                <span class="text-xs font-bold text-slate-900 block">System Broadcasts</span>
                <span class="text-[11px] text-slate-400">Platform updates and announcements</span>
              </div>
              <input type="checkbox" id="prefSystemAlerts" class="toggle-checkbox w-4 h-4 text-royal-slate-blue rounded border-slate-300 focus:ring-royal-slate-blue cursor-pointer" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
              <div>
                <span class="text-xs font-bold text-slate-900 block">Social & Honors</span>
                <span class="text-[11px] text-slate-400">Mentions, rewards, and titles</span>
              </div>
              <input type="checkbox" id="prefSocialAlerts" class="toggle-checkbox w-4 h-4 text-royal-slate-blue rounded border-slate-300 focus:ring-royal-slate-blue cursor-pointer" />
            </label>

          </div>

          <div id="preferencesSavedMsg" class="hidden text-center text-xs font-bold text-emerald-600 bg-emerald-50 py-2 rounded-xl border border-emerald-200">
            Preferences updated!
          </div>
        </div>

      </div>

    </div>
  `;
}

export async function attachNotificationsEvents(state, refreshData) {
  const wrapper = document.getElementById('notificationsViewWrapper');
  if (!wrapper) return;

  let activeCategory = wrapper.getAttribute('data-category') || 'all';

  // 1. Load Notifications Feed
  const loadFeed = async () => {
    const feedArea = document.getElementById('notificationsFeedArea');
    if (!feedArea) return;

    feedArea.innerHTML = `
      <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
        Loading notification feed...
      </div>
    `;

    try {
      const categoryFilter = activeCategory === 'all' ? null : activeCategory;
      const notifications = await fetchNotifications(false, categoryFilter);

      if (!Array.isArray(notifications) || notifications.length === 0) {
        feedArea.innerHTML = `
          <div class="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
            No notifications recorded for this category.
          </div>
        `;
        return;
      }

      feedArea.innerHTML = notifications.map(n => {
        const isRead = !!n.is_read;
        const iconMap = {
          ASSIGNMENT: 'assignment',
          TASK: 'task',
          DEADLINE: 'timer',
          REVIEW: 'rate_review',
          ANNOUNCEMENT: 'campaign',
          INFO: 'info',
          ALERT: 'warning',
          MENTION: 'alternate_email'
        };
        const icon = iconMap[n.type] || 'notifications';

        return `
          <div class="p-4 rounded-xl border ${isRead ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/40 shadow-sm'} transition-all flex items-start justify-between gap-4 notif-card cursor-pointer" data-id="${n.id}" data-link="${escapeHtml(n.link || '#tasks')}">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-full ${isRead ? 'bg-slate-100 text-slate-500' : 'bg-royal-slate-blue text-white'} flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-base">${icon}</span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h4 class="text-xs font-extrabold ${isRead ? 'text-slate-800' : 'text-slate-900'}">${escapeHtml(n.title)}</h4>
                  ${!isRead ? '<span class="w-2 h-2 rounded-full bg-royal-slate-blue"></span>' : ''}
                </div>
                <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(n.message)}</p>
                <span class="text-[10px] text-slate-400 block">${new Date(n.created_at || Date.now()).toLocaleString()}</span>
              </div>
            </div>

            ${!isRead ? `
              <button class="btn-mark-single-read px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all border border-slate-200 flex-shrink-0" data-id="${n.id}">
                Mark Read
              </button>
            ` : ''}
          </div>
        `;
      }).join('');

      // Attach card click handlers for actionable navigation
      feedArea.querySelectorAll('.notif-card').forEach(card => {
        card.addEventListener('click', async (e) => {
          if (e.target.closest('.btn-mark-single-read')) return; // Ignore mark read button click
          const notifId = card.getAttribute('data-id');
          const link = card.getAttribute('data-link');

          if (notifId) {
            await markNotificationAsRead(notifId);
            updateNotificationBadge();
          }

          if (link) {
            const targetTab = link.replace('#', '');
            document.dispatchEvent(new CustomEvent('forge:navigate', { detail: { tab: targetTab } }));
          }
        });
      });

      // Individual Mark Read button handler
      feedArea.querySelectorAll('.btn-mark-single-read').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const notifId = btn.getAttribute('data-id');
          if (notifId) {
            await markNotificationAsRead(notifId);
            updateNotificationBadge();
            loadFeed();
          }
        });
      });

    } catch (err) {
      console.error('Error loading notifications feed:', err);
      feedArea.innerHTML = `
        <div class="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          Failed to load notifications.
        </div>
      `;
    }
  };

  // 2. Load Preferences Switches
  const loadPreferences = async () => {
    const loadingArea = document.getElementById('preferencesLoadingArea');
    const formArea = document.getElementById('preferencesFormArea');
    if (!loadingArea || !formArea) return;

    try {
      const res = await fetchNotificationPreferences();
      const prefs = (res && res.preferences) || {};

      const chkTask = document.getElementById('prefTaskAlerts');
      const chkReview = document.getElementById('prefReviewAlerts');
      const chkSystem = document.getElementById('prefSystemAlerts');
      const chkSocial = document.getElementById('prefSocialAlerts');

      if (chkTask) chkTask.checked = !!prefs.taskAlerts;
      if (chkReview) chkReview.checked = !!prefs.reviewAlerts;
      if (chkSystem) chkSystem.checked = !!prefs.systemAlerts;
      if (chkSocial) chkSocial.checked = !!prefs.socialAlerts;

      loadingArea.classList.add('hidden');
      formArea.classList.remove('hidden');

      // Attach Toggle Change Listeners
      const handleToggle = async () => {
        const updated = {
          taskAlerts: chkTask ? chkTask.checked : true,
          reviewAlerts: chkReview ? chkReview.checked : true,
          systemAlerts: chkSystem ? chkSystem.checked : true,
          socialAlerts: chkSocial ? chkSocial.checked : true
        };

        await updateNotificationPreferences(updated);
        const msg = document.getElementById('preferencesSavedMsg');
        if (msg) {
          msg.classList.remove('hidden');
          setTimeout(() => msg.classList.add('hidden'), 2000);
        }
      };

      [chkTask, chkReview, chkSystem, chkSocial].forEach(chk => {
        if (chk) chk.addEventListener('change', handleToggle);
      });

    } catch (err) {
      console.error('Error loading notification preferences:', err);
    }
  };

  // Category Tab Handlers
  wrapper.querySelectorAll('.btn-notif-cat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cat = e.currentTarget.getAttribute('data-category');
      if (cat) {
        activeCategory = cat;
        state.notificationCategory = cat;
        wrapper.querySelectorAll('.btn-notif-cat').forEach(b => {
          b.classList.remove('border-royal-slate-blue', 'text-royal-slate-blue');
          b.classList.add('border-transparent', 'text-slate-500');
        });
        e.currentTarget.classList.remove('border-transparent', 'text-slate-500');
        e.currentTarget.classList.add('border-royal-slate-blue', 'text-royal-slate-blue');
        loadFeed();
      }
    });
  });

  // Mark All As Read Button Handler
  const btnMarkAll = document.getElementById('btnMarkAllRead');
  if (btnMarkAll) {
    btnMarkAll.addEventListener('click', async () => {
      await markAllNotificationsAsRead();
      updateNotificationBadge();
      loadFeed();
    });
  }

  // Load feed and preferences
  loadFeed();
  loadPreferences();
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
