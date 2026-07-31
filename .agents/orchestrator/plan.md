# Plan — Forge Phase 1 MVP Transition

## Executive Roadmap

1. **Phase 1: Discovery & Test Suite Setup (Dual Track)**
   - Spawn Explorers to analyze existing codebase in `p:\projects\Forge\src` and dependencies in `package.json`.
   - Spawn E2E Testing Track Orchestrator to generate test infrastructure and test cases (Tiers 1-4) derived from user requirements.

2. **Phase 2: Milestone Execution (Implementation Track)**
   - **Milestone 1: Technology Stack Transition**
     - Remove React & React-DOM dependencies from package.json.
     - Convert React components/pages to native HTML5 / CSS3 / ES Module JavaScript.
     - Set up Express server static file serving.
     - Implement CSS Custom Properties (--bg-base, --text-main, --accent-1, --accent-2, --accent-3) for light/dark theme switching.
   - **Milestone 2: Role Hierarchy & Task Marketplace Overhaul**
     - Schema & REST endpoints for 5 roles: Operative, Team Captain, Student Leader (2 rotated monthly), Teacher (Admin), Hidden Developer.
     - Rename 'Activities' to 'Tasks'. Task Marketplace with Operative suggestions & upvoting. Student Leader task assignment.
   - **Milestone 3: Dynamic Point Distribution & Team Lifecycle**
     - Team Captain & Student Leader point override API & UI.
     - 4-member teams auto-dissolving upon task completion or deadline back into cohort pool.
   - **Milestone 4: The Hall of Fame**
     - Interactive marble/granite themed Hall of Fame UI.
     - All-Time rankings, Season 1 rankings, awarded titles (e.g. Best Developer, Coding Champion).
   - **Milestone 5: UI Cleanliness & Stealth Rules**
     - Scrub all 'Operation Overthink' and 'Shadow Lead / Dev Mode' mentions.
     - Replace emojis with clean minimalist SVGs.
     - Inline role-based actions (no explicit admin control panel screens).

3. **Phase 3: E2E Test Suite Validation & Adversarial Hardening**
   - Execute Phase 1: Pass 100% of E2E test suite (Tiers 1-4).
   - Execute Phase 2: Adversarial Coverage Hardening (Tier 5 white-box test generation + verification).
   - Forensic Integrity Audit on each milestone gate.

4. **Phase 4: Final Acceptance & Victory Signal**
   - Verify all acceptance criteria.
   - Send completion message to parent (Sentinel).
