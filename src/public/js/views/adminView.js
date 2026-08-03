// Admin Control Panel View Component (FORGE Platform Theme - Stitch MCP Blueprint)
import {
  fetchAdminConfig,
  updateAdminConfig,
  fetchAdminFeatures,
  updateAdminFeature,
  fetchAdminUsers,
  updateAdminUserStatus,
  fetchAdminAuditLog
} from '../services/api.js';

export function renderAdminView(state) {
  const currentUser = state.currentUser || {};
  const isAdmin = ['admin', 'DEV_STEALTH'].includes(currentUser.role);

  if (!isAdmin) {
    return `
      <div class="max-w-2xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl text-center space-y-4 shadow-sm font-sans">
        <div class="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <span class="material-symbols-outlined text-2xl">block</span>
        </div>
        <h2 class="text-xl font-black text-slate-900">403 Access Denied</h2>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          The Admin Control Panel is strictly restricted to platform administrators. Your role (${escapeHtml(currentUser.role || 'GUEST')}) does not have permission to view or manage global configuration.
        </p>
      </div>
    `;
  }

  const activeTab = state.adminActiveTab || 'features';

  return `
    <div id="adminViewWrapper" class="space-y-8 max-w-6xl mx-auto font-sans text-slate-800" data-active-tab="${escapeHtml(activeTab)}">
      
      <!-- Header Hero Banner -->
      <div class="glass-card p-6 md:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-700 border border-rose-500/30">
              System Administration
            </span>
            <span class="text-xs text-slate-500">• High-Privilege Control Panel</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Governance & Control
          </h1>
          <p class="text-xs md:text-sm text-slate-500 max-w-xl">
            Manage runtime feature flags, global system configuration, member roles, and audit security events.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <span class="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
            <span class="material-symbols-outlined text-sm text-amber-400">admin_panel_settings</span>
            <span>${escapeHtml(currentUser.name || 'Admin')}</span>
          </span>
        </div>
      </div>

      <!-- Navigation Section Tabs -->
      <div class="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button class="btn-admin-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'features' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-tab="features">
          <span class="material-symbols-outlined text-sm">toggle_on</span>
          <span>Feature Toggles</span>
        </button>
        <button class="btn-admin-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'config' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-tab="config">
          <span class="material-symbols-outlined text-sm">settings_suggest</span>
          <span>System Config</span>
        </button>
        <button class="btn-admin-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'users' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-tab="users">
          <span class="material-symbols-outlined text-sm">group</span>
          <span>User Management</span>
        </button>
        <button class="btn-admin-tab px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'audit' ? 'border-royal-slate-blue text-royal-slate-blue' : 'border-transparent text-slate-500 hover:text-slate-800'}" data-tab="audit">
          <span class="material-symbols-outlined text-sm">manage_search</span>
          <span>Audit Log Viewer</span>
        </button>
      </div>

      <!-- Dynamic Tab Content Area -->
      <div id="adminTabContentArea" class="space-y-6">
        <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
          Loading administration module...
        </div>
      </div>

    </div>
  `;
}

