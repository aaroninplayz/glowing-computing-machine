// Tasks & Marketplace View Renderer (Glassmorphism Deep Obsidian Theme)
import { openModal } from '../components/modal.js';
import { upvoteTask, suggestTask, submitTaskProof, assignTask, approveTask } from '../services/api.js';

export function renderTasksView(state) {
  const { tasksData, teamsData, currentUser } = state;
  const teamTasks = tasksData.teamTasks || [];
  const challenges = tasksData.challenges || [];
  const marketplace = tasksData.marketplace || [];
  const userRole = currentUser ? (currentUser.public_role || currentUser.role) : 'OPERATIVE';
  const isLeaderOrTeacher = ['STUDENT_LEADER', 'TEACHER', 'DEV_STEALTH'].includes(userRole);

  return `
    <div class="space-y-8">
      
      <!-- Top Action Banner -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 class="text-2xl font-black text-white flex items-center gap-2 tracking-tight uppercase">
            <span class="material-symbols-outlined text-royal-slate-blue text-3xl">task</span>
            Tasks & Task Marketplace
          </h1>
          <p class="text-xs text-outline mt-1">
            Official team tasks assigned by leaders, individual challenges, and community marketplace proposals.
          </p>
        </div>
        <button id="btnSuggestTask" class="px-4 py-2.5 bg-royal-slate-blue hover:bg-royal-slate-blue/80 text-white font-semibold text-xs rounded-lg flex items-center gap-2 shadow-lg transition-all btn-spring-fill">
          <span class="material-symbols-outlined text-sm">add_circle</span>
          Suggest Marketplace Idea
        </button>
      </div>

      <!-- SECTION 1: Team Tasks (Leader Assigned) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-royal-slate-blue">groups</span>
            Team Tasks (Assigned to Squads)
          </h2>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-royal-slate-blue/20 text-ice-blue border border-royal-slate-blue/40">
            ${teamTasks.length} Squad Objectives
          </span>
        </div>

        ${teamTasks.length === 0 ? `
          <div class="glass-card p-6 rounded-lg text-center text-outline text-xs">
            No official team tasks currently assigned. Promoted tasks from the Marketplace will appear here!
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${teamTasks.map(t => renderTaskCard(t, isLeaderOrTeacher, currentUser)).join('')}
          </div>
        `}
      </div>

      <!-- SECTION 2: Solo & Choice Challenges -->
      <div class="space-y-4 pt-4 border-t border-white/10">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-warm-coral">extension</span>
            Challenges (Solo / Choice Based)
          </h2>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-warm-coral/20 text-warm-coral border border-warm-coral/40">
            ${challenges.length} Available Challenges
          </span>
        </div>

        ${challenges.length === 0 ? `
          <div class="glass-card p-6 rounded-lg text-center text-outline text-xs">
            No active challenges available at the moment.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${challenges.map(t => renderTaskCard(t, isLeaderOrTeacher, currentUser)).join('')}
          </div>
        `}
      </div>

      <!-- SECTION 3: Task Marketplace (Upvote Board) -->
      <div class="space-y-4 pt-4 border-t border-white/10">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-ice-blue">forum</span>
              Task Marketplace (Upvote Board)
            </h2>
            <p class="text-xs text-outline">Community proposed task ideas. Top-upvoted tasks get promoted into official tasks by Student Leaders.</p>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-outline">
            ${marketplace.length} Ideas
          </span>
        </div>

        ${marketplace.length === 0 ? `
          <div class="glass-card p-6 rounded-lg text-center text-outline text-xs">
            No marketplace ideas proposed yet. Click "Suggest Marketplace Idea" above to create one!
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${marketplace.map(m => `
              <div class="glass-card p-6 rounded-lg flex flex-col justify-between space-y-4">
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded bg-white/5 text-ice-blue border border-white/10">
                      ${m.total_points || 20} PTS
                    </span>
                    <button class="btn-upvote flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-royal-slate-blue/30 text-xs font-semibold text-ice-blue rounded-full border border-white/10 hover:border-royal-slate-blue/50 transition-all" data-id="${m.id}">
                      <span class="material-symbols-outlined text-sm">thumb_up</span>
                      <span>Upvote (${m.upvotes || 0})</span>
                    </button>
                  </div>
                  <div>
                    <h3 class="font-bold text-base text-white">${m.title}</h3>
                    <p class="text-xs text-outline mt-1">${m.description}</p>
                  </div>
                </div>

                ${isLeaderOrTeacher ? `
                  <button class="btn-assign-task w-full py-2 bg-royal-slate-blue/20 hover:bg-royal-slate-blue/40 text-royal-slate-blue font-semibold text-xs rounded border border-royal-slate-blue/40 transition-all" data-id="${m.id}">
                    Promote & Assign Task
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

function renderTaskCard(t, isLeaderOrTeacher, currentUser) {
  const isCompleted = t.status === 'COMPLETED';
  const isPendingApproval = t.status === 'PENDING_APPROVAL';

  return `
    <div class="glass-card p-6 rounded-lg flex flex-col justify-between space-y-4 group">
      <div class="space-y-3">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${t.task_type === 'CHALLENGE' ? 'bg-warm-coral/20 text-warm-coral border border-warm-coral/40' : 'bg-royal-slate-blue/20 text-royal-slate-blue border border-royal-slate-blue/40'}">
              ${t.task_type || 'TASK'}
            </span>
            <span class="text-[10px] font-semibold text-outline">
              Mode: ${t.mode || 'CHOICE'}
            </span>
          </div>
          <span class="text-xs font-bold px-2 py-0.5 rounded bg-white/5 text-ice-blue border border-white/10">
            ${t.total_points} PTS
          </span>
        </div>

        <div>
          <h3 class="font-bold text-base text-white group-hover:text-royal-slate-blue transition-colors line-clamp-2">
            ${t.title}
          </h3>
          <p class="text-xs text-outline mt-1.5 line-clamp-3">${t.description}</p>
        </div>
      </div>

      <div class="space-y-3 pt-3 border-t border-white/5">
        <div class="flex justify-between items-center text-xs">
          <span class="text-outline flex items-center gap-1">
            <span class="material-symbols-outlined text-sm">info</span>
            Status: <strong class="${isCompleted ? 'text-green-400' : isPendingApproval ? 'text-yellow-400' : 'text-ice-blue'}">${t.status}</strong>
          </span>
          ${t.assigned_team_name ? `
            <span class="text-ice-blue font-medium">Squad: ${t.assigned_team_name}</span>
          ` : t.assigned_user_name ? `
            <span class="text-warm-coral font-medium">Assignee: ${t.assigned_user_name}</span>
          ` : ''}
        </div>

        <div class="flex flex-col gap-2">
          ${!isCompleted ? `
            <button class="btn-submit-task w-full py-2 border border-white/15 rounded text-xs font-semibold uppercase tracking-wider hover:bg-white hover:text-deep-obsidian transition-all btn-spring-fill" data-id="${t.id}">
              Submit Proof
            </button>
          ` : `
            <div class="w-full py-1.5 text-center text-xs font-semibold text-green-400 bg-green-950/40 rounded border border-green-500/30 flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-sm">check_circle</span> Approved & Completed
            </div>
          `}

          ${isLeaderOrTeacher && !isCompleted ? `
            <button class="btn-approve-task w-full py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 font-semibold text-xs rounded border border-green-500/40 transition-all flex items-center justify-center gap-1" data-id="${t.id}">
              <span class="material-symbols-outlined text-sm">verified</span> Approve Task (Leader)
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function attachTasksEvents(state, refreshData) {
  const currentUserId = state.currentUser ? state.currentUser.id : 'u_dev';

  // Upvote Handler
  document.querySelectorAll('.btn-upvote').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      try {
        await upvoteTask(taskId, currentUserId);
        refreshData();
      } catch (err) {
        console.error('Error upvoting task:', err);
      }
    });
  });

  // Suggest Task Modal Handler
  const suggestBtn = document.getElementById('btnSuggestTask');
  if (suggestBtn) {
    suggestBtn.addEventListener('click', () => {
      openModal({
        title: 'Suggest Task Marketplace Idea',
        contentHtml: `
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="modalTaskTitle" class="form-control" placeholder="e.g. Implement Dark Mode Marble Hall" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="modalTaskDesc" class="form-control" rows="3" placeholder="Explain the proposal objective..."></textarea>
          </div>
          <div class="form-group">
            <label>Type</label>
            <select id="modalTaskType" class="form-control">
              <option value="TEAM_TASK">Team Task (Squad)</option>
              <option value="CHALLENGE">Challenge (Solo / Choice)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Participation Mode</label>
            <select id="modalTaskMode" class="form-control">
              <option value="CHOICE">Choice (Solo or Team)</option>
              <option value="SOLO">Solo (Individual)</option>
              <option value="TEAM">Team (Squad Only)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Proposed Points</label>
            <input type="number" id="modalTaskPoints" class="form-control" value="30" min="10" max="200" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const title = overlay.querySelector('#modalTaskTitle').value.trim();
          const description = overlay.querySelector('#modalTaskDesc').value.trim();
          const task_type = overlay.querySelector('#modalTaskType').value;
          const mode = overlay.querySelector('#modalTaskMode').value;
          const total_points = parseInt(overlay.querySelector('#modalTaskPoints').value, 10) || 30;

          if (!title || !description) return false;

          await suggestTask({ title, description, total_points, task_type, mode, user_id: currentUserId });
          refreshData();
          return true;
        }
      });
    });
  }

  // Submit Proof Handler
  document.querySelectorAll('.btn-submit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      openModal({
        title: 'Submit Task Completion Proof',
        contentHtml: `
          <div class="form-group">
            <label>Deliverable Notes / Details</label>
            <textarea id="modalProofNotes" class="form-control" rows="3" placeholder="Provide notes or link to repository/artifact..."></textarea>
          </div>
          <div class="form-group">
            <label>Upload Proof Document/Image (Optional)</label>
            <input type="file" id="modalProofFile" class="form-control" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const proof_notes = overlay.querySelector('#modalProofNotes').value.trim();
          const fileInput = overlay.querySelector('#modalProofFile');
          const formData = new FormData();
          formData.append('submitted_by', currentUserId);
          formData.append('proof_notes', proof_notes);
          if (fileInput.files[0]) {
            formData.append('proof_file', fileInput.files[0]);
          }

          await submitTaskProof(taskId, formData, currentUserId);
          refreshData();
          return true;
        }
      });
    });
  });

  // Assign Task Handler
  document.querySelectorAll('.btn-assign-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      const teams = state.teamsData || [];
      const teamOptions = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

      openModal({
        title: 'Promote & Assign Task',
        contentHtml: `
          <div class="form-group">
            <label>Assign to Squad</label>
            <select id="modalAssignTeam" class="form-control">
              <option value="">-- Select Squad --</option>
              ${teamOptions}
            </select>
          </div>
        `,
        onConfirm: async (overlay) => {
          const team_id = overlay.querySelector('#modalAssignTeam').value;
          if (!team_id) return false;
          await assignTask(taskId, { team_id, assigned_by: currentUserId });
          refreshData();
          return true;
        }
      });
    });
  });

  // Approve Task Handler (Leader/Teacher)
  document.querySelectorAll('.btn-approve-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      try {
        await approveTask(taskId, { reviewed_by: currentUserId });
        refreshData();
      } catch (err) {
        console.error('Error approving task:', err);
      }
    });
  });
}
