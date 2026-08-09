# ROOC Kit

> **R**agnarok **O**rigin **C**lassic **Kit** — a companion web app for planning daily activities in Ragnarok Origin (Classic).

The game exposes no public API, so players end up memorising their Monster Research progress or tracking it in a spreadsheet, and setting phone alarms for market restock times. ROOC Kit keeps that data in one place and turns it into an answer to the question *"where should I farm today?"*

The name is deliberately generic — Monster Research is the first tool, not the only one planned.

---

## Contents

- [Features](#features)
- [Game Mechanics Reference](#game-mechanics-reference)
- [Data Model](#data-model)
- [Data Entry](#data-entry)
- [Privacy](#privacy)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Further Documentation](#further-documentation)

---

## Features

UI text (buttons, labels, messages) is bilingual — **Thai and English**, switchable in the UI and remembered per browser. Game data (monster, map and element names) always renders in English: those names double as canonical ids, so they are never translated.

### 1. Monster Research Tracking

Records the player's Monster Research (MR) level for every monster and ranks rows by how worthwhile they are to farm next.

**Modes**

| Mode | Purpose |
|---|---|
| `Monster` | Primary mode. Plans which map to park an auto party in. |
| `Mini` | Shows which minis are still incomplete. Usually all maxed via Bloody Branch. |
| `MVP` | Spawn times cannot be determined outside the game, so this mode only lists MVPs ordered by MR level. |

**Row list**

- Shows the top *N* rows in the current sort order (default `N = 5`, user-configurable).
- Each row displays its element, row level, and every monster in it with its individual level.
- Any monster in a row can be selected to open its detail view.

**Monster detail view**

- Which map(s) the monster spawns on.
- What else spawns on that map — used to judge whether one trip covers several monsters.
- Which row and element the monster belongs to, and that row's current level.

**Sorting**

| Option | Behaviour |
|---|---|
| `Row order` | Canonical in-game row sequence. Default. |
| `Row Level ASC` | Lowest rows first — the ones lagging behind. |
| `Row Level DESC` | Highest rows first — the ones close to complete. |
| `Fewest Blockers` | Rows needing the fewest monsters levelled to advance. |
| `Smart Priority` | Composite ranking described below. |

In every sort except `Row order`, incomplete rows (fewer than 5 monsters in the data) sink below complete ones.

**Filtering**

- Maps with no MVP only.
- Maps with no Mini only.
- Avoided maps (default: none avoided; picker groups maps by 20-level brackets). Avoided maps are skipped when planning trips; a row that can only advance on avoided maps is hidden or demoted, per the filter-behaviour toggle.
- Element filter.

**Smart Priority ranking**

Definitions, per row:

- **Blocker** — a monster whose level equals the row level; these are what hold the row back.
- `blockerCount` — number of blockers in the row.
- `maxSameMapBlockers` — the largest number of blockers sharing a single map.

Rows are ordered by:

1. `blockerCount` ascending — fewer monsters to level means a faster row advance.
2. `maxSameMapBlockers` descending — one trip clearing several blockers is worth more.
3. `rowLevel` ascending.

*Example:* a row at levels `4, 4, 5, 5, 5` has two blockers. If both share a map, the row ranks near the top. If a filter such as *"no MVP on the map"* is active and that map has an MVP, the row is either hidden or demoted — this is a per-filter toggle between **hard filter** and **soft penalty**.

### 2. Card Market Alert

The in-game market restocks cards at **12:00, 16:00 and 19:30 (UTC+7)**, and purchases open five minutes after each restock (**12:05 / 16:05 / 19:35**).

- Configurable restock times and timezone, seeded with the defaults above.
- Configurable lead time before purchases open, so there is time to launch the game.
- Countdown to the next window on the home screen.
- Delivery via in-app notification, PWA push, or a user-supplied Discord webhook.

---

## Game Mechanics Reference

Context needed to read the feature specs above.

- Monster Research is organised by **element**, and each element contains several **rows**.
- A single row may mix **MVP**, **Mini** and **normal monsters**.
- **A row's level is the lowest monster level in it.** A row at `4, 5, 5, 6, 7` is row level 4.
- **A row only has a level when it holds all 5 monsters.** Rows with fewer than 5 (data still incomplete) have no row level — and therefore no blockers, no best-trip, and no completed state; the tracker sorts them below rows that can progress.
- Individual monsters cap at level 10. A monster's level advances by cumulative kill count (the in-game Bestiary shows e.g. `348988/450000` kills toward the next level).
- In the in-game Bestiary a row displays ~5 monsters with the row level shown as a badge; a screenshot is kept as a structural reference only — ROOC Kit's UI is designed fresh, not copied from the game.

| Type | Respawn | How it is usually farmed |
|---|---|---|
| **MVP** | ~1 hour | MVPs in a loop spawn close together (Angeling → Deviling → Drake). Farming means running between them, tagging each boss and waiting for the kill before moving on. |
| **Mini** | ~30 min | Mostly farmed with **Bloody Branch** in West Morroc, so these tend to reach level 10 across the board. |
| **Normal** | standard | Requires a large number of kills per level, so it is farmed by parking an auto party on a map. |

---

## Data Model

```ts
/** Ordered as in the in-game Monster Research sidebar — keep this order in the UI */
type Element = 'Neutral' | 'Wind' | 'Earth' | 'Fire' | 'Water'
             | 'Poison' | 'Holy' | 'Shadow' | 'Ghost' | 'Undead';

type MonsterKind = 'normal' | 'mini' | 'mvp';

interface GameMap {
  id: string;          // 'gl_church'
  name: string;        // 'Glast Heim Churchyard'
  area?: string;       // 'Glast Heim' — used for area-level filtering
}

interface Monster {
  id: string;
  name: string;
  kind: MonsterKind;
  mapIds: string[];    // a monster may spawn on several maps
  elementId: Element;
  rowId: string;
}

interface ResearchRow {
  id: string;
  elementId: Element;
  index: number;       // position within the element
  monsterIds: string[];
}

/** User-owned progress, stored separately from static game data */
interface UserProgress {
  monsterLevels: Record<string /* monsterId */, number>;  // 0–10
  /** 'estimated' = filled in by Quick mode, 'confirmed' = entered/corrected individually */
  levelSource: Record<string /* monsterId */, 'estimated' | 'confirmed'>;
  updatedAt: string;
}

/** Derived at runtime, never persisted */
interface RowStat {
  rowId: string;
  rowLevel: number;              // min level across the row
  blockers: string[];            // monsterIds at rowLevel
  maxSameMapBlockers: number;
  hasMvp: boolean;
  hasMini: boolean;
  mapIds: string[];
  priorityScore: number;
}
```

Data is split into two layers:

| Layer | Contents | Location |
|---|---|---|
| **Static data** | Monsters, rows, elements, maps | JSON in the repo, updated alongside game patches |
| **User progress** | MR levels, filter settings, webhook URL | LocalStorage / IndexedDB, exportable as JSON |

---

## Data Entry

There is no API to import from, so first-time setup is manual. Two entry modes are supported:

**Quick** — enter one level per row. Every monster in the row is treated as being at that level. Fastest to fill in, but Smart Priority is inaccurate because blockers cannot be identified.

**Detailed** — enter each monster's level individually. Required for accurate Smart Priority. The UI is built for speed: per-row entry, increment/decrement buttons, keyboard navigation, and a "fill row with level X" action to set a baseline before correcting outliers.

Bulk entry lives on a dedicated setup page; day-to-day corrections are made **inline from the row list**, so levels can be updated right after a farming session without switching pages.

Levels filled by Quick mode are stored as `estimated`; levels entered or corrected individually become `confirmed`. Rows that still contain estimated levels are flagged in the UI, since blockers — and therefore Smart Priority — cannot be identified reliably there.

The app targets **desktop and mobile equally**: bulk setup is most comfortable on desktop, while mid-game checks and post-farm updates happen on a phone.

Progress can be exported to and imported from JSON for backup and device transfer. Signed-in players can additionally sync the same JSON snapshot to the cloud (`PUT`/`GET /api/progress`, one whole-document snapshot per user) — upload from the account menu or the setup page, restore from the setup page. Local storage remains the source of truth; sync is optional and never required.

---

## Privacy

ROOC Kit is an out-of-game planning tool. It does not read game memory, automate any in-game action, or modify game files. All user data is stored locally in the browser and the tracker is fully usable without an account; data is uploaded only when the user signs in to sync progress or explicitly configures a Discord webhook.

---

## Tech Stack

Decided 2026-08-09, implemented 2026-08-10 — see [`docs/PROPOSALS.md`](docs/PROPOSALS.md) §4 for the reasoning.

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (bridged to the app's design tokens; system documented in `DESIGN.md`) |
| Local storage | IndexedDB via Dexie — the tracker is fully usable without an account |
| Auth | Auth.js (NextAuth) — Sign in with Discord / Google, JWT session strategy |
| Online DB | PostgreSQL on Railway, accessed via Drizzle ORM |
| i18n | In-house dictionary (`src/lib/i18n`, th/en) |
| Notifications | Discord webhook, with Web Push planned |
| Hosting | Vercel (web app) + Railway (Postgres; alert cron in Phase 3) |

The tracker itself is local-first and runs client-side. The server layer is Next.js route handlers / server actions on Vercel, used for auth and progress sync only. The market-alert scheduler (Phase 3) runs as a small cron service on Railway, next to the database.

**Production notes**

- Vercel functions are serverless while Railway Postgres has a small connection limit — all DB access goes through one shared Drizzle client module with a small pool, and Auth.js uses JWT sessions so normal requests never hit the DB.
- Schema changes only via `drizzle-kit` migrations committed to the repo.
- Secrets live in env vars (`.env.local`, Vercel/Railway dashboards) and are never committed.

---

## Project Structure

```
rooc-kit/
├── src/
│   ├── app/            # routes: / (landing), /tracker, /setup, /terms, /privacy,
│   │                   #         /api/auth/*, /api/progress
│   ├── data/           # static game data (JSON, validated by pnpm data:check)
│   ├── features/
│   │   ├── landing/            # landing page + playable demo row
│   │   └── monster-research/   # tracker UI, row stats, setup/backup, sync
│   ├── lib/            # game-data loader, local-db (Dexie), db (Drizzle),
│   │                   # auth, i18n, images, progress-io
│   └── components/     # app chrome, auth UI, shadcn/ui (components/ui)
├── docs/
├── drizzle/            # committed migrations
└── public/img/         # game art: monster sprites + level frames (user-provided)
```

---

## Getting Started

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm build
pnpm lint
pnpm data:check  # validate static game data after editing src/data/
```

The app runs without any configuration — sign-in is optional. To enable it, copy `.env.example` to `.env.local` and fill in every value (Railway Postgres URL, `AUTH_SECRET`, Discord/Google OAuth credentials — the file documents where each comes from), then create the auth tables:

```bash
pnpm db:migrate  # apply committed migrations in drizzle/
pnpm db:generate # after editing src/lib/db/schema.ts — commit the result
```

> ⚠️ From outside Railway (local dev, Vercel) `DATABASE_URL` must be the **Public Network** URL (`…proxy.rlwy.net:PORT`) — the `postgres.railway.internal` host only resolves inside Railway.

---

## Further Documentation

| Document | Contents |
|---|---|
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | แผนการพัฒนาแต่ละเฟส และ backlog |
| [`docs/PROPOSALS.md`](docs/PROPOSALS.md) | ข้อเสนอทางเทคนิคพร้อมเหตุผล — ข้อที่ตัดสินใจ/ทำแล้วจะระบุสถานะกำกับไว้ |
| [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md) | คำถามที่ยังค้างอยู่ |