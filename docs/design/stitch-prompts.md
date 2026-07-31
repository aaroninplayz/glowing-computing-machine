# UI Screens Catalog & Stitch MCP Generation Prompts (Updated)

This document serves as the master blueprint for all web pages and UI screens for **Forge**. It includes the **Global Design System Prompt** with abstract accent color tokens and exact **Stitch MCP Generation Prompts** (Light Mode & Dark Mode) for each screen.

> [!IMPORTANT]
> **Maintenance Rule**: Whenever new features are added or existing screens are modified, the Stitch prompts in this document must be updated to reflect the exact UI requirements.

---

## Global Design System & Abstract Color Tokens

```markdown
GLOBAL DESIGN SYSTEM PROMPT:
Design a clean, minimalist, modern web interface for 'Forge' learning community platform.

Design Language & Principles:
1. Aesthetic: Minimalist, spacious, clean layout with subtle 1px borders and dynamic accent color tokens. No emojis on UI; use clean minimalist SVG icons.
2. Micro-Animations: Smooth CSS/JS transitions (soft hover lifts, progress bar fills, subtle card glows, animated leaderboard rank shifting). Keep animations elegant and non-distracting.
3. Typography: Clean sans-serif ('Inter'), crisp line-height, bold headings.
4. Top Bar: Includes brand title 'FORGE', navigation tabs (Dashboard, Tasks, Teams, Hall of Fame), and user profile badge. NO visible dev mode or operation overthink text.

Abstract Color Accent Tokens (Dynamic Accent Customization):
- Light Mode Palette:
  --bg-base: #f3f8f2 (Soft Sage White)
  --text-main: #191919 (Deep Obsidian)
  --accent-1: #ff8484 (Warm Coral Accent)
  --accent-2: #2374ab (Royal Slate Blue Accent)
- Dark Mode Palette:
  --bg-base: #333333 (Charcoal Base)
  --text-main: #ffffff (Pure White)
  --accent-1: #666a86 (Muted Slate Accent)
  --accent-2: #95b8d1 (Soft Ice Blue Accent)
  --accent-3: #e8ddb5 (Warm Cream Gold Accent)
```

---

## Screen Catalog & Prompts

### Screen 1: Dashboard (`/`)

- **Purpose**: Main hub displaying active sprint tasks, current team assignment, and quick points summary.
- **Key UI Elements**: Active sprint progress gauge, assigned team card, recent tasks list with status tags, user profile header.

#### Light Mode Stitch Prompt
```text
A minimalist, clean Light Mode web dashboard for 'Forge'. Background soft sage white (#f3f8f2) with deep obsidian text (#191919). Top header features crisp text title 'FORGE', navigation tabs (Overview, Tasks, Teams, Hall of Fame), and user profile card. Main section displays a progress card 'Active Sprint 01' with a slate blue (#2374ab) progress bar (60% complete), 3 active task cards with warm coral (#ff8484) point badges, and a right-sidebar summary widget of team status. Minimalist line borders, subtle drop shadows, and clean SVG icons.
```

#### Dark Mode Stitch Prompt
```text
A sleek, modern Dark Mode web dashboard for 'Forge'. Deep charcoal background (#333333) with clean white text. Top navigation bar with crisp text tabs. Hero banner displays 'Active Sprint 01' with a soft ice blue (#95b8d1) progress bar. 3 dark cards below show active tasks with muted slate (#666a86) point badges and interactive 'Complete Task' buttons. Right sidebar features a dark team status card. Warm cream gold (#e8ddb5) accent highlights, clean line borders, and minimalist typography.
```

---

### Screen 2: Tasks & Task Marketplace Page (`/tasks`)

- **Purpose**: Dual-section page for official assigned tasks and a student Task Marketplace for upvoting new task ideas.
- **Key UI Elements**: Tab switcher ('Official Tasks' vs 'Task Marketplace'), task cards with point values, upvote button with counter, proof upload modal, Student Leader assign actions.

