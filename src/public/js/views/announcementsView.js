// Dedicated Announcements View Renderer (Forge Platform Theme)
import { openModal, closeModal } from '../components/modal.js';
import { showConfirmDialog } from '../components/confirmDialog.js';
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementAsRead,
  markAllAnnouncementsAsRead
} from '../services/api.js';

let filterState = {
  category: 'ALL',
  priority: 'ALL',
  search: ''
};

export function renderAnnouncementsView(state) {
  const { announcementsData = [], currentUser } = state;
  const announcements = Array.isArray(announcementsData) ? announcementsData : [];

  const userRole = currentUser ? (currentUser.public_role || currentUser.role) : 'member';
  const isLeaderOrTeacher = ['leader', 'teacher', 'admin', 'DEV_STEALTH', 'STUDENT_LEADER', 'TEACHER'].includes(currentUser ? currentUser.role : '') || ['leader', 'teacher', 'admin', 'STUDENT_LEADER', 'TEACHER'].includes(userRole);

  // Filter items
  const filtered = announcements.filter(a => {
    if (filterState.category !== 'ALL' && (a.category || 'General').toLowerCase() !== filterState.category.toLowerCase()) {
      return false;
    }
    if (filterState.priority !== 'ALL' && (a.priority || 'normal').toLowerCase() !== filterState.priority.toLowerCase()) {
      return false;
    }
    if (filterState.search) {
      const q = filterState.search.toLowerCase();
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchContent = (a.content || '').toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    return true;
  });

  const unreadCount = announcements.filter(a => !a.is_read).length;
  const pinnedList = filtered.filter(a => a.pinned);
  const regularList = filtered.filter(a => !a.pinned);

  const categories = ['ALL', 'General', 'Academic', 'Emergency', 'Hackathons', 'Community'];

  return `
    <div class="space-y-8 max-w-6xl mx-auto">
      
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-royal-slate-blue/20 text-royal-slate-blue border border-royal-slate-blue/40 accent-target">
              Forge System Broadcasts
            </span>
            ${unreadCount > 0 ? `
              <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                ${unreadCount} Unread
              </span>
            ` : ''}
          </div>
          <h1 class="text-3xl font-black text-white uppercase tracking-tight mt-1">Announcements & Notices</h1>
          <p class="text-xs text-outline mt-1 max-w-2xl">
            Official community broadcasts, emergency alerts, hackathon updates, and academic notifications.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          ${unreadCount > 0 ? `
            <button id="btnMarkAllRead" class="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-sm text-emerald-400">done_all</span>
              Mark All as Read
            </button>
          ` : ''}

          ${isLeaderOrTeacher ? `
            <button id="btnCreateAnnouncement" class="px-4 py-2 bg-royal-slate-blue hover:bg-royal-slate-blue/80 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-sm">campaign</span>
              Post Announcement
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-4">
        
        <!-- Category Tab Bar -->
        <div class="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          ${categories.map(cat => {
            const isActive = filterState.category.toUpperCase() === cat.toUpperCase();
            return `
              <button class="btn-category-tab px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-royal-slate-blue text-white shadow-lg' : 'bg-white/5 text-outline hover:text-white hover:bg-white/10 border border-white/5'}" data-category="${cat}">
                ${cat}
              </button>
            `;
          }).join('')}
        </div>

        <div class="flex flex-col md:flex-row gap-3 items-center justify-between">
          <!-- Search Input -->
          <div class="relative w-full md:w-80">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-outline text-sm">search</span>
            <input type="text" id="announcementSearchInput" placeholder="Search broadcasts by title or content..." value="${escapeHtml(filterState.search)}"
              class="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-outline focus:outline-none focus:border-royal-slate-blue" />
          </div>

          <!-- Priority Filter -->
          <div class="flex items-center gap-2 w-full md:w-auto">
            <span class="text-xs text-outline font-semibold">Priority:</span>
            <select id="announcementPrioritySelect" class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-royal-slate-blue">
              <option value="ALL" ${filterState.priority === 'ALL' ? 'selected' : ''}>All Priorities</option>
              <option value="normal" ${filterState.priority === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="high" ${filterState.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="urgent" ${filterState.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Announcements Content Grid -->
      <div class="space-y-6">
        
        <!-- Pinned Section -->
        ${pinnedList.length > 0 ? `
          <div class="space-y-3">
            <h3 class="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">push_pin</span> Pinned Announcements
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${pinnedList.map(a => renderAnnouncementCard(a, isLeaderOrTeacher)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Regular Broadcasts Section -->
        <div class="space-y-3">
          ${pinnedList.length > 0 ? `
            <h3 class="text-xs font-black text-white/80 uppercase tracking-wider flex items-center gap-1.5 pt-2">
              <span class="material-symbols-outlined text-sm">campaign</span> All Broadcasts
            </h3>
          ` : ''}

          ${filtered.length === 0 ? `
            <div class="glass-card p-12 rounded-2xl text-center space-y-2">
              <span class="material-symbols-outlined text-4xl text-outline">notifications_off</span>
              <p class="text-sm font-bold text-white">No announcements found</p>
              <p class="text-xs text-outline max-w-md mx-auto">There are currently no announcements matching your filter selection.</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${regularList.map(a => renderAnnouncementCard(a, isLeaderOrTeacher)).join('')}
            </div>
          `}
        </div>

      </div>

    </div>
  `;
}

function getPriorityBadgeClass(priority) {
  switch ((priority || 'normal').toLowerCase()) {
    case 'urgent':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse font-black';
    case 'high':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold';
    case 'normal':
    default:
      return 'bg-sky-500/20 text-sky-400 border-sky-500/30 font-bold';
  }
}

function getCategoryBadgeClass(category) {
  switch ((category || 'General').toLowerCase()) {
    case 'emergency':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    case 'academic':
      return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    case 'hackathons':
      return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
    case 'community':
      return 'bg-teal-500/10 text-teal-300 border-teal-500/20';
    case 'general':
    default:
      return 'bg-white/5 text-white/80 border-white/10';
  }
}

function renderAnnouncementCard(a, isLeaderOrTeacher) {
  const isUnread = !a.is_read;
  const isUrgent = (a.priority || '').toLowerCase() === 'urgent';
  const priorityClass = getPriorityBadgeClass(a.priority);
  const categoryClass = getCategoryBadgeClass(a.category);

  return `
    <div class="announcement-card glass-card p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${isUrgent ? 'border-rose-500/40 shadow-rose-950/20 bg-rose-950/10' : a.pinned ? 'border-amber-400/40 bg-amber-400/5' : 'border-white/10 hover:border-royal-slate-blue/40'} ${isUnread ? 'ring-1 ring-royal-slate-blue' : ''}" data-id="${a.id}">
      
      <div class="space-y-3">
        <!-- Badges Row -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            ${a.pinned ? `
              <span class="px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">push_pin</span> Pinned
              </span>
            ` : ''}

            <span class="px-2.5 py-0.5 text-[10px] uppercase rounded-full border ${priorityClass}">
              ${escapeHtml(a.priority || 'normal')}
            </span>

            <span class="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${categoryClass}">
              ${escapeHtml(a.category || 'General')}
            </span>
          </div>

          ${isUnread ? `
            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-royal-slate-blue text-white uppercase tracking-wider flex items-center gap-1 shadow">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> UNREAD
            </span>
          ` : `
            <span class="text-[10px] text-outline flex items-center gap-1">
              <span class="material-symbols-outlined text-xs text-emerald-400">check_circle</span> Read
            </span>
          `}
        </div>

        <!-- Title & Content Preview -->
        <div>
          <h3 class="text-lg font-bold text-white leading-snug hover:text-royal-slate-blue transition-colors cursor-pointer btn-view-announcement" data-id="${a.id}">
            ${escapeHtml(a.title)}
          </h3>
          <p class="text-xs text-white/80 mt-1 line-clamp-3 leading-relaxed">
            ${escapeHtml(a.content)}
          </p>
        </div>

        <!-- Meta Author & Date -->
        <div class="pt-2 border-t border-white/5 text-[11px] text-outline flex items-center justify-between">
          <span>Author: <strong class="text-white">${escapeHtml(a.author_name || 'System Admin')}</strong></span>
          <span>${new Date(a.created_at).toLocaleString()}</span>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <button class="btn-view-announcement px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1 cursor-pointer" data-id="${a.id}">
          <span class="material-symbols-outlined text-sm">visibility</span> View Full Broadcast
        </button>

        ${isLeaderOrTeacher ? `
          <div class="flex items-center gap-1">
            <button class="btn-edit-announcement p-1.5 bg-white/5 hover:bg-white/15 text-outline hover:text-white rounded-xl transition-all cursor-pointer" data-id="${a.id}" title="Edit Announcement">
              <span class="material-symbols-outlined text-base">edit</span>
            </button>
            <button class="btn-delete-announcement p-1.5 bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 rounded-xl transition-all cursor-pointer" data-id="${a.id}" title="Delete Announcement">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        ` : ''}
      </div>

    </div>
  `;
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

export function attachAnnouncementsEvents(state, refreshData) {
  // Category tabs handler
  document.querySelectorAll('.btn-category-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterState.category = e.currentTarget.getAttribute('data-category');
      renderAndReattach(state, refreshData);
    });
  });

  // Priority select handler
  const prioSelect = document.getElementById('announcementPrioritySelect');
  if (prioSelect) {
    prioSelect.addEventListener('change', (e) => {
      filterState.priority = e.target.value;
      renderAndReattach(state, refreshData);
    });
  }

  // Search input handler
  const searchInput = document.getElementById('announcementSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterState.search = e.target.value;
      renderAndReattach(state, refreshData);
    });
  }

  // Mark all read button handler
  const btnMarkAll = document.getElementById('btnMarkAllRead');
  if (btnMarkAll) {
    btnMarkAll.addEventListener('click', async () => {
      try {
        await markAllAnnouncementsAsRead();
        refreshData();
      } catch (err) {
        console.error('Failed to mark all announcements read:', err);
      }
    });
  }

  // Create Announcement button handler
  const btnCreate = document.getElementById('btnCreateAnnouncement');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      openAnnouncementFormModal(null, refreshData);
    });
  }

  // View Announcement detail handler (marks as read & opens modal)
  document.querySelectorAll('.btn-view-announcement').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      try {
        await markAnnouncementAsRead(id);
        const announcements = state.announcementsData || [];
        const target = announcements.find(a => a.id === id);
        if (target) {
          target.is_read = true;
          openAnnouncementDetailModal(target, refreshData);
        }
        refreshData();
      } catch (err) {
        console.error('Failed to view announcement:', err);
      }
    });
  });

  // Edit Announcement handler
  document.querySelectorAll('.btn-edit-announcement').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const announcements = state.announcementsData || [];
      const target = announcements.find(a => a.id === id);
      if (target) {
        openAnnouncementFormModal(target, refreshData);
      }
    });
  });

  // Delete Announcement handler
  document.querySelectorAll('.btn-delete-announcement').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const confirmed = await showConfirmDialog({
        title: 'Delete Announcement?',
        message: 'Are you sure you want to delete this broadcast? This action cannot be undone.',
        confirmText: 'Delete',
        danger: true
      });
      if (confirmed) {
        try {
          await deleteAnnouncement(id);
          refreshData();
        } catch (err) {
          console.error('Error deleting announcement:', err);
        }
      }
    });
  });
}

