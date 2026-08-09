---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/features/landing/Landing.tsx","src/features/landing/DemoRowCard.tsx"]
---

# Surface brief: / (landing)

- Scope: marketing landing at `/`; visitor mode: Persuade. Tracker itself lives at `/tracker` (Operate) behind AuthGate.
- Audience: Ragnarok Origin Classic players deciding whether to try the tool; job: understand the offer and open the tracker.
- Action: primary CTA "Open Tracker" → `/tracker` (AuthGate: Discord / Google / anonymous). Secondary: anchor to #how-it-works.
- Proof/content: playable DemoRowCard (real Earth · Row 1 data + sprites, local state only, labeled sample data); ledger rows proved by real UI fragments (element counter, trip chip, JSON export line) — no icon cards.
- Structure: "Live demo first" (seed b835a12f, candidate 3 of grounded list; approved by user 2026-08-10 after artifact mockup review).
- Constraints: locale-pure copy via useT (no mixed th/en lines — user requirement); canonical English monster/map/element names; no uninventable claims — cross-device sync always labeled "in development" until shipped; market alerts not mentioned until built.
- Memorable moment: tapping blockers until the row-level badge pops (lv-pop) and the trip recommendation changes.
- Unresolved: real screenshots/OG image; whether landing gets its own hero art later.
