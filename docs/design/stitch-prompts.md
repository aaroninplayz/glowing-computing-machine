# UI Screens Catalog & Stitch MCP Generation Prompts

This document serves as the master blueprint for all web pages and UI screens for **Forge (Operation Overthink)**. It includes the **Global Design System Prompt** and exact **Stitch MCP Generation Prompts** (Light Mode & Dark Mode) for each screen.

> [!IMPORTANT]
> **Maintenance Rule**: Whenever new features are added or existing screens are modified, the Stitch prompts in this document must be updated to reflect the exact UI requirements.

---

## Global Design System & Aesthetic Rules

```markdown
GLOBAL DESIGN SYSTEM PROMPT:
Design a ultra-clean, minimalist, modern web interface for 'Forge (Operation Overthink)' - a private learning community operating system.

Design Language & Principles:
1. Aesthetic: Minimalist, spacious, clean glassmorphism with subtle 1px translucent borders and glowing accent highlights.
2. Micro-Animations: Smooth Framer Motion transitions (soft hover lifts, spring-physics progress bar fills, subtle card glows, animated leaderboard rank shifting). Keep animations elegant and non-distracting.
3. Typography: Clean sans-serif ('Inter'), crisp line-height, bold headings with gradient text clips.
4. Top Bar: Includes brand title 'FORGE | OPERATION OVERTHINK', navigation tabs, and a prominent 'SHADOW LEAD DEV MODE' role-switching toggle bar.

Color Tokens:
- Dark Mode: Background #0b0f19, Card #111827 (opacity 0.7), Border rgba(255,255,255,0.1), Accent Cyan #38bdf8, Accent Purple #a855f7, Text #f8fafc.
- Light Mode: Background #f8fafc, Card #ffffff (opacity 0.9), Border rgba(0,0,0,0.08), Accent Cyan #0284c7, Accent Purple #7e22ce, Text #0f172a.
```

---

## Screen Catalog & Prompts

### Screen 1: Cohort Overview Dashboard (`/`)

- **Purpose**: Main hub displaying active sprint progress, quick activity list, top team status, and active challenge highlights.
- **Key UI Elements**: Active Sprint banner, progress gauge, recent activities grid, team leaderboard preview widget, Shadow Lead dev mode toggle.

#### Light Mode Stitch Prompt
```text
A minimalist, clean Light Mode web dashboard for 'Forge (Operation Overthink)' learning community. Background soft off-white (#f8fafc) with subtle cyan gradient glow. Top header features gradient text title 'FORGE | OPERATION OVERTHINK', navigation tabs (Overview, Activities, Challenges, Teams, Resources, Leaderboard), and a purple-tinted 'SHADOW LEAD DEV MODE' status bar. Main content shows a hero card 'Sprint 01: Community OS Launch' with an animated progress bar (65% complete), a quick-action grid of 3 learning activity cards with '50 PTS' badges and 'Mark Complete' buttons, and a right-sidebar leaderboard preview widget showing top Operative rankings. Clean line borders, soft drop shadows, and minimalist typography.
```

#### Dark Mode Stitch Prompt
```text
A sleek, modern Dark Mode glassmorphism web dashboard for 'Forge (Operation Overthink)'. Deep slate background (#0b0f19) with glowing cyan and purple ambient light blurs. Top navigation bar with crisp text tabs and a prominent 'SHADOW LEAD DEV MODE' toggle with a purple glow badge. Hero banner displays 'Sprint 01: Community OS Launch' with a glowing cyan progress bar. 3 glassmorphism cards below show active learning activities with '50 PTS' cyan badges and interactive 'Mark Complete ⚡' buttons. Right sidebar features a dark glass leaderboard widget ranking top Operatives. Translucent card borders (rgba(255,255,255,0.1)), cyan hover glows, and minimalist layout.
```

---

### Screen 2: Learning Activities Page (`/activities`)

