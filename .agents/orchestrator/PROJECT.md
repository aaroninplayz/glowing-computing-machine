# Project: Forge Phase 1 MVP Transition

## Architecture
- **Frontend**: Vanilla HTML5, CSS3 Custom Properties, ES Module JavaScript (no React/framework dependencies). Served statically via Express.
- **Backend**: Node.js REST API with Express.js.
- **Database**: SQLite with `sqlite3` or `better-sqlite3` driver. Schema managing users/roles, tasks/marketplace upvotes, team assignments, point overrides, and Hall of Fame titles/rankings.
- **Theme Engine**: CSS Custom Properties (`--bg-base`, `--text-main`, `--accent-1`, `--accent-2`, `--accent-3`) for dynamic theme customization.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Stack Transition | Remove React, convert frontend to Vanilla HTML/JS/CSS, Express static server, CSS variables | None | IN_PROGRESS |
| 2 | Role Hierarchy & Tasks Marketplace | 5 roles, Task Marketplace (suggestions, upvoting, assignment) | M1 | IN_PROGRESS |
| 3 | Dynamic Points & Team Lifecycle | Dynamic point overrides, 4-member team auto-dissolution | M2 | PLANNED |
| 4 | Hall of Fame | Marble/granite UI, All-Time/Season 1 rankings, awarded titles | M1 | PLANNED |
| 5 | Stealth Rules & Clean UI | Scrub 'Operation Overthink' / 'Shadow Lead', minimalist SVGs, inline role actions | M1, M2, M3, M4 | PLANNED |
| 6 | E2E Testing & Hardening | 100% E2E test pass (Tiers 1-4) + Tier 5 Adversarial Hardening | M1-M5 | PLANNED |

## Interface Contracts

### User / Role Hierarchy
- Roles: `operative` (student), `captain` (team captain), `leader` (student leader, max 2 rotated), `teacher` (admin), `developer` (hidden dev).
- REST Endpoints: `/api/auth/me`, `/api/users`, `/api/roles`

### Tasks & Marketplace
- Tasks: Suggestion, Upvoting (`/api/tasks/:id/upvote`), Assignment (`/api/tasks/:id/assign`).

### Dynamic Points & Teams
- Points Override: `/api/teams/:id/points/override` (Captain/Leader adjust member points).
- Team Dissolution: `/api/teams/:id/dissolve` (Auto-dissolves when task is completed or deadline met).

### Hall of Fame
- Endpoint: `/api/hall-of-fame` (All-Time rankings, Season 1 rankings, awarded titles).

## Code Layout
- `src/public/` — Static HTML, CSS (variables, themes), and ES Module JavaScript files.
- `src/server/` — Express server, REST API router handlers, SQLite db initialization & models.
- `package.json` — Scripts (`npm run dev`), server dependencies only (no React/build tools needed for vanilla JS/CSS).
