@AGENTS.md

# ROOC Kit

Companion web app for **Ragnarok Origin Classic** — helps players plan daily farming (Monster Research tracker) and get card-market restock alerts. The game exposes no public API, so all data is manual-entry; the app is client-side and privacy-first. Monster Research is the first tool, not the only one planned.

## Commands

- `pnpm dev` — dev server (Next.js, http://localhost:3000)
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm data:check` — validate static game data (run after any edit under `src/data/`)
- `pnpm test` — Vitest (`src/**/*.test.ts`)
- `pnpm db:generate` / `pnpm db:migrate` — Drizzle migrations (need `DATABASE_URL`)

## Stack (actual)

Next.js 16.3.0 (App Router, `src/app/`), React 19, TypeScript, Tailwind CSS v4 (PostCSS plugin, no tailwind.config), pnpm.

Installed and in use (2026-08-10): Dexie (local progress, `src/lib/local-db.ts`), Drizzle ORM (Railway Postgres, `src/lib/db/`), Auth.js/NextAuth v5 (Discord + Google, JWT sessions, `src/lib/auth.ts`), shadcn/ui components bridged to the app's design tokens (`src/components/ui/` + token bridge in `globals.css`). Deploy targets: Vercel (app) + Railway (Postgres, later the alert cron). Full stack table and reasoning: README *Tech Stack* + `docs/PROPOSALS.md` §4.

## Documentation map

| File | Role |
|---|---|
| `README.md` | Full product spec: features, game mechanics, data model (`Element`, `Monster`, `ResearchRow`, `RowStat`), data-entry modes |
| `docs/ROADMAP.md` | Phase plan (Phase 1 = Core MR Tracker) + backlog |
| `docs/PROPOSALS.md` | Technical proposals with trade-offs — decided/implemented items carry a status stamp |
| `docs/OPEN-QUESTIONS.md` | Open questions per phase — once answered, move the conclusion to `PROPOSALS.md` or `README.md` |

Before touching Monster Research logic, read README's *Game Mechanics Reference* and *Data Model*. Core rules:

- A **row's level is the minimum monster level in it** (a row at `4,5,5,6,7` is level 4) — but **only rows with all 5 monsters have a level**; rows with fewer (incomplete data) have no row level, no blockers, and never count as completed (`ROW_SIZE` in `rowStats.ts`).
- **Blockers** are the monsters sitting at that minimum — they hold the row back.
- Monster levels cap at 10. A monster can spawn on multiple maps (`mapIds` is an array).

## Architecture principles

- Local-first: the tracker is fully usable client-side without an account. The server layer is Next.js route handlers / server actions used **only** for auth (Auth.js) and progress sync (Railway Postgres via Drizzle); the market-alert cron (Phase 3) is a small service on Railway. Never require sign-in for core features.
- Two data layers, never mixed:
  - **Static game data** — monsters/rows/elements/maps as versioned JSON in the repo.
  - **User progress** — MR levels and settings in browser storage, exportable/importable as JSON.
- Privacy stance: never read game memory, automate in-game actions, or upload user data (except a user-supplied Discord webhook URL).
- Every future import path (spreadsheet paste, OCR, desktop helper) must converge on one shared JSON schema so the web app has a single import endpoint.

## Conventions

- Planning docs are written in Thai; code, identifiers, and commit messages are in English. Respond to the user in Thai.
- **UI is bilingual (th/en, default en)** — every user-facing string goes through `useT()` from `src/lib/i18n` (add the key to both dictionaries in `messages.ts`); never hardcode UI text. Monster/map/element names are canonical English ids and are **never** translated.
- **Production grade is a requirement, not a wish** — this deploys to real users:
  - All DB access goes through one shared Drizzle client module (small pool — Railway Postgres has a low connection limit and Vercel functions are serverless). Auth.js stays on JWT sessions so ordinary requests never open a DB connection.
  - Schema changes only via committed `drizzle-kit` migrations; never hand-edit the database.
  - Secrets only in env vars; validate required env at startup; nothing secret in the repo.
  - `pnpm lint` and `pnpm build` must pass before any commit; `pnpm data:check` after touching `src/data/`. Set up Vitest alongside the first non-trivial logic (row stats), not "later".
  - Handle the unhappy paths you create: loading/error states for async UI, try/catch with user-visible feedback on sync/auth failures, no silently swallowed promises.
- Decisions live in docs, not in chat: resolved questions graduate from `docs/OPEN-QUESTIONS.md` → `docs/PROPOSALS.md`/`README.md`. Keep them in sync when a decision is made.
- Current state (2026-08-12): Phase 1 + 2 complete. Routes: `/` landing (playable demo, `src/features/landing/`), `/tracker` Monster Research UI, `/dailies` daily/weekly checklist and `/setup` backup/tools (all behind `AuthGate` — Discord / Google / anonymous, choice stored locally), `/admin` super-admin backoffice (server-gated by `SUPER_ADMIN_EMAIL` in `src/app/admin/layout.tsx`, 404 for everyone else; menu in `src/features/admin/AdminNav.tsx`, tools `/admin/templates` + `/admin/users`; entry link shows in the account menu via `session.user.isSuperAdmin`), `/terms` + `/privacy`, `/api/auth/*` + `/api/progress` + `/api/templates` (public GET) + `/api/admin/templates*` + `/api/admin/users*` (all admin routes re-check via `requireSuperAdmin()` in `src/lib/admin-api.ts`). Progress sync is live: whole-snapshot per user in `progress_snapshot` (same JSON as export/import, `src/lib/progress-io.ts`), upload from the account menu, upload/restore from `/setup`. Dailies (`src/features/dailies/`): tasks shared across user-defined game accounts, check-offs keyed `(accountId, taskId, periodKey)` with reset boundaries computed in `period.ts` (daily 05:00 Asia/Bangkok, weekly Mon 05:00 — no timers); dailies data rides ONLY the cloud-sync payload (`dailies` field), never file export/import; suggested templates live in Postgres `task_template`, adoption copies into Dexie. Design system "Night Ops" documented in `DESIGN.md` (ground truth) — dark-first with a light theme toggle. Game art (sprites + level frames) served from `/public/img` via `src/lib/images.ts`. Next up: Phase 3 alerts (see ROADMAP).
