// Teams & Dynamic Point Distribution View Renderer
import { getIcon } from '../components/icons.js';
import { openModal } from '../components/modal.js';
import { overridePoints, dissolveTeam } from '../services/api.js';

export function renderTeamsView(state) {
  const { teamsData, currentUser } = state;
  const isLeaderOrTeacher = ['STUDENT_LEADER', 'TEACHER', 'DEV_STEALTH'].includes(currentUser.role);

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
      <h2>Community Squads & Captains</h2>
    </div>

    <div class="grid">
      ${teamsData.map(t => {
        const isCaptain = t.captain_id === currentUser.id;
        const canManage = isCaptain || isLeaderOrTeacher;

        return `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
              <h3>${t.name}</h3>
              <span class="badge badge-accent2">Captain: ${t.captain_name || 'Unassigned'}</span>
            </div>
            ${t.task_title ? `<div style="font-size:0.8rem; opacity:0.8; margin-bottom:0.5rem;">Task: ${t.task_title}</div>` : ''}

            <h5 style="margin-bottom:0.5rem; opacity:0.8;">Roster Members & Custom Point Shares:</h5>
            <ul style="list-style:none; display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1rem;">
              ${t.members?.map(m => `
                <li style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; background:var(--card-bg); padding:0.4rem 0.6rem; border-radius:6px; border:1px solid var(--border-color);">
                  <span>
                    ${m.name} ${m.tag ? `<small style="opacity:0.7">(${m.tag})</small>` : ''}
                  </span>
                  <div style="display:flex; align-items:center; gap:0.4rem;">
                    <span class="badge badge-accent3">${Math.round(m.custom_point_share * 100)}% Share</span>
                    ${canManage ? `
                      <button class="btn btn-secondary btn-edit-share" data-team="${t.id}" data-user="${m.id}" data-current="${m.custom_point_share}" style="padding:0.1rem 0.4rem; font-size:0.7rem;">
                        Edit
                      </button>
                    ` : ''}
                  </div>
                </li>
              `).join('')}
            </ul>

            ${canManage ? `
              <div style="display:flex; justify-content:flex-end;">
                <button class="btn btn-secondary btn-dissolve-team" data-id="${t.id}" style="color:var(--accent-1); border-color:var(--accent-1); font-size:0.8rem;">
                  Dissolve Squad
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function attachTeamsEvents(state, refreshData) {
  // Override Member Point Share Handler
  document.querySelectorAll('.btn-edit-share').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-team');
      const userId = e.currentTarget.getAttribute('data-user');
      const currentShare = parseFloat(e.currentTarget.getAttribute('data-current')) || 1.0;

      openModal({
        title: 'Adjust Custom Point Share Weight',
        contentHtml: `
          <div class="form-group">
            <label>Contribution Weight (1.0 = equal, 1.2 = 120%, 0.8 = 80%)</label>
            <input type="number" step="0.1" min="0" max="3" id="modalShareWeight" class="form-control" value="${currentShare}" />
          </div>
        `,
        onConfirm: async (overlay) => {
          const val = parseFloat(overlay.querySelector('#modalShareWeight').value);
          if (isNaN(val) || val < 0) return false;
          await overridePoints(teamId, userId, val);
          refreshData();
          return true;
        }
      });
    });
  });

  // Dissolve Team Handler
  document.querySelectorAll('.btn-dissolve-team').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const teamId = e.currentTarget.getAttribute('data-id');
      openModal({
        title: 'Confirm Squad Dissolution',
        contentHtml: `
          <p style="font-size:0.9rem; opacity:0.9;">Are you sure you want to dissolve this squad back into the unassigned cohort pool?</p>
        `,
        onConfirm: async () => {
          await dissolveTeam(teamId, 'MANUAL');
          refreshData();
          return true;
        }
      });
    });
  });
}