function renderAndReattach(state, refreshData) {
  const container = document.getElementById('viewContent');
  if (container) {
    container.innerHTML = renderAnnouncementsView(state);
    attachAnnouncementsEvents(state, refreshData);
  }
}

// Open Announcement Detail Modal
export function openAnnouncementDetailModal(announcement, refreshData) {
  const isUrgent = (announcement.priority || '').toLowerCase() === 'urgent';
  const priorityClass = getPriorityBadgeClass(announcement.priority);
  const categoryClass = getCategoryBadgeClass(announcement.category);

  const contentHtml = `
    <div class="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
      
      <!-- Badges Header -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
        <div class="flex flex-wrap items-center gap-2">
          ${announcement.pinned ? `
            <span class="px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
              <span class="material-symbols-outlined text-[12px]">push_pin</span> Pinned Broadcast
            </span>
          ` : ''}
          <span class="px-2.5 py-0.5 text-[10px] uppercase rounded-full border ${priorityClass}">
            ${escapeHtml(announcement.priority || 'normal')}
          </span>
          <span class="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${categoryClass}">
            ${escapeHtml(announcement.category || 'General')}
          </span>
        </div>

        <div class="text-[11px] text-outline">
          Author: <strong class="text-white">${escapeHtml(announcement.author_name || 'System Admin')}</strong> • ${new Date(announcement.created_at).toLocaleString()}
        </div>
      </div>

      <!-- Main Content -->
      <div class="p-4 rounded-xl bg-white/5 border border-white/5 whitespace-pre-wrap leading-relaxed text-sm text-white/90">
        ${escapeHtml(announcement.content)}
      </div>

    </div>
  `;

  openModal({
    title: `Broadcast: ${escapeHtml(announcement.title)}`,
    contentHtml,
    onConfirm: async () => {
      closeModal();
      if (refreshData) refreshData();
      return true;
    }
  });
}

