// Complete Task System, Subtasks, Submissions & Review System Renderer
import { openModal, closeModal } from '../components/modal.js';
import { showConfirmDialog } from '../components/confirmDialog.js';
import {
  submitTaskProof,
  approveTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  fetchTaskDetails,
  filterTasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  addSubtaskComment,
  fetchAllUsers,
  fetchTaskSubmissions,
  createTaskSubmission,
  resubmitTaskSubmission,
  reviewTaskSubmission,
  createSubmissionReview,
  fetchSubmissionReviews
} from '../services/api.js';

let filterState = {
  search: '',
  status: 'ALL',
  difficulty: 'ALL',
  task_type: 'ALL'
};

let cachedUsersList = [];

export function renderTasksView(state) {
  const { tasksData, currentUser } = state;
  let allTasks = [];

  if (Array.isArray(tasksData)) {
    allTasks = tasksData;
  } else if (tasksData && typeof tasksData === 'object') {
    const teamTasks = tasksData.teamTasks || [];
    const challenges = tasksData.challenges || [];
    const official = tasksData.official || [];
    allTasks = Array.from(new Set([...official, ...teamTasks, ...challenges]));
  }

  const userRole = currentUser ? (currentUser.public_role || currentUser.role) : 'member';
  const isLeaderOrTeacher = ['leader', 'teacher', 'admin', 'DEV_STEALTH', 'STUDENT_LEADER', 'TEACHER'].includes(currentUser ? currentUser.role : '') || ['leader', 'teacher', 'admin', 'STUDENT_LEADER', 'TEACHER'].includes(userRole);

  // Client-side filtering
  const filteredTasks = allTasks.filter(t => {
    if (filterState.status !== 'ALL' && (t.status || '').toLowerCase() !== filterState.status.toLowerCase()) {
      return false;
    }
    if (filterState.difficulty !== 'ALL' && (t.difficulty || 'MEDIUM').toUpperCase() !== filterState.difficulty.toUpperCase()) {
      return false;
    }
    if (filterState.task_type !== 'ALL' && (t.task_type || 'TEAM_TASK').toUpperCase() !== filterState.task_type.toUpperCase()) {
      return false;
    }
    if (filterState.search) {
      const q = filterState.search.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchInst = (t.instructions || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchInst) return false;
    }
    return true;
  });

  const activeCount = allTasks.filter(t => ['active', 'in_progress', 'pending_review', 'pending_approval', 'open'].includes((t.status || '').toLowerCase())).length;
  const completedCount = allTasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
  const draftCount = allTasks.filter(t => (t.status || '').toLowerCase() === 'draft').length;

  return `
    <div class="space-y-8 max-w-6xl mx-auto">

      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-royal-slate-blue/20 text-royal-slate-blue border border-royal-slate-blue/40 accent-target">
              Forge Mission Control
            </span>
          </div>
          <h1 class="text-3xl font-black text-white uppercase tracking-tight mt-1">Task & Review Engine</h1>
          <p class="text-xs text-outline mt-1 max-w-2xl">
            Objectives, subtasks, submissions, private reviews, ratings, improvement feedback, and automated XP rewards.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold">
            ${activeCount} Active
          </span>
          <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
            ${completedCount} Completed
          </span>
          ${draftCount > 0 ? `
            <span class="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
              ${draftCount} Drafts
            </span>
          ` : ''}

          ${isLeaderOrTeacher ? `
            <button id="btnCreateTask" class="px-4 py-2 bg-royal-slate-blue hover:bg-royal-slate-blue/80 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 ml-2">
              <span class="material-symbols-outlined text-sm">add_task</span>
              Create Task
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
        <div class="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          <!-- Search Input -->
          <div class="relative w-full md:w-80">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-outline text-sm">search</span>
            <input type="text" id="taskSearchInput" placeholder="Search tasks by title, brief, or keywords..." value="${escapeHtml(filterState.search)}"
              class="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-outline focus:outline-none focus:border-royal-slate-blue" />
          </div>

          <!-- Dropdown Filters -->
          <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            <!-- Status Filter -->
            <select id="filterStatusSelect" class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-royal-slate-blue">
              <option value="ALL" ${filterState.status === 'ALL' ? 'selected' : ''}>Status: All</option>
              <option value="draft" ${filterState.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="active" ${filterState.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="in_progress" ${filterState.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="pending_review" ${filterState.status === 'pending_review' ? 'selected' : ''}>Pending Review</option>
              <option value="completed" ${filterState.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="archived" ${filterState.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>

            <!-- Difficulty Filter -->
            <select id="filterDifficultySelect" class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-royal-slate-blue">
              <option value="ALL" ${filterState.difficulty === 'ALL' ? 'selected' : ''}>Difficulty: All</option>
              <option value="EASY" ${filterState.difficulty === 'EASY' ? 'selected' : ''}>Easy</option>
              <option value="MEDIUM" ${filterState.difficulty === 'MEDIUM' ? 'selected' : ''}>Medium</option>
              <option value="HARD" ${filterState.difficulty === 'HARD' ? 'selected' : ''}>Hard</option>
              <option value="EXPERT" ${filterState.difficulty === 'EXPERT' ? 'selected' : ''}>Expert</option>
            </select>

            <!-- Task Type Filter -->
            <select id="filterTaskTypeSelect" class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-royal-slate-blue">
              <option value="ALL" ${filterState.task_type === 'ALL' ? 'selected' : ''}>Type: All</option>
              <option value="TEAM_TASK" ${filterState.task_type === 'TEAM_TASK' ? 'selected' : ''}>Team Task</option>
              <option value="CHALLENGE" ${filterState.task_type === 'CHALLENGE' ? 'selected' : ''}>Challenge</option>
            </select>

            ${(filterState.search || filterState.status !== 'ALL' || filterState.difficulty !== 'ALL' || filterState.task_type !== 'ALL') ? `
              <button id="btnResetFilters" class="px-3 py-2 text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">restart_alt</span> Reset
              </button>
            ` : ''}

          </div>
        </div>
      </div>

      <!-- Tasks Grid -->
      <div class="space-y-4">
        ${filteredTasks.length === 0 ? `
          <div class="glass-card p-12 rounded-2xl text-center space-y-2">
            <span class="material-symbols-outlined text-4xl text-outline">assignment_late</span>
            <p class="text-sm font-bold text-white">No tasks match your filters</p>
            <p class="text-xs text-outline max-w-md mx-auto">Try clearing search terms or status filters to see existing community objectives.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${filteredTasks.map(t => renderTaskCard(t, isLeaderOrTeacher)).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

function getDifficultyBadgeClass(difficulty) {
  switch ((difficulty || 'MEDIUM').toUpperCase()) {
    case 'EASY':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'HARD':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'EXPERT':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case 'MEDIUM':
    default:
      return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  }
}

function getPriorityBadgeClass(priority) {
  switch ((priority || 'medium').toLowerCase()) {
    case 'critical':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case 'high':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'low':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    case 'medium':
    default:
      return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  }
}

function getStatusBadgeClass(status) {
  switch ((status || 'active').toLowerCase()) {
    case 'completed':
    case 'approved':
    case 'done':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pending_review':
    case 'under_review':
    case 'pending_approval':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'revision_requested':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'rejected':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case 'in_progress':
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    case 'draft':
    case 'todo':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    case 'archived':
      return 'bg-rose-900/30 text-rose-300 border-rose-700/30';
    case 'active':
    case 'open':
    default:
      return 'bg-royal-slate-blue/20 text-royal-slate-blue border-royal-slate-blue/40';
  }
}

function renderTaskCard(t, isLeaderOrTeacher) {
  const status = (t.status || 'active').toLowerCase();
  const diffClass = getDifficultyBadgeClass(t.difficulty);
  const statusClass = getStatusBadgeClass(t.status);

  const progressPct = t.progress_percentage !== undefined ? t.progress_percentage : (t.subtask_summary ? t.subtask_summary.percentage : 0);
  const subtaskSummary = t.subtask_summary || { total: 0, completed: 0 };

  return `
    <div class="glass-card p-6 rounded-2xl space-y-4 border border-white/10 hover:border-royal-slate-blue/40 transition-all flex flex-col justify-between">
      <div class="space-y-3">
        
        <!-- Header Badges -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2.5 py-0.5 text-[10px] font-black rounded uppercase border ${statusClass}">
              ${escapeHtml(status.replace('_', ' '))}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-black rounded uppercase border ${diffClass}">
              ${escapeHtml(t.difficulty || 'MEDIUM')}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-extrabold rounded bg-white/5 text-outline uppercase border border-white/10">
              ${escapeHtml(t.task_type || 'TEAM_TASK')}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-white bg-white/10 px-2.5 py-1 rounded-xl border border-white/10">
              ${t.total_points || 50} PTS
            </span>
            ${t.xp_reward ? `
              <span class="text-xs font-black text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/20">
                +${t.xp_reward} XP
              </span>
            ` : ''}
          </div>
        </div>

        <!-- Task Title & Description -->
        <div>
          <h3 class="text-lg font-bold text-white leading-snug hover:text-royal-slate-blue transition-colors cursor-pointer btn-view-details" data-id="${t.id}">
            ${escapeHtml(t.title)}
          </h3>
          <p class="text-xs text-outline mt-1 line-clamp-3 leading-relaxed">
            ${escapeHtml(t.description)}
          </p>
        </div>

        <!-- Dynamic Subtasks Progress Bar -->
        <div class="pt-1">
          <div class="flex justify-between items-center text-[11px] mb-1">
            <span class="text-outline font-semibold">Subtasks Progress</span>
            <span class="text-emerald-400 font-bold">${progressPct}% ${subtaskSummary.total > 0 ? `(${subtaskSummary.completed}/${subtaskSummary.total} Done)` : ''}</span>
          </div>
          <div class="w-full bg-white/10 h-2 rounded-full overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
          </div>
        </div>

        <!-- Meta info -->
        <div class="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-outline">
          <div>
            <span class="block font-semibold">Scope / Assigned:</span>
            <span class="text-white font-medium">${escapeHtml(t.assigned_team_name ? `Squad: ${t.assigned_team_name}` : t.assigned_user_name ? `User: ${t.assigned_user_name}` : 'Open Objective')}</span>
          </div>
          <div>
            <span class="block font-semibold">Deadline:</span>
            <span class="text-white font-medium">${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No hard deadline'}</span>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
        <button class="btn-view-details px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition-all" data-id="${t.id}">
          View Details & Submissions
        </button>

        <div class="flex flex-wrap items-center gap-1.5">
          ${status !== 'completed' && status !== 'archived' ? `
            <button class="btn-submit-task px-3 py-1.5 bg-royal-slate-blue hover:bg-royal-slate-blue/80 text-white font-bold text-xs rounded-xl transition-all" data-id="${t.id}">
              Submit Proof
            </button>
          ` : ''}

          ${isLeaderOrTeacher ? `
            <button class="btn-edit-task p-1.5 bg-white/5 hover:bg-white/15 text-outline hover:text-white rounded-xl transition-all" data-id="${t.id}" title="Edit Task">
              <span class="material-symbols-outlined text-base">edit</span>
            </button>
            <button class="btn-delete-task p-1.5 bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 rounded-xl transition-all" data-id="${t.id}" title="Delete Task">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          ` : ''}
        </div>
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

export function attachTasksEvents(state, refreshData) {
  const currentUserId = state.currentUser ? state.currentUser.id : null;

  // Filter change handlers
  const searchInput = document.getElementById('taskSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterState.search = e.target.value;
      renderAndReattach(state, refreshData);
    });
  }

  const statusSelect = document.getElementById('filterStatusSelect');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      filterState.status = e.target.value;
      renderAndReattach(state, refreshData);
    });
  }

  const diffSelect = document.getElementById('filterDifficultySelect');
  if (diffSelect) {
    diffSelect.addEventListener('change', (e) => {
      filterState.difficulty = e.target.value;
      renderAndReattach(state, refreshData);
    });
  }

  const typeSelect = document.getElementById('filterTaskTypeSelect');
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      filterState.task_type = e.target.value;
      renderAndReattach(state, refreshData);
    });
  }

  const btnReset = document.getElementById('btnResetFilters');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      filterState = { search: '', status: 'ALL', difficulty: 'ALL', task_type: 'ALL' };
      renderAndReattach(state, refreshData);
    });
  }

  // Create Task button handler
  const btnCreate = document.getElementById('btnCreateTask');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      openTaskFormModal(null, refreshData);
    });
  }

  // View Details handler
  document.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      try {
        const res = await fetchTaskDetails(taskId);
        if (res && res.task) {
          openTaskDetailModal(res.task, state, refreshData);
        }
      } catch (err) {
        console.error('Error fetching task details:', err);
      }
    });
  });

  // Edit Task handler
  document.querySelectorAll('.btn-edit-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      try {
        const res = await fetchTaskDetails(taskId);
        if (res && res.task) {
          openTaskFormModal(res.task, refreshData);
        }
      } catch (err) {
        console.error('Error fetching task for edit:', err);
      }
    });
  });

  // Delete Task handler
  document.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      const confirmed = await showConfirmDialog({
        title: 'Delete Task?',
        message: 'Are you sure you want to permanently delete this task? This action cannot be undone.',
        confirmText: 'Delete',
        danger: true
      });
      if (confirmed) {
        try {
          await deleteTask(taskId);
          refreshData();
        } catch (err) {
          console.error('Error deleting task:', err);
        }
      }
    });
  });

  // Submit Proof handler (Opens Multi-Proof Modal)
  document.querySelectorAll('.btn-submit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      openMultiProofSubmissionModal(taskId, false, null, state, refreshData);
    });
  });
}