- **Purpose**: Interactive catalog of learning modules, instructions, proof upload forms, and verification status badges.
- **Key UI Elements**: Filter pills (All, In Progress, Completed, Proof Required), activity cards with point badges, 'Upload Proof' modal trigger, Overseer review status tags (`PENDING_APPROVAL`, `COMPLETED`).

#### Light Mode Stitch Prompt
```text
A clean Light Mode learning activities catalog page for 'Forge'. Bright white cards (#ffffff) on light grey canvas (#f8fafc). Header displays 'Learning Activities' title with a count badge '12 Total'. Filter tabs at top: 'All', 'In Progress', 'Completed', 'Proof Required'. Activity cards display activity title, short description, point badges ('100 PTS' in vibrant blue), and a status tag ('Proof Required' in purple). Cards include a secondary 'Upload Proof / File' button and a primary 'Mark Complete' button. Minimalist card spacing, clear typography, and subtle border lines.
```

#### Dark Mode Stitch Prompt
```text
A futuristic Dark Mode learning activities grid for 'Forge'. Dark navy canvas (#0b0f19) with semi-transparent dark glass cards (#111827). Filter bar with neon cyan pill buttons. Activity cards feature glowing point badges ('100 PTS'), description text, a purple 'Proof Required' tag, and an upload button with a drag-and-drop file icon. Includes a pop-over modal preview for submitting proof URLs or file attachments. Smooth glass reflection, high-contrast text, and hover glow effects.
```

---

### Screen 3: Collaborative Challenges Page (`/challenges`)

- **Purpose**: Team-based challenge goals with countdown timers and Vanguard submission form.
- **Key UI Elements**: Challenge cards, Sprint window dates, Vanguard submission badge (exclusive for Team Captains), team aggregate point reward indicators.

#### Light Mode Stitch Prompt
```text
A crisp Light Mode collaborative challenges page for 'Forge'. Main area features large challenge banner cards with title 'Sprint 01: Community OS Launch', countdown timer badge '12 Days Remaining', and a point reward tag '250 PTS'. Includes an info banner explaining 'Only Vanguards (Team Captains) can submit final challenge proof'. A prominent 'Vanguard Submit Evidence' button is visible with a upload paperclip icon. Clean white containers, soft grey borders, and clear hierarchy.
```

#### Dark Mode Stitch Prompt
```text
A high-energy Dark Mode collaborative challenges hub for 'Forge'. Deep slate background with glowing neon green and cyan accents. Challenge cards rendered in dark glassmorphism with glowing '250 PTS' badges and a purple 'Vanguard Submission Authority' badge. Shows sprint date ranges and a list of participating teams with member avatars. The Vanguard submit button glows with a vibrant cyan border. Translucent overlays, dark mode glass reflections, and minimalist design.
```

---

### Screen 4: Team Management Page (`/teams`)

- **Purpose**: Community team rosters (~45 Operatives), Vanguard badges, and Overseer 1-Click Auto-Randomize button.
- **Key UI Elements**: Team cards, roster list with member role badges (`VANGUARD`, `OPERATIVE`), Admin '🎲 1-Click Auto-Randomize Teams' action button.

#### Light Mode Stitch Prompt
```text
A clean Light Mode team management page for 'Forge'. Top action bar features a prominent blue button '🎲 1-Click Auto-Randomize Teams (Admin)'. Grid of team cards (e.g. 'Team Cyber (Alpha)', 'Team Quantum (Beta)'). Each team card lists team name, captain name tag ('Captain: Sarah'), and a vertical roster list of team members with role badges ('Vanguard', 'Operative'). Minimalist white containers, light borders, and spacious layout.
```

#### Dark Mode Stitch Prompt
```text
A sleek Dark Mode team management layout for 'Forge'. Dark background (#0b0f19) featuring glassmorphism team cards. Top bar displays a purple glowing button '🎲 1-Click Auto-Randomize Teams'. Team cards display neon cyan headers, captain badges ('Vanguard: Sarah'), and dark list items for each Operative. Smooth hover animations and glowing outline highlights.
```