#### Light Mode Stitch Prompt
```text
A clean Light Mode tasks page for 'Forge' on soft sage background (#f3f8f2). Top tab switcher allowing toggling between 'Official Tasks' and 'Task Marketplace'. Official Tasks grid shows task title, point badge in slate blue (#2374ab), and 'Submit Proof' button. Task Marketplace section shows student-suggested task cards with a warm coral (#ff8484) upvote button with count (e.g. '▲ 18 Upvotes'). Minimalist white containers, clean SVG icons, and crisp typography.
```

#### Dark Mode Stitch Prompt
```text
A modern Dark Mode tasks and marketplace grid for 'Forge'. Charcoal canvas (#333333) with dark card containers. Top tab buttons with soft ice blue (#95b8d1) indicators. Official tasks feature muted slate (#666a86) point tags and submission forms. Task Marketplace section features student idea cards with warm cream gold (#e8ddb5) upvote counters ('▲ 18 Upvotes'). Clean SVG icons and hover lift transitions.
```

---

### Screen 3: Teams & Captain Management Page (`/teams`)

- **Purpose**: Roster view of active 4-member teams, Team Captain badges, dynamic point share adjustment controls, and Student Leader 1-click team creation.
- **Key UI Elements**: Team cards, Team Captain badge, roster list, dynamic point redistribution sliders/inputs, 'Dissolve Team on Deadline' status indicator.

#### Light Mode Stitch Prompt
```text
A clean Light Mode team management page for 'Forge'. Shows 4-member team cards (e.g. 'Alpha Cohort', 'Beta Cohort'). Each team card displays team name, Team Captain badge in slate blue (#2374ab), and a roster list of 4 members. Includes a dynamic point distribution control panel for adjusting individual point shares per task. Minimalist sage white containers (#f3f8f2), dark text (#191919), and clean SVG badges.
```

#### Dark Mode Stitch Prompt
```text
A sleek Dark Mode team roster layout for 'Forge'. Dark charcoal canvas (#333333) featuring dark team card containers. Team headers highlight Team Captains with ice blue (#95b8d1) badges. Member list shows individual task contribution percentages and point share controls. Muted slate (#666a86) borders and clean minimalist design.
```

---

### Screen 4: The Hall of Fame Page (`/hall-of-fame`)

- **Purpose**: High-contrast realistic marble and granite themed honor hall with dual sideboards (All-Time & Season 1) and a central Awarded Titles Wall.
- **Key UI Elements**: Realistic marble/granite texture background, left sideboard ('All-Time Leaderboard'), right sideboard ('Season 1 Leaderboard'), central monument wall displaying dynamic awarded titles (*Best Developer*, *Coding Champion*, *Top Contributor*).

#### Light Mode Stitch Prompt
```text
A high-contrast, realistic Light Marble and Granite themed 'Hall of Fame' page for 'Forge'. Polished white marble texture canvas with subtle grey vein textures. Central monument wall displays glowing golden-engraved title plaques: 'Best Developer', 'Coding Champion', 'Top Contributor'. Left sideboard features an 'All-Time Leaderboard' ranking table. Right sideboard features a 'Season 1 Leaderboard' ranking table. Gold (#e8ddb5) and slate blue (#2374ab) accents, realistic polished stone borders, and elegant serif/sans-serif title typography.
```

#### Dark Mode Stitch Prompt
```text
A dramatic, high-contrast Dark Granite and Black Marble themed 'Hall of Fame' page for 'Forge'. Deep dark granite stone texture background with silver and gold vein highlights. Central monument wall features illuminated dark stone plaques showcasing awarded titles: 'Best Developer', 'Coding Champion', 'Top Contributor'. Left sideboard displays 'All-Time Leaderboard' with ice blue rank numbers (#95b8d1). Right sideboard displays 'Season 1 Leaderboard' with warm cream gold rank numbers (#e8ddb5). High contrast, realistic stone texture reflections, and noble typography.
```