// Open Announcement Creation/Editing Form Modal
function openAnnouncementFormModal(announcementToEdit, refreshData) {
  const isEdit = !!announcementToEdit;
  const titleText = isEdit ? `Edit Announcement: ${escapeHtml(announcementToEdit.title)}` : 'Post New System Broadcast';

  const contentHtml = `
    <div class="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label class="block font-bold text-white mb-1">Announcement Title *</label>
        <input type="text" id="annTitle" value="${escapeHtml(announcementToEdit ? announcementToEdit.title : '')}" placeholder="e.g., Annual Hackathon Registration Open"
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-royal-slate-blue focus:outline-none" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-bold text-white mb-1">Category *</label>
          <select id="annCategory" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="General" ${(announcementToEdit ? announcementToEdit.category : 'General') === 'General' ? 'selected' : ''}>General</option>
            <option value="Academic" ${(announcementToEdit ? announcementToEdit.category : '') === 'Academic' ? 'selected' : ''}>Academic</option>
            <option value="Emergency" ${(announcementToEdit ? announcementToEdit.category : '') === 'Emergency' ? 'selected' : ''}>Emergency</option>
            <option value="Hackathons" ${(announcementToEdit ? announcementToEdit.category : '') === 'Hackathons' ? 'selected' : ''}>Hackathons</option>
            <option value="Community" ${(announcementToEdit ? announcementToEdit.category : '') === 'Community' ? 'selected' : ''}>Community</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-white mb-1">Priority Level *</label>
          <select id="annPriority" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="normal" ${(announcementToEdit ? announcementToEdit.priority : 'normal') === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="high" ${(announcementToEdit ? announcementToEdit.priority : '') === 'high' ? 'selected' : ''}>High</option>
            <option value="urgent" ${(announcementToEdit ? announcementToEdit.priority : '') === 'urgent' ? 'selected' : ''}>Urgent (Triggers Immediate Alert)</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
        <input type="checkbox" id="annPinned" class="w-4 h-4 rounded text-amber-400 bg-white/10 border-white/20 focus:ring-amber-400 cursor-pointer" ${announcementToEdit && announcementToEdit.pinned ? 'checked' : ''} />
        <label for="annPinned" class="font-bold text-white cursor-pointer flex items-center gap-1">
          <span class="material-symbols-outlined text-sm text-amber-400">push_pin</span> Pin this announcement to the top of dashboard and broadcast feed
        </label>
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Broadcast Content *</label>
        <textarea id="annContent" rows="5" placeholder="Write announcement details..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">${escapeHtml(announcementToEdit ? announcementToEdit.content : '')}</textarea>
      </div>
    </div>
  `;

  openModal({
    title: titleText,
    contentHtml,
    onConfirm: async (overlay) => {
      const title = overlay.querySelector('#annTitle').value.trim();
      const content = overlay.querySelector('#annContent').value.trim();
      if (!title || !content) {
        alert('Title and content are required.');
        return false;
      }

      const payload = {
        title,
        content,
        category: overlay.querySelector('#annCategory').value,
        priority: overlay.querySelector('#annPriority').value,
        pinned: overlay.querySelector('#annPinned').checked
      };

      try {
        if (isEdit) {
          await updateAnnouncement(announcementToEdit.id, payload);
        } else {
          await createAnnouncement(payload);
        }
        refreshData();
        return true;
      } catch (err) {
        console.error('Error posting announcement:', err);
        alert(err.message || 'Failed to post announcement');
        return false;
      }
    }
  });
}