---

### Screen 5: Resource Repository Page (`/resources`)

- **Purpose**: Shared learning materials, documentation links, and file upload streaming.
- **Key UI Elements**: Category filter tabs (General, UI & Motion, Documentation, Templates), resource cards with file type icons (`pdf`, `zip`, `link`), direct download links, and an 'Upload Resource' drag-and-drop modal.

#### Light Mode Stitch Prompt
```text
A minimalist Light Mode resource repository page for 'Forge'. Filter bar at top with category pills ('All', 'UI & Motion', 'Documentation', 'Templates'). Grid of resource cards featuring resource title, file type badge ('PDF', 'LINK'), uploader name, and a clean 'Open Link / Download ↗' outline button. Top right includes a '+ Upload New Resource' button. Crisp white cards, subtle drop shadows, and clean typography.
```

#### Dark Mode Stitch Prompt
```text
A modern Dark Mode resource library for 'Forge'. Dark glassmorphism cards on deep navy canvas (#0b0f19). Resource cards feature cyan category tags, glowing file type icons, and interactive download buttons. Top right features a glowing purple '+ Upload Resource' button opening a dark glass modal with a drag-and-drop file zone. High contrast, clean layout, and ambient cyan lighting.
```

---

### Screen 6: Dual-View Leaderboard Page (`/leaderboard`)

- **Purpose**: Gamified rankings with tabs for Individual Operatives vs Aggregate Teams, and All-Time vs Sprint filters.
- **Key UI Elements**: Dual-view toggle tabs ('Operatives Individual' vs 'Teams Aggregate'), time filter ('All-Time' vs 'Active Sprint'), ranked list table with gold/silver/bronze rank badges, points breakdown.

#### Light Mode Stitch Prompt
```text
A clean Light Mode leaderboard page for 'Forge'. Top tab bar allows switching between 'Operatives (Individual)' and 'Teams (Aggregate)', with a secondary filter for 'All-Time' vs 'Sprint 01'. Main table features ranked rows with rank numbers (#1 highlighted in gold, #2 silver, #3 bronze), member name, role codename badge ('Operative', 'Vanguard', 'Overseer'), and point totals in bold blue text ('350 PTS'). White table container with subtle divider lines.
```

#### Dark Mode Stitch Prompt
```text
A futuristic Dark Mode leaderboard page for 'Forge'. Dark slate canvas with glowing glassmorphism table container. Rank #1 features a glowing gold trophy icon and border highlight. Rank rows show member name, glowing purple role badge ('Vanguard'), and cyan point totals ('350 PTS'). Tab buttons at top glow with cyan indicator lines. Smooth rank item layout and high contrast dark aesthetic.
```

---

### Screen 7: Shadow Lead Admin Control Panel (`/admin` / Modal Overlay)

- **Purpose**: Administrative panel for verification review queue (`requires_approval`), pre-seeded member account management, and database status logs.
- **Key UI Elements**: Submission approval queue table with 'Approve' and 'Reject' buttons, pre-seeded cohort roster list, database status indicator, and Dev Mode switch settings.

#### Light Mode Stitch Prompt
```text
A clean Light Mode admin control panel for 'Forge'. Top title 'Shadow Lead Control Panel'. Contains a submission review table showing pending activity proof items with member name, activity title, submitted proof link/file, and green 'Approve (+100 PTS)' and red 'Reject' action buttons. Lower section shows pre-seeded cohort account status (45 Members Loaded). Professional, clean white layout with crisp borders.
```

#### Dark Mode Stitch Prompt
```text
A high-tech Dark Mode admin control center for 'Forge'. Dark navy glassmorphism panel with purple and cyan glowing borders. Pending submissions table displays submission proof previews, member avatars, and glowing green 'Approve' / red 'Reject' buttons. Database status widget shows 'WAL Mode Active | 45 Cohort Profiles Pre-Seeded'. Sleek dark interface with high-contrast text and glowing controls.
```
