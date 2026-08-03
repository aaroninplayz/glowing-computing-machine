import { fetchUserXpHistory } from '../services/api.js';

/**
 * Reusable XP History Ledger component
 * @param {string} userId
 * @param {Object} [options]
 * @returns {Promise<HTMLElement>}
 */
export async function createXPLedgerView(userId, options = {}) {
  const container = document.createElement('div');
  container.className = 'xp-ledger-component';

  let currentPage = options.page || 1;
  const limit = options.limit || 10;

  async function loadPage(page) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted, #64748b);">Loading XP Ledger...</div>';
    try {
      const response = await fetchUserXpHistory(userId, page, limit);
      const { history, pagination, summary } = response.data;
      currentPage = pagination.page;

      renderLedger(history, pagination, summary);
    } catch (err) {
      container.innerHTML = `<div style="padding: 16px; color: #ef4444; background: #fef2f2; border-radius: 6px;">Failed to load XP history: ${err.message}</div>`;
    }
  }

  function renderLedger(history, pagination, summary) {
    const tableRows = history.length === 0
      ? `<tr><td colspan="4" style="text-align: center; padding: 16px; color: var(--text-muted, #64748b);">No XP transactions recorded yet.</td></tr>`
      : history.map(item => {
          const isPositive = item.amount >= 0;
          const amtStyle = isPositive ? 'color: #16a34a; font-weight: 600;' : 'color: #dc2626; font-weight: 600;';
          const amtSign = isPositive ? '+' : '';
          const dateStr = item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A';

          return `
            <tr style="border-bottom: 1px solid var(--border-color, #f1f5f9);">
              <td style="padding: 10px 12px; ${amtStyle}">${amtSign}${item.amount} XP</td>
              <td style="padding: 10px 12px; color: var(--text-main, #0f172a);">${item.reason || item.description || 'N/A'}</td>
              <td style="padding: 10px 12px;"><span style="background: var(--bg-neutral, #f1f5f9); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-family: monospace; color: var(--text-secondary, #475569);">${item.source_type || 'MANUAL'}</span></td>
              <td style="padding: 10px 12px; font-size: 0.85rem; color: var(--text-muted, #64748b);">${dateStr}</td>
            </tr>
          `;
        }).join('');

    const prevDisabled = pagination.page <= 1 ? 'disabled' : '';
    const nextDisabled = pagination.page >= pagination.totalPages ? 'disabled' : '';

    container.innerHTML = `
      <div style="background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; overflow: hidden; font-family: inherit;">
        <div style="padding: 14px 16px; background: var(--bg-header, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--text-main, #0f172a);">XP Transaction Ledger</h3>
          <span style="font-size: 0.85rem; color: var(--text-muted, #64748b);">Total: ${pagination.total} transactions</span>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="background: var(--bg-header, #f1f5f9); color: var(--text-secondary, #475569); border-bottom: 1px solid var(--border-color, #e2e8f0);">
                <th style="padding: 10px 12px;">Amount</th>
                <th style="padding: 10px 12px;">Reason / Description</th>
                <th style="padding: 10px 12px;">Source</th>
                <th style="padding: 10px 12px;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
        <div style="padding: 12px 16px; background: var(--bg-header, #f8fafc); border-top: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
          <span style="color: var(--text-muted, #64748b);">Page ${pagination.page} of ${pagination.totalPages || 1}</span>
          <div style="display: flex; gap: 8px;">
            <button id="btn-xp-prev" ${prevDisabled} style="padding: 4px 12px; border-radius: 4px; border: 1px solid var(--border-color, #cbd5e1); background: #ffffff; cursor: pointer;">Previous</button>
            <button id="btn-xp-next" ${nextDisabled} style="padding: 4px 12px; border-radius: 4px; border: 1px solid var(--border-color, #cbd5e1); background: #ffffff; cursor: pointer;">Next</button>
          </div>
        </div>
      </div>
    `;

    const prevBtn = container.querySelector('#btn-xp-prev');
    const nextBtn = container.querySelector('#btn-xp-next');

    if (prevBtn && !prevDisabled) {
      prevBtn.addEventListener('click', () => loadPage(currentPage - 1));
    }
    if (nextBtn && !nextDisabled) {
      nextBtn.addEventListener('click', () => loadPage(currentPage + 1));
    }
  }

  await loadPage(currentPage);
  return container;
}
