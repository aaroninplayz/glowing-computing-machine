// User Settings View Component (FORGE Platform Theme)
import { updateUserProfile, changePassword, fetchNotificationPreferences, updateNotificationPreferences } from '../services/api.js';
import { store } from '../state/store.js';

export function renderSettingsView(state) {
  const user = state.currentUser || {};

  return `
    <div id="userSettingsWrapper" class="space-y-8 max-w-4xl mx-auto font-sans text-slate-800">
      
      <!-- Header Hero -->
      <div class="glass-card p-6 md:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-royal-slate-blue/10 text-royal-slate-blue border border-royal-slate-blue/30">
              Operative Profile & Security
            </span>
            <span class="text-xs text-slate-500">• Personal Preferences</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Account Settings
          </h1>
          <p class="text-xs md:text-sm text-slate-500 max-w-xl">
            Update your public profile bio, specialty tags, contact links, security credentials, and alert delivery preferences.
          </p>
        </div>
      </div>

      <!-- Main Settings Grid -->
      <div class="space-y-8">
        
        <!-- Profile Info Card -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span class="material-symbols-outlined text-xl text-royal-slate-blue">account_circle</span>
            <h2 class="text-lg font-extrabold text-slate-900">Profile Information</h2>
          </div>

          <form id="settingsForm" class="space-y-4">
            <div id="settingsAlert" class="hidden p-3 rounded-xl text-xs font-bold"></div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
                <input type="text" id="settingsName" value="${escapeHtml(user.name || '')}" required
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:border-royal-slate-blue focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username</label>
                <input type="text" id="settingsUsername" value="${escapeHtml(user.username || '')}" required readonly
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed font-medium" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Specialty Tag / Skills</label>
              <input type="text" id="settingsSkills" value="${escapeHtml(user.skills || user.tag || '')}" placeholder="e.g. Frontend Architect, UI/UX, Data Pipelines" 
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:border-royal-slate-blue focus:outline-none" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bio / Profile Description</label>
              <textarea id="settingsBio" rows="3" placeholder="Tell the cohort about yourself and your technical goals..." 
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:border-royal-slate-blue focus:outline-none">${escapeHtml(user.bio || '')}</textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">GitHub Profile URL</label>
                <input type="url" id="settingsGithub" value="${escapeHtml(user.github_url || '')}" placeholder="https://github.com/username" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:border-royal-slate-blue focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Portfolio / Personal Link</label>
                <input type="url" id="settingsPortfolio" value="${escapeHtml(user.portfolio_url || '')}" placeholder="https://yourportfolio.dev" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:border-royal-slate-blue focus:outline-none" />
              </div>
            </div>

            <button type="submit" id="btnSaveSettings" class="py-2.5 px-5 bg-royal-slate-blue hover:bg-royal-slate-blue/90 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer text-xs">
              <span class="material-symbols-outlined text-sm">save</span>
              <span>Save Profile Settings</span>
            </button>
          </form>
        </div>

        <!-- Password Change Card -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div class="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span class="material-symbols-outlined text-xl text-royal-slate-blue">lock</span>
            <h2 class="text-lg font-extrabold text-slate-900">Security & Password</h2>
          </div>

          <form id="changePasswordForm" class="space-y-4">
            <div id="changePasswordAlert" class="hidden p-3 rounded-xl text-xs font-bold"></div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Current Password</label>
              <input type="password" id="currentPassword" required placeholder="••••••••" 
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:border-royal-slate-blue focus:outline-none" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">New Password</label>
                <input type="password" id="newPassword" required placeholder="••••••••" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:border-royal-slate-blue focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Confirm New Password</label>
                <input type="password" id="confirmPassword" required placeholder="••••••••" 
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:border-royal-slate-blue focus:outline-none" />
              </div>
            </div>

            <button type="submit" id="btnChangePassword" class="py-2.5 px-5 bg-royal-slate-blue hover:bg-royal-slate-blue/90 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer text-xs">
              <span class="material-symbols-outlined text-sm">key</span>
              <span>Update Password</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  `;
}

export function attachSettingsEvents(state, reloadDataCallback) {
  const form = document.getElementById('settingsForm');
  const passwordForm = document.getElementById('changePasswordForm');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertEl = document.getElementById('settingsAlert');
      const user = state.currentUser;
      if (!user) return;

      const name = document.getElementById('settingsName').value.trim();
      const skills = document.getElementById('settingsSkills').value.trim();
      const bio = document.getElementById('settingsBio').value.trim();
      const github_url = document.getElementById('settingsGithub').value.trim();
      const portfolio_url = document.getElementById('settingsPortfolio').value.trim();

      try {
        const res = await updateUserProfile(user.id, { name, tag: skills, skills, bio, github_url, portfolio_url });
        if (res && res.user) {
          localStorage.setItem('forge_user_session', JSON.stringify(res.user));
          store.setState({ currentUser: res.user });
          showAlert(alertEl, 'Profile settings saved successfully!', false);
          if (reloadDataCallback) reloadDataCallback();
        }
      } catch (err) {
        showAlert(alertEl, err.message || 'Failed to save settings', true);
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertEl = document.getElementById('changePasswordAlert');
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        showAlert(alertEl, 'New passwords do not match', true);
        return;
      }

      try {
        await changePassword(currentPassword, newPassword);
        showAlert(alertEl, 'Password updated successfully!', false);
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
      } catch (err) {
        showAlert(alertEl, err.message || 'Failed to change password', true);
      }
    });
  }
}

function showAlert(el, msg, isError) {
  if (!el) return;
  el.classList.remove('hidden', 'bg-rose-50', 'text-rose-600', 'border-rose-200', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
  if (isError) {
    el.classList.add('bg-rose-50', 'text-rose-600', 'border', 'border-rose-200');
  } else {
    el.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
  }
  el.textContent = msg;
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