function renderAndReattach(state, refreshData) {
  const container = document.getElementById('viewContent');
  if (container) {
    container.innerHTML = renderTasksView(state);
    attachTasksEvents(state, refreshData);
  }
}

// Open Task Form Modal (Create or Edit Parent Task)
function openTaskFormModal(taskToEdit, refreshData) {
  const isEdit = !!taskToEdit;
  const titleText = isEdit ? `Edit Task: ${escapeHtml(taskToEdit.title)}` : 'Create New Task & Mission';

  const contentHtml = `
    <div class="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label class="block font-bold text-white mb-1">Task Title *</label>
        <input type="text" id="formTitle" value="${escapeHtml(taskToEdit ? taskToEdit.title : '')}" placeholder="e.g., Build Authentication Microservice"
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-royal-slate-blue focus:outline-none" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block font-bold text-white mb-1">Difficulty</label>
          <select id="formDifficulty" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="EASY" ${(taskToEdit ? taskToEdit.difficulty : '') === 'EASY' ? 'selected' : ''}>Easy</option>
            <option value="MEDIUM" ${(taskToEdit ? taskToEdit.difficulty : 'MEDIUM') === 'MEDIUM' ? 'selected' : ''}>Medium</option>
            <option value="HARD" ${(taskToEdit ? taskToEdit.difficulty : '') === 'HARD' ? 'selected' : ''}>Hard</option>
            <option value="EXPERT" ${(taskToEdit ? taskToEdit.difficulty : '') === 'EXPERT' ? 'selected' : ''}>Expert</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-white mb-1">Task Type</label>
          <select id="formTaskType" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="TEAM_TASK" ${(taskToEdit ? taskToEdit.task_type : 'TEAM_TASK') === 'TEAM_TASK' ? 'selected' : ''}>Team Task</option>
            <option value="CHALLENGE" ${(taskToEdit ? taskToEdit.task_type : '') === 'CHALLENGE' ? 'selected' : ''}>Challenge</option>
          </select>
        </div>
        <div>
          <label class="block font-bold text-white mb-1">Status</label>
          <select id="formStatus" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="active" ${(taskToEdit ? taskToEdit.status : 'active') === 'active' ? 'selected' : ''}>Active</option>
            <option value="draft" ${(taskToEdit ? taskToEdit.status : '') === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="in_progress" ${(taskToEdit ? taskToEdit.status : '') === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="pending_review" ${(taskToEdit ? taskToEdit.status : '') === 'pending_review' ? 'selected' : ''}>Pending Review</option>
            <option value="completed" ${(taskToEdit ? taskToEdit.status : '') === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="archived" ${(taskToEdit ? taskToEdit.status : '') === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block font-bold text-white mb-1">Points Reward</label>
          <input type="number" id="formTotalPoints" value="${taskToEdit ? (taskToEdit.total_points || 50) : 50}"
            class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" />
        </div>
        <div>
          <label class="block font-bold text-white mb-1">XP Reward</label>
          <input type="number" id="formXpReward" value="${taskToEdit ? (taskToEdit.xp_reward || 0) : 100}"
            class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" />
        </div>
        <div>
          <label class="block font-bold text-white mb-1">Badge Reward</label>
          <input type="text" id="formBadgeReward" value="${escapeHtml(taskToEdit ? taskToEdit.badge_reward || '' : '')}" placeholder="e.g. Master Coder"
            class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" />
        </div>
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Deadline Date & Time</label>
        <input type="datetime-local" id="formDeadline" value="${taskToEdit && taskToEdit.deadline ? new Date(taskToEdit.deadline).toISOString().slice(0, 16) : ''}"
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" />
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Description / Summary *</label>
        <textarea id="formDescription" rows="2" placeholder="Brief summary of task objectives..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">${escapeHtml(taskToEdit ? taskToEdit.description : '')}</textarea>
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Detailed Instructions</label>
        <textarea id="formInstructions" rows="3" placeholder="Step-by-step instructions and technical details..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">${escapeHtml(taskToEdit ? taskToEdit.instructions || '' : '')}</textarea>
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Resource Attachments & Links</label>
        <textarea id="formResources" rows="2" placeholder="Resource URLs or links (newline separated)..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">${escapeHtml(taskToEdit ? taskToEdit.resources || '' : '')}</textarea>
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Proof & Verification Requirements</label>
        <textarea id="formProofRequirements" rows="2" placeholder="Specify required deliverables (e.g. GitHub PR link, demo video, test coverage report)..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">${escapeHtml(taskToEdit ? taskToEdit.proof_requirements || '' : '')}</textarea>
      </div>
    </div>
  `;

  openModal({
    title: titleText,
    contentHtml,
    onConfirm: async (overlay) => {
      const title = overlay.querySelector('#formTitle').value.trim();
      const description = overlay.querySelector('#formDescription').value.trim();
      if (!title || !description) {
        alert('Title and description are required.');
        return false;
      }

      const payload = {
        title,
        description,
        difficulty: overlay.querySelector('#formDifficulty').value,
        task_type: overlay.querySelector('#formTaskType').value,
        status: overlay.querySelector('#formStatus').value,
        total_points: parseInt(overlay.querySelector('#formTotalPoints').value) || 50,
        xp_reward: parseInt(overlay.querySelector('#formXpReward').value) || 0,
        badge_reward: overlay.querySelector('#formBadgeReward').value.trim() || null,
        deadline: overlay.querySelector('#formDeadline').value || null,
        instructions: overlay.querySelector('#formInstructions').value.trim() || null,
        resources: overlay.querySelector('#formResources').value.trim() || null,
        proof_requirements: overlay.querySelector('#formProofRequirements').value.trim() || null
      };

      try {
        if (isEdit) {
          await updateTask(taskToEdit.id, payload);
        } else {
          await createTask(payload);
        }
        refreshData();
        return true;
      } catch (err) {
        console.error('Error saving task:', err);
        return false;
      }
    }
  });
}

