# Architectural Decision Records (ADR)

This document tracks all key technical and architectural decisions made for **Forge**, detailing the context, rationale, and consequences of each choice in beginner-friendly language.

---

## ADR 0001: Documentation-First Bootstrapping

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: The project was started without existing formal documentation or explicit technical constraints.
- **Decision**: Bootstrap a comprehensive 6-domain documentation suite (`docs/`) before creating any application code or database schemas.
- **Rationale**: Keeps documentation as the single source of truth, eliminates hidden assumptions, and enforces beginner-friendly transparency.
- **Consequences**: No feature implementation can begin until technical and product documentation is established and verified.

---

## ADR 0002: Scope Locking on Phase 1 MVP

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: The project vision specifies a learning community operating system for ~45 members, distinct from generic LMS platforms.
- **Decision**: Strictly lock Phase 1 scope to: Learning Activities, Collaborative Challenges, Teams, Resources, Leaderboards, and Progress Tracking. Mark AI, notifications, forums, analytics, and integrations as out of scope.
- **Rationale**: Prevents premature complexity and guarantees a lean, maintainable initial release.
- **Consequences**: Code implementations will contain zero stubs or integrations for future phase features.

---

## ADR 0003: Technical Stack Selection (React Frontend + Node.js/Express Backend)

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: The platform requires clean component-driven UI animations (leveraging React component patterns) and scalable file upload/download handling for resources and activity evidence.
- **Decision**: 
  - **Frontend**: React (Vite) + Vanilla CSS Modules for flexible styling and smooth animations.
  - **Backend**: Node.js + Express REST API for clean service separation and file handling.
  - **Database**: SQLite with Prisma/Kysely for single-file, zero-config persistence during Phase 1 (easily scalable to PostgreSQL later).
- **Rationale**: Provides high animation flexibility (matching Reactor Bytes component snippets), clean separation between UI and backend services, and scalable file streaming capabilities.
- **Consequences**: Frontend and backend are decoupled. Backend delivers REST endpoints while frontend renders UI.

---

## ADR 0004: Pre-Seeded Member Accounts & No Public Signup

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: The community consists of a fixed, known cohort of ~45 members.
- **Decision**: Disable public registration endpoints. All 45 member accounts are pre-seeded in the database or created via Admin management.
- **Rationale**: Eliminates public access risks, simplifies onboarding, and avoids unnecessary signup validation logic.

---

## ADR 0005: Flexible Activity Verification Rules

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: Different learning activities require different completion standards (some need file attachments, some need link evidence, some are self-reported).
- **Decision**: Allow Admins to configure verification settings on each activity:
  - `requires_proof`: Boolean (requires file upload or URL submission).
  - `requires_approval`: Boolean (auto-awards points upon submission vs queuing for Admin approval).
- **Rationale**: Gives instructors and community leads full flexibility without hardcoding static rules.

---

## ADR 0006: Super-Admin "Developer / Double Agent" Mode

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: System owners need to experience the platform as a standard student while maintaining instant access to administrative overrides and debugging tools.
- **Decision**: Support a `SUPER_ADMIN` role with a client-side "Role Switcher / Dev Mode Toggle" in the navigation bar, allowing the user to view the UI strictly as a standard Member or switch to full Admin mode on demand.
- **Rationale**: Eliminates the need to maintain and log in/out of multiple test accounts.

---

## ADR 0007: Hybrid Team Formation with One-Click Auto-Randomization

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: Community leads need to form teams quickly for collaborative challenges without spending hours on manual assignments.
- **Decision**: Provide a hybrid team module where Admins can allow self-joining or manual assignments, plus an Admin **"Auto-Randomize Teams"** feature that automatically shuffles and balances all ~45 cohort members evenly into specified team sizes.
- **Rationale**: Saves admin effort during new challenges while retaining manual override controls.

---

## ADR 0008: Framer Motion Animation Engine

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: The platform UI requires fluid animations, micro-interactions, layout transitions, and support for Reactor Bytes visual component snippets.
- **Decision**: Integrate `framer-motion` into the React frontend as the standard UI animation library.
- **Rationale**: Delivers smooth, hardware-accelerated declarative animations for card hovering, page transitions, progress bars, and modal overlays.

---

## ADR 0009: Team Captain Submission Authority for Collaborative Challenges

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: Collaborative team challenges require clear accountability for team-wide submissions.
- **Decision**: Designate a **Team Captain** role within each team roster. Only Team Captains are authorized to upload completion evidence and submit team challenges. Upon approval, points are credited to the team and all assigned roster members.
- **Rationale**: Eliminates duplicate submissions by multiple team members and enforces clear team leadership.

---

## ADR 0010: Dual-View Leaderboards (All-Time + Active Sprint/Season)

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: Cohorts run multi-week sprints or monthly challenges where new teams need a fresh opportunity to compete.
- **Decision**: Provide a tabbed Leaderboard interface supporting both **All-Time** score rankings and **Active Sprint / Season** rankings for both individual members and teams.
- **Rationale**: Keeps long-term motivation high via All-Time scores while maintaining short-term excitement for each new sprint.

---

## ADR 0011: Minimal Initial Seeding with Batch Cohort Loading

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: The user will collect member details via a Google Form / sheet for the 45 cohort members (including 2 team captains).
- **Decision**: Provide a minimal initial seed for development testing, plus a batch JSON/CSV seed loader script to import all 45 member profiles seamlessly once the user collects their information.
- **Rationale**: Enables immediate local development while supporting zero-friction bulk account creation later.

---

## ADR 0012: Thematic Role Codenames (Operation Overthink Branding)

- **Date**: 2026-07-31
- **Status**: Approved
- **Context**: Plain role titles ("Student", "Teacher", "Captain", "Admin") lack community flavor.
- **Decision**: Assign thematic codenames to system roles fitting *Operation Overthink*:
  - **Operative** (Standard Member)
  - **Vanguard** (Team Captain)
  - **Architect / Overseer** (Teacher / Community Lead)
  - **Shadow Lead** (Super-Admin / Double Agent Mode)
- **Rationale**: Enhances community identity, engagement, and gamification tone.