export async function attachAdminEvents(state, refreshData) {
  const wrapper = document.getElementById('adminViewWrapper');
  if (!wrapper) return;

  const currentUser = state.currentUser || {};
  const isAdmin = ['admin', 'DEV_STEALTH'].includes(currentUser.role);
  if (!isAdmin) return;

  let activeTab = wrapper.getAttribute('data-active-tab') || 'features';

  const renderTabContent = async () => {
    const contentArea = document.getElementById('adminTabContentArea');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl animate-pulse">
        Loading module data...
      </div>
    `;

    try {
      if (activeTab === 'features') {
        // Feature Toggles View
        const res = await fetchAdminFeatures();
        const features = (res && res.features) || [];

        contentArea.innerHTML = `
          <div class="space-y-4 font-sans">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-base font-bold text-slate-900">Runtime Feature Flags</h3>
                <p class="text-xs text-slate-500">Enable or disable core application modules instantly without restarting server.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${features.map(f => `
                <div class="p-5 rounded-2xl border ${f.is_enabled ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'} shadow-sm space-y-3 flex flex-col justify-between">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <h4 class="font-extrabold text-sm text-slate-900">${escapeHtml(f.name || f.key)}</h4>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${f.is_enabled ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30' : 'bg-slate-200 text-slate-600'}">
                        ${f.is_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 leading-relaxed">${escapeHtml(f.description || 'No description provided.')}</p>
                  </div>

                  <div class="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span class="text-[10px] text-slate-400">Key: ${escapeHtml(f.key)}</span>
                    <button class="btn-toggle-feature px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all ${f.is_enabled ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}" data-key="${f.key}" data-enabled="${f.is_enabled}">
                      ${f.is_enabled ? 'Turn Off' : 'Enable Feature'}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        // Toggle Feature Click Listeners
        contentArea.querySelectorAll('.btn-toggle-feature').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const key = e.currentTarget.getAttribute('data-key');
            const currentStatus = e.currentTarget.getAttribute('data-enabled') === 'true';
            await updateAdminFeature(key, !currentStatus);
            renderTabContent();
          });
        });

      } else if (activeTab === 'config') {
        // System Config View
        const res = await fetchAdminConfig();
        const config = (res && res.config) || {};

        contentArea.innerHTML = `
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-3xl">
            <div class="space-y-1 pb-3 border-b border-slate-100">
              <h3 class="text-base font-bold text-slate-900">Global System Parameters</h3>
              <p class="text-xs text-slate-500">Configure global application properties and behavioral constants.</p>
            </div>

            <form id="formAdminConfig" class="space-y-4">
              <div id="adminConfigAlert" class="hidden p-3 rounded-xl text-xs font-bold"></div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Platform Name / Title</label>
                <input type="text" id="cfgSiteTitle" value="${escapeHtml(config.site_title || 'Forge Platform')}" class="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-royal-slate-blue" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Max Task Submissions / Day</label>
                <input type="number" id="cfgMaxSubmissions" value="${escapeHtml(config.max_task_submissions_per_day || '10')}" class="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-royal-slate-blue" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Allow Self-Registration</label>
                <select id="cfgRegistration" class="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-royal-slate-blue">
                  <option value="true" ${config.allow_user_registration === 'true' ? 'selected' : ''}>Enabled (Public Sign-up Allowed)</option>
                  <option value="false" ${config.allow_user_registration === 'false' ? 'selected' : ''}>Disabled (Invite Only)</option>
                </select>
              </div>

              <button type="submit" class="px-5 py-2.5 rounded-xl bg-royal-slate-blue hover:bg-royal-slate-blue/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5">
                <span class="material-symbols-outlined text-sm">save</span>
                <span>Save System Config</span>
              </button>
            </form>
          </div>
        `;

        const cfgForm = document.getElementById('formAdminConfig');
        if (cfgForm) {
          cfgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertEl = document.getElementById('adminConfigAlert');
            const site_title = document.getElementById('cfgSiteTitle').value.trim();
            const max_task_submissions_per_day = document.getElementById('cfgMaxSubmissions').value.trim();
            const allow_user_registration = document.getElementById('cfgRegistration').value;

            try {
              await updateAdminConfig({ site_title, max_task_submissions_per_day, allow_user_registration });
              if (alertEl) {
                alertEl.classList.remove('hidden', 'bg-rose-50', 'text-rose-600');
                alertEl.classList.add('bg-emerald-50', 'text-emerald-700', 'border', 'border-emerald-200');
                alertEl.textContent = 'System configuration updated successfully!';
              }
            } catch (err) {
              if (alertEl) {
                alertEl.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-700');
                alertEl.classList.add('bg-rose-50', 'text-rose-600', 'border', 'border-rose-200');
                alertEl.textContent = err.message || 'Failed to update system config';
              }
            }
          });
        }

      } else if (activeTab === 'users') {
        // User Management View
        const res = await fetchAdminUsers(null, 50, 0);
        const users = (res && res.users) || [];

        contentArea.innerHTML = `
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 class="text-base font-bold text-slate-900">User Roster & Access Controls</h3>
                <p class="text-xs text-slate-500">Manage member privileges, roles, and account suspension states.</p>
              </div>
              <span class="text-xs font-bold text-slate-400">${users.length} Users Listed</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th class="py-3 px-2">User</th>
                    <th class="py-3 px-2">Username</th>
                    <th class="py-3 px-2">Role</th>
                    <th class="py-3 px-2">Status</th>
                    <th class="py-3 px-2">XP / Level</th>
                    <th class="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${users.map(u => {
                    const isSuspended = !!u.is_suspended;
                    return `
                      <tr class="hover:bg-slate-50 transition-all">
                        <td class="py-3 px-2 font-extrabold text-slate-900">${escapeHtml(u.name)}</td>
                        <td class="py-3 px-2 text-slate-500">@${escapeHtml(u.username)}</td>
                        <td class="py-3 px-2">
                          <select class="select-user-role p-1 rounded border border-slate-200 text-xs font-bold" data-user-id="${u.id}">
                            <option value="member" ${u.role === 'member' ? 'selected' : ''}>Member</option>
                            <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                          </select>
                        </td>
                        <td class="py-3 px-2">
                          <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${isSuspended ? 'bg-rose-500/10 text-rose-700 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'}">
                            ${isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td class="py-3 px-2 font-bold text-slate-700">${u.xp || 0} XP (Lvl ${u.level || 1})</td>
                        <td class="py-3 px-2 text-right">
                          <button class="btn-toggle-suspend px-3 py-1 rounded-lg text-xs font-bold ${isSuspended ? 'bg-emerald-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'}" data-user-id="${u.id}" data-suspended="${isSuspended}">
                            ${isSuspended ? 'Unban User' : 'Ban User'}
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;

        // Role select listener
        contentArea.querySelectorAll('.select-user-role').forEach(sel => {
          sel.addEventListener('change', async (e) => {
            const uid = e.target.getAttribute('data-user-id');
            const newRole = e.target.value;
            await updateAdminUserStatus(uid, { role: newRole });
            renderTabContent();
          });
        });

        // Suspend toggle listener
        contentArea.querySelectorAll('.btn-toggle-suspend').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const uid = e.currentTarget.getAttribute('data-user-id');
            const isSuspended = e.currentTarget.getAttribute('data-suspended') === 'true';
            await updateAdminUserStatus(uid, { is_suspended: !isSuspended });
            renderTabContent();
          });
        });

      } else if (activeTab === 'audit') {
        // Audit Log Viewer
        const res = await fetchAdminAuditLog(50, 0, null);
        const logs = (res && res.logs) || [];

        contentArea.innerHTML = `
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div class="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span class="material-symbols-outlined text-amber-500">manage_search</span>
                  System Audit Log Viewer
                </h3>
                <p class="text-xs text-slate-500">Recorded system activity events and administrative actions.</p>
              </div>
              <span class="text-xs font-bold text-slate-400">${logs.length} Events Recorded</span>
            </div>

            ${logs.length === 0 ? `
              <div class="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No administrative activity events logged yet.
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th class="py-3 px-2">Timestamp</th>
                      <th class="py-3 px-2">Operative</th>
                      <th class="py-3 px-2">Action Type</th>
                      <th class="py-3 px-2">Details</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${logs.map(log => `
                      <tr class="hover:bg-slate-50 transition-all">
                        <td class="py-3 px-2 text-slate-400 font-mono text-[11px]">${new Date(log.created_at || Date.now()).toLocaleString()}</td>
                        <td class="py-3 px-2 font-bold text-slate-800">${escapeHtml(log.user_name || 'System')}</td>
                        <td class="py-3 px-2">
                          <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200">
                            ${escapeHtml(log.action_type || 'SYSTEM')}
                          </span>
                        </td>
                        <td class="py-3 px-2 text-slate-600 font-medium">${escapeHtml(log.action_details || log.details || '-')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        `;
      }
    } catch (err) {
      console.error('Error rendering admin tab content:', err);
      contentArea.innerHTML = `
        <div class="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          Failed to load administration data module.
        </div>
      `;
    }
  };

  // Tab switch listener
  wrapper.querySelectorAll('.btn-admin-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      if (tab) {
        activeTab = tab;
        state.adminActiveTab = tab;
        wrapper.querySelectorAll('.btn-admin-tab').forEach(b => {
          b.classList.remove('border-royal-slate-blue', 'text-royal-slate-blue');
          b.classList.add('border-transparent', 'text-slate-500');
        });
        e.currentTarget.classList.remove('border-transparent', 'text-slate-500');
        e.currentTarget.classList.add('border-royal-slate-blue', 'text-royal-slate-blue');
        renderTabContent();
      }
    });
  });

  // Initial load
  renderTabContent();
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
