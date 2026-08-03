/**
 * Reusable XP Progress Bar component
 * @param {Object} params
 * @param {number} params.totalXp
 * @param {number} params.level
 * @param {number} params.progressPercent
 * @param {number} params.xpInCurrentLevel
 * @param {number} params.xpNeededForNextLevel
 * @returns {HTMLElement}
 */
export function createXPProgressBar({
  totalXp = 0,
  level = 1,
  progressPercent = 0,
  xpInCurrentLevel = 0,
  xpNeededForNextLevel = 100
} = {}) {
  const container = document.createElement('div');
  container.className = 'xp-progress-component';
  container.style.cssText = 'width: 100%; padding: 12px; box-sizing: border-box;';

  const pct = Math.min(100, Math.max(0, progressPercent));

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: linear-gradient(135deg, #4f46e5, #9333ea); color: #ffffff; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.5px;">
          Level ${level}
        </span>
        <span style="font-weight: 600; font-size: 1rem; color: var(--text-main, #0f172a);">
          ${totalXp.toLocaleString()} XP
        </span>
      </div>
      <span style="font-size: 0.85rem; color: var(--text-muted, #64748b);">
        ${xpInCurrentLevel} / ${xpNeededForNextLevel} XP to Level ${level + 1}
      </span>
    </div>
    <div style="width: 100%; height: 10px; background-color: var(--bg-tertiary, #e2e8f0); border-radius: 6px; overflow: hidden; position: relative;">
      <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); border-radius: 6px; transition: width 0.5s ease-in-out;"></div>
    </div>
  `;

  return container;
}