// Open Detailed Task View Modal (with Subtasks, Submissions & Review Evaluations)
async function openTaskDetailModal(task, state, refreshData) {
  const userRole = state.currentUser ? (state.currentUser.public_role || state.currentUser.role) : 'member';
  const isLeaderOrTeacher = ['leader', 'teacher', 'admin', 'DEV_STEALTH', 'STUDENT_LEADER', 'TEACHER'].includes(state.currentUser ? state.currentUser.role : '') || ['leader', 'teacher', 'admin', 'STUDENT_LEADER', 'TEACHER'].includes(userRole);

  // Fetch users for dropdowns
  if (cachedUsersList.length === 0) {
    try {
      const userRes = await fetchAllUsers();
      if (userRes && Array.isArray(userRes.users)) {
        cachedUsersList = userRes.users;
      } else if (Array.isArray(userRes)) {
        cachedUsersList = userRes;
      }
    } catch (_) {}
  }

  // Fetch submission versions history and their reviews
  let submissionHistory = [];
  try {
    const subRes = await fetchTaskSubmissions(task.id);
    if (subRes && Array.isArray(subRes.submissions)) {
      submissionHistory = await Promise.all(subRes.submissions.map(async (sub) => {
        try {
          const revRes = await fetchSubmissionReviews(sub.id);
          return { ...sub, reviews: (revRes && Array.isArray(revRes.reviews)) ? revRes.reviews : [] };
        } catch (_) {
          return { ...sub, reviews: [] };
        }
      }));
    }
  } catch (_) {}

  const latestSub = submissionHistory.length > 0 ? submissionHistory[0] : null;
  const isRevisionRequested = latestSub && (latestSub.status || '').toLowerCase() === 'revision_requested';

  const renderModalContent = (t) => {
    const status = (t.status || 'active').toLowerCase();
    const statusClass = getStatusBadgeClass(t.status);
    const diffClass = getDifficultyBadgeClass(t.difficulty);

    const subtasks = t.subtasks || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(s => (s.status || '').toLowerCase() === 'done' || s.is_completed === 1).length;
    const progressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    // Format resource links
    let resourcesHtml = '<p class="text-outline italic">No resources attached.</p>';
    if (t.resources) {
      const lines = t.resources.split('\n').map(l => l.trim()).filter(Boolean);
      resourcesHtml = `
        <ul class="space-y-1.5">
          ${lines.map(res => {
            const isUrl = res.startsWith('http://') || res.startsWith('https://') || res.startsWith('/');
            if (isUrl) {
              return `
                <li class="flex items-center gap-1.5 text-royal-slate-blue hover:underline">
                  <span class="material-symbols-outlined text-sm">link</span>
                  <a href="${escapeHtml(res)}" target="_blank" rel="noopener noreferrer" class="break-all font-semibold">${escapeHtml(res)}</a>
                </li>
              `;
            }
            return `
              <li class="flex items-center gap-1.5 text-white/90">
                <span class="material-symbols-outlined text-sm text-outline">description</span>
                <span>${escapeHtml(res)}</span>
              </li>
            `;
          }).join('')}
        </ul>
      `;
    }

    // Submissions & Version History Timeline HTML
    let submissionsHtml = '<p class="text-outline italic">No submissions recorded yet for this objective.</p>';
    if (submissionHistory.length > 0) {
      submissionsHtml = `
        <div class="space-y-3">
          ${submissionHistory.map(sub => {
            const subStatusClass = getStatusBadgeClass(sub.status);
            const attachments = sub.attachments || [];
            const reviews = sub.reviews || [];

            return `
              <div class="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
                
                <!-- Version Header -->
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-royal-slate-blue/30 text-royal-slate-blue border border-royal-slate-blue/40">
                      Version ${sub.version || 1}
                    </span>
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${subStatusClass}">
                      ${escapeHtml((sub.status || 'submitted').replace('_', ' '))}
                    </span>
                  </div>

                  <div class="text-[11px] text-outline">
                    Submitter: <strong class="text-white">${escapeHtml(sub.submitter_name || 'Member')}</strong> • ${new Date(sub.created_at).toLocaleString()}
                  </div>
                </div>

                <!-- Proof Notes -->
                ${sub.proof_notes ? `
                  <div>
                    <span class="block text-[11px] font-semibold text-ice-blue">Deliverable Notes:</span>
                    <p class="text-white/90 text-xs mt-0.5 leading-relaxed bg-white/5 p-2.5 rounded-lg">${escapeHtml(sub.proof_notes)}</p>
                  </div>
                ` : ''}

                <!-- Attachments Breakdown -->
                ${attachments.length > 0 ? `
                  <div class="space-y-1">
                    <span class="block text-[11px] font-semibold text-ice-blue">Deliverable Proof Attachments (${attachments.length}):</span>
                    <div class="space-y-1.5 pl-1">
                      ${attachments.map(att => {
                        const attType = (att.attachment_type || 'text').toLowerCase();
                        if (attType === 'link' || att.content.startsWith('http://') || att.content.startsWith('https://')) {
                          return `
                            <div class="flex items-center gap-1.5 text-emerald-400 hover:underline">
                              <span class="material-symbols-outlined text-sm">link</span>
                              <a href="${escapeHtml(att.content)}" target="_blank" class="break-all font-semibold text-xs">${escapeHtml(att.file_name || att.content)}</a>
                            </div>
                          `;
                        }
                        if (attType === 'file') {
                          return `
                            <div class="flex items-center gap-1.5 text-purple-400 hover:underline">
                              <span class="material-symbols-outlined text-sm">attach_file</span>
                              <a href="${escapeHtml(att.content)}" target="_blank" class="break-all font-semibold text-xs">${escapeHtml(att.file_name || 'Attached File')}</a>
                            </div>
                          `;
                        }
                        return `
                          <div class="flex items-start gap-1.5 text-white/90">
                            <span class="material-symbols-outlined text-sm text-outline mt-0.5">description</span>
                            <span class="break-all">${escapeHtml(att.content)}</span>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- Detailed Reviews & Private Feedback Section -->
                ${reviews.length > 0 ? `
                  <div class="space-y-2 pt-2 border-t border-white/5">
                    <span class="block text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <span class="material-symbols-outlined text-xs">rate_review</span> Private Evaluation & Feedback (${reviews.length})
                    </span>
                    <div class="space-y-2">
                      ${reviews.map(rev => {
                        const revStatusClass = getStatusBadgeClass(rev.status);
                        const ratingStars = '★'.repeat(rev.rating || 5) + '☆'.repeat(5 - (rev.rating || 5));

                        return `
                          <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
                            <div class="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/5 pb-1">
                              <div class="flex items-center gap-2">
                                <span class="font-bold text-amber-300">${ratingStars} (${rev.rating || 5}/5)</span>
                                <span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase border ${revStatusClass}">
                                  ${escapeHtml((rev.status || 'approved').replace('_', ' '))}
                                </span>
                              </div>
                              <div class="text-[10px] text-outline">
                                Evaluator: <strong class="text-white">${escapeHtml(rev.reviewer_name || 'Reviewer')}</strong> • ${new Date(rev.created_at).toLocaleString()}
                              </div>
                            </div>

                            ${rev.comments ? `
                              <div>
                                <span class="block text-[10px] font-semibold text-white/70">Written Evaluation Comments:</span>
                                <p class="text-white/90 mt-0.5 leading-relaxed bg-white/5 p-2 rounded-lg">${escapeHtml(rev.comments)}</p>
                              </div>
                            ` : ''}

                            ${rev.suggestions ? `
                              <div class="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-200">
                                <span class="font-bold text-sky-400 flex items-center gap-1 text-[11px]">
                                  <span class="material-symbols-outlined text-xs">lightbulb</span> Constructive Suggestions:
                                </span>
                                <p class="mt-0.5 leading-relaxed text-white/90">${escapeHtml(rev.suggestions)}</p>
                              </div>
                            ` : ''}

                            ${rev.improvements ? `
                              <div class="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200">
                                <span class="font-bold text-purple-400 flex items-center gap-1 text-[11px]">
                                  <span class="material-symbols-outlined text-xs">trending_up</span> Areas for Improvement:
                                </span>
                                <p class="mt-0.5 leading-relaxed text-white/90">${escapeHtml(rev.improvements)}</p>
                              </div>
                            ` : ''}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                ` : sub.review_notes ? `
                  <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                    <div class="font-bold flex items-center gap-1 text-amber-400">
                      <span class="material-symbols-outlined text-xs">rate_review</span>
                      Reviewer Feedback (${escapeHtml(sub.reviewer_name || 'Reviewer')}):
                    </div>
                    <p class="mt-0.5 leading-relaxed text-white/90">${escapeHtml(sub.review_notes)}</p>
                  </div>
                ` : ''}

                <!-- Review Actions for Leaders/Teachers -->
                ${isLeaderOrTeacher ? `
                  <div class="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                    <span class="text-[10px] font-bold text-outline uppercase tracking-wider">Evaluation & Review Panel:</span>
                    <button class="btn-review-sub px-3 py-1 bg-royal-slate-blue hover:bg-royal-slate-blue/80 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1" data-sub-id="${sub.id}" data-status="approved">
                      <span class="material-symbols-outlined text-xs">rate_review</span> Evaluate & Review Submission
                    </button>
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Subtasks List HTML
    let subtasksListHtml = `
      <div class="text-center p-6 bg-white/5 rounded-xl border border-white/5 text-outline italic">
        No subtasks defined yet for this mission.
      </div>
    `;

    if (subtasks.length > 0) {
      subtasksListHtml = `
        <div class="space-y-2.5">
          ${subtasks.map(st => {
            const isDone = (st.status || '').toLowerCase() === 'done' || st.is_completed === 1;
            const priorityClass = getPriorityBadgeClass(st.priority);
            const commentsCount = (st.comments || []).length;

            return `
              <div class="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isDone ? 'opacity-75' : ''}">
                <div class="flex items-start gap-3 w-full sm:w-auto">
                  <input type="checkbox" data-subtask-id="${st.id}" class="subtask-checkbox mt-1 w-4 h-4 rounded text-emerald-500 bg-white/10 border-white/20 focus:ring-emerald-500 cursor-pointer" ${isDone ? 'checked' : ''} />
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-bold text-sm text-white ${isDone ? 'line-through text-white/60' : ''}">${escapeHtml(st.title)}</span>
                      <span class="px-2 py-0.5 text-[10px] font-black rounded uppercase border ${priorityClass}">
                        ${escapeHtml(st.priority || 'medium')}
                      </span>
                    </div>
                    ${st.description ? `<p class="text-xs text-outline mt-0.5">${escapeHtml(st.description)}</p>` : ''}
                    <div class="flex flex-wrap items-center gap-3 text-[11px] text-outline mt-1.5">
                      <span><strong class="text-white/90">Assigned:</strong> ${escapeHtml(st.assigned_to_name || 'Unassigned')}</span>
                      <span><strong class="text-white/90">Due:</strong> ${st.deadline ? new Date(st.deadline).toLocaleDateString() : 'No deadline'}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-center">
                  <button class="btn-subtask-comment px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white font-semibold flex items-center gap-1 border border-white/10 transition-all" data-subtask-id="${st.id}">
                    <span class="material-symbols-outlined text-xs">chat</span> ${commentsCount}
                  </button>
                  <button class="btn-edit-subtask p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-outline hover:text-white transition-all" data-subtask-id="${st.id}" title="Edit Subtask">
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button class="btn-delete-subtask p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 transition-all" data-subtask-id="${st.id}" title="Delete Subtask">
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-2">
        
        <!-- Top Overview Badges -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div class="flex flex-wrap items-center gap-2">
            <span id="detailStatusBadge" class="px-3 py-1 rounded-xl text-xs font-black uppercase border ${statusClass}">
              ${escapeHtml(status.replace('_', ' '))}
            </span>
            <span class="px-3 py-1 rounded-xl text-xs font-black uppercase border ${diffClass}">
              ${escapeHtml(t.difficulty || 'MEDIUM')}
            </span>
            <span class="px-3 py-1 rounded-xl text-xs font-bold bg-white/5 text-white border border-white/10">
              ${escapeHtml(t.task_type || 'TEAM_TASK')}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-sm font-black text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              ${t.total_points || 50} PTS
            </span>
            ${t.xp_reward ? `
              <span class="text-sm font-black text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                +${t.xp_reward} XP
              </span>
            ` : ''}
          </div>
        </div>

        <!-- REVISION REQUESTED WARNING BANNER -->
        ${isRevisionRequested ? `
          <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div class="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span class="material-symbols-outlined">warning</span>
              <span>Revision Requested by Reviewer</span>
            </div>
            ${latestSub.review_notes ? `
              <p class="text-xs text-white/90 bg-white/5 p-2.5 rounded-xl border border-amber-500/20">
                <strong>Feedback:</strong> ${escapeHtml(latestSub.review_notes)}
              </p>
            ` : ''}
            <button id="btnResubmitVersion" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 mt-2 cursor-pointer">
              <span class="material-symbols-outlined text-sm">published_with_changes</span>
              Resubmit New Deliverable Version (v${(latestSub.version || 1) + 1})
            </button>
          </div>
        ` : ''}

        <!-- SECTION: Subtask Progress & Subtasks List -->
        <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span class="material-symbols-outlined text-emerald-400">checklist</span> Subtasks & Deliverable Breakdown
              </h4>
              <p class="text-[11px] text-outline mt-0.5">Overall Parent Task Completion Progress</p>
            </div>

            <button id="btnAddSubtask" class="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1 self-start sm:self-auto">
              <span class="material-symbols-outlined text-sm">add</span> Add Subtask
            </button>
          </div>

          <!-- Dynamic Progress Bar -->
          <div class="space-y-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-white font-bold">Progress: ${progressPct}%</span>
              <span class="text-emerald-400 font-bold">${completedSubtasks} of ${totalSubtasks} Subtasks Completed</span>
            </div>
            <div class="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
              <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
            </div>
          </div>

          <!-- Subtasks List -->
          ${subtasksListHtml}
        </div>

        <!-- SECTION: Submissions & Deliverable Versions History -->
        <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span class="material-symbols-outlined text-royal-slate-blue">folder_zip</span> Deliverable Submissions & Version History
              </h4>
              <p class="text-[11px] text-outline mt-0.5">Audit log of submitted proofs, attachments, and private review evaluations</p>
            </div>

            <button id="btnOpenSubmitModal" class="px-3 py-1.5 bg-royal-slate-blue hover:bg-royal-slate-blue/80 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1 self-start sm:self-auto">
              <span class="material-symbols-outlined text-sm">upload_file</span>
              Submit Deliverable
            </button>
          </div>

          <!-- Submissions History List -->
          ${submissionsHtml}
        </div>

        <!-- Description & Background -->
        <div class="space-y-1.5">
          <h4 class="text-xs font-bold text-ice-blue uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">info</span> Description & Overview
          </h4>
          <p class="text-white/90 leading-relaxed text-xs p-3 rounded-xl bg-white/5 border border-white/5">
            ${escapeHtml(t.description)}
          </p>
        </div>

        <!-- Detailed Instructions -->
        <div class="space-y-1.5">
          <h4 class="text-xs font-bold text-ice-blue uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">assignment</span> Detailed Instructions
          </h4>
          <div class="text-white/90 leading-relaxed text-xs p-3 rounded-xl bg-white/5 border border-white/5 whitespace-pre-wrap">
            ${t.instructions ? escapeHtml(t.instructions) : '<p class="text-outline italic">No detailed step-by-step instructions provided.</p>'}
          </div>
        </div>

        <!-- Resources & Attachments -->
        <div class="space-y-1.5">
          <h4 class="text-xs font-bold text-ice-blue uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">attach_file</span> Resource Attachments
          </h4>
          <div class="p-3 rounded-xl bg-white/5 border border-white/5">
            ${resourcesHtml}
          </div>
        </div>

        <!-- Proof Requirements -->
        <div class="space-y-1.5">
          <h4 class="text-xs font-bold text-ice-blue uppercase tracking-wider flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">verified_user</span> Proof & Deliverable Requirements
          </h4>
          <div class="text-white/90 leading-relaxed text-xs p-3 rounded-xl bg-white/5 border border-white/5 whitespace-pre-wrap">
            ${t.proof_requirements ? escapeHtml(t.proof_requirements) : '<p class="text-outline italic">Standard deliverable proof (notes/artifacts) required upon completion.</p>'}
          </div>
        </div>

        <!-- State Transition Controls (for Leaders/Admins) -->
        ${isLeaderOrTeacher ? `
          <div class="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Lifecycle Status Control</h4>
            <div class="flex flex-wrap items-center gap-2">
              ${renderStatusTransitionButtons(t)}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  };

  openModal({
    title: `Task Details: ${escapeHtml(task.title)}`,
    contentHtml: renderModalContent(task),
    onConfirm: async () => {
      closeModal();
      return true;
    }
  });

  // Attach modal internal events
  attachTaskDetailModalEvents(task, state, refreshData, renderModalContent);
}

function attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent) {
  const overlay = document.getElementById('forgeModalOverlay');
  if (!overlay) return;

  // Resubmit button handler (from Revision Requested Banner)
  const btnResubmit = overlay.querySelector('#btnResubmitVersion');
  if (btnResubmit) {
    btnResubmit.addEventListener('click', () => {
      openMultiProofSubmissionModal(currentTask.id, true, null, state, async () => {
        const res = await fetchTaskDetails(currentTask.id);
        if (res && res.task) {
          currentTask = res.task;
          overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
          attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
        }
        refreshData();
      });
    });
  }

  // Open Submit Deliverable Modal
  const btnOpenSubmit = overlay.querySelector('#btnOpenSubmitModal');
  if (btnOpenSubmit) {
    btnOpenSubmit.addEventListener('click', () => {
      openMultiProofSubmissionModal(currentTask.id, false, null, state, async () => {
        const res = await fetchTaskDetails(currentTask.id);
        if (res && res.task) {
          currentTask = res.task;
          overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
          attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
        }
        refreshData();
      });
    });
  }

  // Review & Evaluate submission button handler
  overlay.querySelectorAll('.btn-review-sub').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const submissionId = e.currentTarget.getAttribute('data-sub-id');
      const targetStatus = e.currentTarget.getAttribute('data-status') || 'approved';

      openModal({
        title: `Evaluate Submission & Review Panel`,
        contentHtml: `
          <div class="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <p class="text-outline">Provide detailed rubric ratings, written evaluation, constructive suggestions, and improvement recommendations.</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-white mb-1">Rubric Rating (1 - 5 Stars) *</label>
                <select id="reviewRatingSelect" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
                  <option value="5" selected>★ ★ ★ ★ ★ (5/5) - Excellent / Outstanding</option>
                  <option value="4">★ ★ ★ ★ ☆ (4/5) - Good / Exceeds Target</option>
                  <option value="3">★ ★ ★ ☆ ☆ (3/5) - Satisfactory / Meets Expectations</option>
                  <option value="2">★ ★ ☆ ☆ ☆ (2/5) - Needs Improvement</option>
                  <option value="1">★ ☆ ☆ ☆ ☆ (1/5) - Unsatisfactory / Major Gaps</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-white mb-1">Review Outcome Decision</label>
                <select id="reviewOutcomeSelect" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
                  <option value="approved" ${targetStatus === 'approved' ? 'selected' : ''}>Approve & Award XP</option>
                  <option value="revision_requested" ${targetStatus === 'revision_requested' ? 'selected' : ''}>Request Revision</option>
                  <option value="rejected" ${targetStatus === 'rejected' ? 'selected' : ''}>Reject Deliverable</option>
                  <option value="under_review" ${targetStatus === 'under_review' ? 'selected' : ''}>Under Review</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-bold text-white mb-1">Written Evaluation & Comments *</label>
              <textarea id="reviewCommentsInput" rows="3" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" placeholder="Detail feedback on code quality, requirements fulfillment, and overall execution..."></textarea>
            </div>

            <div>
              <label class="block font-bold text-white mb-1">Constructive Suggestions</label>
              <textarea id="reviewSuggestionsInput" rows="2" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" placeholder="Specific technical recommendations or architecture improvements..."></textarea>
            </div>

            <div>
              <label class="block font-bold text-white mb-1">Areas for Improvement</label>
              <textarea id="reviewImprovementsInput" rows="2" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" placeholder="Focus areas for future sprints or deliverables..."></textarea>
            </div>
          </div>
        `,
        onConfirm: async (revOverlay) => {
          const rating = parseInt(revOverlay.querySelector('#reviewRatingSelect').value, 10) || 5;
          const outcomeStatus = revOverlay.querySelector('#reviewOutcomeSelect').value;
          const comments = revOverlay.querySelector('#reviewCommentsInput').value.trim();
          const suggestions = revOverlay.querySelector('#reviewSuggestionsInput').value.trim();
          const improvements = revOverlay.querySelector('#reviewImprovementsInput').value.trim();

          try {
            await createSubmissionReview(submissionId, {
              rating,
              status: outcomeStatus,
              comments,
              suggestions,
              improvements
            });

            const res = await fetchTaskDetails(currentTask.id);
            if (res && res.task) {
              currentTask = res.task;
              overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
              attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
            }
            refreshData();
            return true;
          } catch (err) {
            console.error('Failed to submit review evaluation:', err);
            alert(err.message || 'Failed to submit review');
            return false;
          }
        }
      });
    });
  });

  // Add Subtask button handler
  const btnAdd = overlay.querySelector('#btnAddSubtask');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openSubtaskFormModal(currentTask.id, null, state, async () => {
        const res = await fetchTaskDetails(currentTask.id);
        if (res && res.task) {
          currentTask = res.task;
          overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
          attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
        }
        refreshData();
      });
    });
  }

  // Subtask Checkbox status toggle handler
  overlay.querySelectorAll('.subtask-checkbox').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      const subtaskId = e.target.getAttribute('data-subtask-id');
      const isDone = e.target.checked;
      const newStatus = isDone ? 'done' : 'todo';

      try {
        await updateSubtask(currentTask.id, subtaskId, { status: newStatus });
        const res = await fetchTaskDetails(currentTask.id);
        if (res && res.task) {
          currentTask = res.task;
          overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
          attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
        }
        refreshData();
      } catch (err) {
        console.error('Failed to toggle subtask status:', err);
        e.target.checked = !isDone;
      }
    });
  });

  // Edit Subtask handler
  overlay.querySelectorAll('.btn-edit-subtask').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subtaskId = e.currentTarget.getAttribute('data-subtask-id');
      const subtask = (currentTask.subtasks || []).find(s => s.id === subtaskId);
      if (subtask) {
        openSubtaskFormModal(currentTask.id, subtask, state, async () => {
          const res = await fetchTaskDetails(currentTask.id);
          if (res && res.task) {
            currentTask = res.task;
            overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
            attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
          }
          refreshData();
        });
      }
    });
  });

  // Delete Subtask handler
  overlay.querySelectorAll('.btn-delete-subtask').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const subtaskId = e.currentTarget.getAttribute('data-subtask-id');
      const confirmed = await showConfirmDialog({
        title: 'Delete Subtask?',
        message: 'Are you sure you want to delete this subtask?',
        confirmText: 'Delete',
        danger: true
      });
      if (confirmed) {
        try {
          await deleteSubtask(currentTask.id, subtaskId);
          const res = await fetchTaskDetails(currentTask.id);
          if (res && res.task) {
            currentTask = res.task;
            overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
            attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
          }
          refreshData();
        } catch (err) {
          console.error('Failed to delete subtask:', err);
        }
      }
    });
  });

  // Subtask Comments handler
  overlay.querySelectorAll('.btn-subtask-comment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subtaskId = e.currentTarget.getAttribute('data-subtask-id');
      const subtask = (currentTask.subtasks || []).find(s => s.id === subtaskId);
      if (subtask) {
        openSubtaskCommentsModal(currentTask.id, subtask, state, async () => {
          const res = await fetchTaskDetails(currentTask.id);
          if (res && res.task) {
            currentTask = res.task;
            overlay.querySelector('.modal-body').innerHTML = renderModalContent(currentTask);
            attachTaskDetailModalEvents(currentTask, state, refreshData, renderModalContent);
          }
          refreshData();
        });
      }
    });
  });

  // Status transition handler inside modal
  overlay.querySelectorAll('.btn-transition-status').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const newStatus = e.currentTarget.getAttribute('data-status');
      try {
        await updateTaskStatus(currentTask.id, newStatus);
        closeModal();
        refreshData();
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    });
  });
}

// Multi-Proof Submission & Resubmission Modal
function openMultiProofSubmissionModal(taskId, isResubmit = false, latestSub = null, state, onSavedCallback) {
  const modalTitle = isResubmit ? 'Resubmit Deliverable Version' : 'Submit Task Deliverable Proof';

  const contentHtml = `
    <div class="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
      <p class="text-outline">
        ${isResubmit ? 'Resubmit an updated deliverable version incorporating reviewer feedback.' : 'Submit proof of completed work using a mix of text notes, links, and file attachments.'}
      </p>

      <div>
        <label class="block font-bold text-white mb-1">Deliverable Notes & Summary *</label>
        <textarea id="subProofNotes" rows="3" placeholder="Describe completed work, features built, test results..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none"></textarea>
      </div>

      <!-- Attachments Builder -->
      <div class="space-y-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
        <div class="flex items-center justify-between">
          <span class="font-bold text-white uppercase tracking-wider text-[11px]">Proof Attachments & Links</span>
          <div class="flex items-center gap-1.5">
            <button type="button" id="btnAddTextProof" class="px-2 py-1 bg-white/10 hover:bg-white/20 text-white font-semibold text-[10px] rounded-lg transition-all flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">notes</span> + Text Note
            </button>
            <button type="button" id="btnAddLinkProof" class="px-2 py-1 bg-white/10 hover:bg-white/20 text-emerald-400 font-semibold text-[10px] rounded-lg transition-all flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">link</span> + Link URL
            </button>
          </div>
        </div>

        <div id="attachmentsContainer" class="space-y-2">
          <!-- Dynamic proof items will be appended here -->
          <div class="proof-item p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold text-emerald-400 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">link</span> Link / URL Deliverable
              </span>
              <button type="button" class="btn-remove-proof text-rose-400 hover:text-rose-300 text-xs">Remove</button>
            </div>
            <input type="text" class="proof-content w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-outline focus:outline-none" placeholder="https://github.com/myorg/pull/42 or demo link..." />
          </div>
        </div>
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Optional Deliverable File Upload</label>
        <input type="file" id="subProofFile" class="w-full text-xs text-white" />
      </div>
    </div>
  `;

  openModal({
    title: modalTitle,
    contentHtml,
    onConfirm: async (overlay) => {
      const proof_notes = overlay.querySelector('#subProofNotes').value.trim();
      const fileInput = overlay.querySelector('#subProofFile');

      const attachments = [];

      // Collect dynamic attachments
      overlay.querySelectorAll('.proof-item').forEach(item => {
        const input = item.querySelector('.proof-content');
        if (input && input.value.trim()) {
          const val = input.value.trim();
          const isUrl = val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/');
          attachments.push({
            attachment_type: isUrl ? 'link' : 'text',
            content: val,
            file_name: isUrl ? val : 'Text Proof Note'
          });
        }
      });

      // Handle optional file upload path/name
      if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        attachments.push({
          attachment_type: 'file',
          content: `/uploads/${file.name}`,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });
      }

      if (!proof_notes && attachments.length === 0) {
        alert('Please provide deliverable notes or at least one proof attachment.');
        return false;
      }

      const payload = {
        proof_notes,
        proof_url: attachments.find(a => a.attachment_type === 'link')?.content || null,
        attachments
      };

      try {
        if (isResubmit) {
          await resubmitTaskSubmission(taskId, payload);
        } else {
          await createTaskSubmission(taskId, payload);
        }
        if (onSavedCallback) await onSavedCallback();
        return true;
      } catch (err) {
        console.error('Error submitting deliverable:', err);
        alert(err.message || 'Failed to submit deliverable proof');
        return false;
      }
    }
  });

  // Attach dynamic proof item buttons inside modal
  const overlay = document.getElementById('forgeModalOverlay');
  if (!overlay) return;

  const container = overlay.querySelector('#attachmentsContainer');
  const btnAddText = overlay.querySelector('#btnAddTextProof');
  const btnAddLink = overlay.querySelector('#btnAddLinkProof');

  if (btnAddText && container) {
    btnAddText.addEventListener('click', () => {
      const div = document.createElement('div');
      div.className = 'proof-item p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5';
      div.innerHTML = `
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-ice-blue flex items-center gap-1">
            <span class="material-symbols-outlined text-xs">notes</span> Text Note Proof
          </span>
          <button type="button" class="btn-remove-proof text-rose-400 hover:text-rose-300 text-xs">Remove</button>
        </div>
        <textarea class="proof-content w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-outline focus:outline-none" rows="2" placeholder="Detail specific test metrics or code changes..."></textarea>
      `;
      container.appendChild(div);
      div.querySelector('.btn-remove-proof').addEventListener('click', () => div.remove());
    });
  }

  if (btnAddLink && container) {
    btnAddLink.addEventListener('click', () => {
      const div = document.createElement('div');
      div.className = 'proof-item p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5';
      div.innerHTML = `
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-emerald-400 flex items-center gap-1">
            <span class="material-symbols-outlined text-xs">link</span> Link / URL Deliverable
          </span>
          <button type="button" class="btn-remove-proof text-rose-400 hover:text-rose-300 text-xs">Remove</button>
        </div>
        <input type="text" class="proof-content w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-outline focus:outline-none" placeholder="https://..." />
      `;
      container.appendChild(div);
      div.querySelector('.btn-remove-proof').addEventListener('click', () => div.remove());
    });
  }

  container.querySelectorAll('.btn-remove-proof').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.proof-item').remove();
    });
  });
}

// Open Subtask Creation & Editing Modal
function openSubtaskFormModal(taskId, subtaskToEdit, state, onSavedCallback) {
  const isEdit = !!subtaskToEdit;
  const titleText = isEdit ? `Edit Subtask: ${escapeHtml(subtaskToEdit.title)}` : 'Add New Subtask';

  const userOptions = cachedUsersList.map(u => `
    <option value="${u.id}" ${(subtaskToEdit && subtaskToEdit.assigned_to === u.id) ? 'selected' : ''}>
      ${escapeHtml(u.name)} (@${escapeHtml(u.username)})
    </option>
  `).join('');

  const contentHtml = `
    <div class="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label class="block font-bold text-white mb-1">Subtask Title *</label>
        <input type="text" id="subtaskTitle" value="${escapeHtml(subtaskToEdit ? subtaskToEdit.title : '')}" placeholder="e.g. Write unit tests for API endpoints"
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-royal-slate-blue focus:outline-none" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block font-bold text-white mb-1">Assign Member</label>
          <select id="subtaskAssignedTo" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="">-- Unassigned --</option>
            ${userOptions}
          </select>
        </div>

        <div>
          <label class="block font-bold text-white mb-1">Priority</label>
          <select id="subtaskPriority" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="low" ${(subtaskToEdit ? subtaskToEdit.priority : '') === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${(subtaskToEdit ? subtaskToEdit.priority : 'medium') === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${(subtaskToEdit ? subtaskToEdit.priority : '') === 'high' ? 'selected' : ''}>High</option>
            <option value="critical" ${(subtaskToEdit ? subtaskToEdit.priority : '') === 'critical' ? 'selected' : ''}>Critical</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-white mb-1">Status</label>
          <select id="subtaskStatus" class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">
            <option value="todo" ${(subtaskToEdit ? subtaskToEdit.status : 'todo') === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="in_progress" ${(subtaskToEdit ? subtaskToEdit.status : '') === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="done" ${(subtaskToEdit ? subtaskToEdit.status : '') === 'done' ? 'selected' : ''}>Done / Completed</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Deadline Date & Time</label>
        <input type="datetime-local" id="subtaskDeadline" value="${subtaskToEdit && subtaskToEdit.deadline ? new Date(subtaskToEdit.deadline).toISOString().slice(0, 16) : ''}"
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none" />
      </div>

      <div>
        <label class="block font-bold text-white mb-1">Description / Deliverable Notes</label>
        <textarea id="subtaskDescription" rows="3" placeholder="Specific technical requirements or notes for this subtask..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none">${escapeHtml(subtaskToEdit ? subtaskToEdit.description || '' : '')}</textarea>
      </div>
    </div>
  `;

  openModal({
    title: titleText,
    contentHtml,
    onConfirm: async (subtaskOverlay) => {
      const title = subtaskOverlay.querySelector('#subtaskTitle').value.trim();
      if (!title) {
        alert('Subtask title is required.');
        return false;
      }

      const payload = {
        title,
        description: subtaskOverlay.querySelector('#subtaskDescription').value.trim() || null,
        assigned_to: subtaskOverlay.querySelector('#subtaskAssignedTo').value || null,
        priority: subtaskOverlay.querySelector('#subtaskPriority').value,
        status: subtaskOverlay.querySelector('#subtaskStatus').value,
        deadline: subtaskOverlay.querySelector('#subtaskDeadline').value || null
      };

      try {
        if (isEdit) {
          await updateSubtask(taskId, subtaskToEdit.id, payload);
        } else {
          await createSubtask(taskId, payload);
        }
        if (onSavedCallback) await onSavedCallback();
        return true;
      } catch (err) {
        console.error('Error saving subtask:', err);
        alert(err.message || 'Failed to save subtask');
        return false;
      }
    }
  });
}

// Open Subtask Comments Modal
function openSubtaskCommentsModal(taskId, subtask, state, onCommentAddedCallback) {
  const renderCommentsList = (comments) => {
    if (!comments || comments.length === 0) {
      return '<p class="text-outline italic text-xs">No comments recorded on this subtask yet.</p>';
    }

    return `
      <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
        ${comments.map(c => `
          <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
            <div class="flex justify-between items-center text-white font-bold">
              <span>${escapeHtml(c.user_name || 'Member')}</span>
              <span class="text-[10px] text-outline font-normal">${new Date(c.created_at).toLocaleString()}</span>
            </div>
            <p class="text-white/80 leading-relaxed">${escapeHtml(c.text)}</p>
          </div>
        `).join('')}
      </div>
    `;
  };

  const contentHtml = `
    <div class="space-y-4 text-xs">
      <div>
        <h4 class="font-bold text-white text-sm mb-1">${escapeHtml(subtask.title)}</h4>
        <p class="text-outline">${escapeHtml(subtask.description || 'Subtask comments & activity thread.')}</p>
      </div>

      <div id="subtaskCommentsContainer">
        ${renderCommentsList(subtask.comments)}
      </div>

      <div class="pt-2 border-t border-white/10 space-y-2">
        <label class="block font-bold text-white">Add Comment / Progress Note</label>
        <textarea id="subtaskCommentInput" rows="2" placeholder="Write a comment or update for team members..."
          class="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white focus:border-royal-slate-blue focus:outline-none"></textarea>
      </div>
    </div>
  `;

  openModal({
    title: `Comments: ${escapeHtml(subtask.title)}`,
    contentHtml,
    onConfirm: async (modalOverlay) => {
      const text = modalOverlay.querySelector('#subtaskCommentInput').value.trim();
      if (text) {
        try {
          await addSubtaskComment(taskId, subtask.id, text);
          if (onCommentAddedCallback) await onCommentAddedCallback();
        } catch (err) {
          console.error('Failed to add subtask comment:', err);
        }
      }
      return true;
    }
  });
}

function renderStatusTransitionButtons(task) {
  const current = (task.status || 'active').toLowerCase();
  const transitions = {
    draft: [{ label: 'Activate Task', status: 'active', color: 'bg-royal-slate-blue' }, { label: 'Archive', status: 'archived', color: 'bg-rose-600' }],
    active: [{ label: 'Start Progress', status: 'in_progress', color: 'bg-indigo-600' }, { label: 'Archive', status: 'archived', color: 'bg-rose-600' }],
    open: [{ label: 'Start Progress', status: 'in_progress', color: 'bg-indigo-600' }, { label: 'Archive', status: 'archived', color: 'bg-rose-600' }],
    in_progress: [{ label: 'Submit for Review', status: 'pending_review', color: 'bg-yellow-600' }, { label: 'Archive', status: 'archived', color: 'bg-rose-600' }],
    pending_review: [{ label: 'Mark Completed', status: 'completed', color: 'bg-emerald-600' }, { label: 'Request Revision', status: 'in_progress', color: 'bg-indigo-600' }, { label: 'Archive', status: 'archived', color: 'bg-rose-600' }],
    pending_approval: [{ label: 'Mark Completed', status: 'completed', color: 'bg-emerald-600' }, { label: 'Request Revision', status: 'in_progress', color: 'bg-indigo-600' }, { label: 'Archive', status: 'archived', color: 'bg-rose-600' }],
    completed: [{ label: 'Archive Task', status: 'archived', color: 'bg-rose-600' }],
    archived: [{ label: 'Re-activate', status: 'active', color: 'bg-royal-slate-blue' }, { label: 'Revert to Draft', status: 'draft', color: 'bg-gray-600' }]
  };

  const list = transitions[current] || [];
  if (list.length === 0) return '<span class="text-outline">No transitions available.</span>';

  return list.map(item => `
    <button class="btn-transition-status px-3 py-1.5 ${item.color} hover:opacity-90 text-white font-bold text-xs rounded-xl shadow transition-all" data-status="${item.status}">
      ${item.label}
    </button>
  `).join('');
}
