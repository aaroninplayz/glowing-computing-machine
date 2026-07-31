// Tasks & Marketplace View Renderer
import { getIcon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { upvoteTask, suggestTask, submitTaskProof, assignTask } from '../services/api.js';

export function renderTasksView(state) {
  const { tasksData, teamsData, currentUser } = state;
  const official = tasksData.official || [];
  const marketplace = tasksData.marketplace || [];
  const isLeaderOrTeacher = ['STUDENT_LEADER', 'TEACHER', 'DEV_STEALTH'].includes(currentUser.role);

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
      <h2>Tasks & Task Marketplace</h2>
      <button id="btnSuggestTask" class="btn btn-primary">
        ${getIcon('plus')} Suggest Task
      </button>
    </div>

    <h3 style="margin-bottom: 0.5rem;">Official Assigned Tasks</h3>
    <div class="grid" style="margin-bottom: 2rem;">
      ${official.map(t => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
            <span class="badge badge-accent2">${t.total_points} PTS</span>
            <span class="badge badge-accent1">${t.status}</span>
          </div>
          <h4>${t.title}</h4>
          <p style="font-size:0.85rem; opacity:0.8; margin-bottom:1rem;">${t.description}</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <button class="btn btn-secondary btn-submit-task" data-id="${t.id}">
              ${getIcon('check')} Submit Proof
            </button>
            ${t.assigned_team_name ? `<span class="badge badge-accent3">Team: ${t.assigned_team_name}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <h3 style="margin-bottom: 0.5rem;">Task Marketplace (Upvote Board)</h3>
    <div class="grid">
      ${marketplace.map(m => `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span class="badge badge-accent3">${m.total_points} PTS</span>
            <button class="btn btn-secondary btn-upvote" data-id="${m.id}" style="padding:0.25rem 0.6rem;">
              ${getIcon('upvote')} Upvote (${m.upvotes || 0})
            </button>
          </div>
          <h4>${m.title}</h4>
          <p style="font-size:0.85rem; opacity:0.8; margin-bottom:1rem;">${m.description}</p>
          ${isLeaderOrTeacher ? `
            <div style="margin-top:0.5rem;">
              <button class="btn btn-primary btn-assign-task" data-id="${m.id}" style="width:100%; font-size:0.8rem;">
                Assign to Team
              </button>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

export function attachTasksEvents(state, refreshData) {
  // Upvote Event Handler
  document.querySelectorAll('.btn-upvote').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      try {
        await upvoteTask(taskId, state.currentUser.id);
        refreshData();
      } catch (err) {
        console.error('Error upvoting task:', err);
      }
    });
  });

  // Suggest Task Modal Event Handler
  const suggestBtn = document.getElementById('btnSuggestTask');
  if (suggestBtn) {
    suggestBtn.addEventListener('click', () => {
      openModal({
        title: 'Suggest Marketplace Task',
        contentHtml: `
          <div class="form-group">
            <label>Task Title</label>
            <input type="text" id="modalTaskTitle" class="form-control" placeholder="e.g. Build UI Component Library" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="modalTaskDesc" class="form-control" rows="3" placeholder="Describe the task scope..."></textarea>
          </div>
          <div class="form-group">
            <label>Total Points Proposed</label>
            <input type="number" id="modalTaskPoints" class="form-control" value="25" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const title = overlay.querySelector('#modalTaskTitle').value.trim();
          const description = overlay.querySelector('#modalTaskDesc').value.trim();
          const total_points = parseInt(overlay.querySelector('#modalTaskPoints').value, 10) || 25;

          if (!title || !description) return false;

          await suggestTask({ title, description, total_points, user_id: state.currentUser.id });
          refreshData();
          return true;
        }
      });
    });
  }

  // Submit Task Proof Event Handler
  document.querySelectorAll('.btn-submit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      openModal({
        title: 'Submit Task Completion Proof',
        contentHtml: `
          <div class="form-group">
            <label>Proof Notes</label>
            <textarea id="modalProofNotes" class="form-control" rows="3" placeholder="Explain deliverables or repository link..."></textarea>
          </div>
          <div class="form-group">
            <label>Upload File (Optional)</label>
            <input type="file" id="modalProofFile" class="form-control" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const proof_notes = overlay.querySelector('#modalProofNotes').value.trim();
          const fileInput = overlay.querySelector('#modalProofFile');
          const formData = new FormData();
          formData.append('submitted_by', state.currentUser.id);
          formData.append('proof_notes', proof_notes);
          if (fileInput.files[0]) {
            formData.append('proof_file', fileInput.files[0]);
          }

          await submitTaskProof(taskId, formData);
          refreshData();
          return true;
        }
      });
    });
  });

  // Assign Task Event Handler (for Student Leaders/Teachers/Devs)
  document.querySelectorAll('.btn-assign-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      const teams = state.teamsData || [];

      const teamOptions = teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

      openModal({
        title: 'Assign Task to Squad',
        contentHtml: `
          <div class="form-group">
            <label>Select Team</label>
            <select id="modalAssignTeam" class="form-control">
              <option value="">-- Choose Squad --</option>
              ${teamOptions}
            </select>
          </div>
        `,
        onConfirm: async (overlay) => {
          const team_id = overlay.querySelector('#modalAssignTeam').value;
          if (!team_id) return false;
          await assignTask(taskId, { team_id, assigned_by: state.currentUser.id });
          refreshData();
          return true;
        }
      });
    });
  });
}
