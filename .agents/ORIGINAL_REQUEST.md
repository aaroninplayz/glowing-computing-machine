# Original User Request

## Initial Request — 2026-08-01T01:02:29+05:30

# Teamwork Project Prompt — Forge Phase 1 MVP Transition

Build the Forge web platform using Vanilla HTML, CSS, and JavaScript with Node.js/Express and SQLite.

Working directory: p:\projects\Forge

## Requirements

### R1. Technology Stack Transition (React -> Vanilla HTML/JS/CSS)
- Convert frontend from React components to standard Vanilla HTML5, CSS3, and ES Module JavaScript.
- Maintain Express REST backend with SQLite persistence.
- Implement CSS Custom Properties using abstract token names (--bg-base, --text-main, --accent-1, --accent-2, --accent-3) supporting dynamic light/dark mode accent customization.

### R2. Core Feature & Role Hierarchy Overhaul
- Role Hierarchy: Operative (Student), Team Captain, Student Leader (2 rotated monthly), Teacher (Admin), and Hidden Developer (hardcoded to developer account, completely invisible on UI, performing actions as system-level operations).
- Tasks & Marketplace: Rename 'Activities' to 'Tasks'. Allow Operatives to suggest tasks in a Task Marketplace with upvoting. Student Leaders assign top-voted tasks to teams or individuals.
- Dynamic Point Distribution: Team Captains and Student Leaders can adjust point distribution per team member if work contribution was unequal.
- Team Lifecycle: 4-member teams auto-dissolve back into the general cohort pool upon task completion/deadline.
- The Hall of Fame: Replace simple leaderboard with an interactive marble/granite themed Hall of Fame, displaying All-Time rankings, Season 1 rankings, and awarded titles (e.g. Best Developer, Coding Champion).

### R3. UI Cleanliness & Stealth Rules
- Remove all visible mentions of 'Operation Overthink' and 'Shadow Lead / Dev Mode' from the user interface.
- Replace all emoji icons with clean, minimalist SVGs.
- Enforce strict role-based access without explicit admin control panel screens (admin actions performed inline on task/team pages).

## Acceptance Criteria

### Verification & Quality Bar
- [ ] Frontend builds cleanly with zero React dependencies in package.json.
- [ ] SQLite database schema supports Task Marketplace upvotes, dynamic point overrides, team captain assignments, and Hall of Fame titles.
- [ ] Express server exposes REST endpoints for all MVP features.
- [ ] No visible 'Operation Overthink' text or emoji icons present on the UI.
- [ ] npm run dev launches Node.js server and serves static HTML/JS frontend cleanly.
