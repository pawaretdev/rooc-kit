---
target: Shop Planner
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-14T17-38-42Z
slug: src-features-shop-planner-shopplanner-tsx
---
Method: dual-agent (A: design review · B: detector + static sweep). Browser visualization unavailable — no browser automation tool exposed in this session.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Totals recompute live, but every Dexie write is a floating `void` promise — a saved edit and a failed edit look identical. No countdown to the Monday 05:00 restock. |
| 2 | Match System / Real World | 3 | Strong domain vocabulary, but `shop.weeklyLimit` prints *remaining* under a label that says *limit*; Thai `shop.maxedOut` ("ซื้อครบแล้ว" = already bought) claims a state the data model doesn't track. |
| 3 | User Control and Freedom | 1 | No undo anywhere; the whole card body is a silent +1; last week's plan is deleted on mount with no carry-over. |
| 4 | Consistency and Standards | 3 | Excellent internal reuse (`ShopGrid` shared with the admin preview), but `role="tablist"` ships without `aria-controls`, a tabpanel, or arrow-key roving. |
| 5 | Error Prevention | 2 | Clamping is thorough, but a 24px `icon-xs` −1 sits inside a whole-card +1 target on a 2-column phone grid. |
| 6 | Recognition Rather Than Recall | 2 | On mobile `PlanSummary` scrolls away while you tap cards; identical grey `Package` icons carry no recognition value. |
| 7 | Flexibility and Efficiency | 2 | MAX + typed field are good; no catalog search, no bulk clear, no repeat-last-week, and the slider at stock 5,000 is ~25 units per pixel. |
| 8 | Aesthetic and Minimalist Design | 2 | Every quantity is editable through two full control clusters; the empty icon tile inflates each card without adding information. |
| 9 | Error Recovery | 1 | Invalid price/stock/qty silently reverts with no message; only the template fetch has an error state. |
| 10 | Help and Documentation | 2 | `incomeHint`/`diaryHint` are well written; nothing explains that the plan wipes weekly or that tapping a card adds one. |
| **Total** | | **20/40** | **Acceptable — competently built, under-directed** |

## Design Specificity Verdict

**LLM assessment: system-consistent, product-generic.** `ShopPlanner.tsx` is a near line-by-line transposition of `Dailies.tsx` — same `FirstRunCard` (reusing `dailies.*` keys), same `OpenDialog` union, same prune-on-mount effect, same two-button empty state. Nothing about *money* — budget, scarcity, deadline — changes the page's shape. Three places are genuinely authored: the weekly-limit line, the rotated gold completion stamp (a real internal motif borrowed from `RowCard`), and the diary→income bridge that averages over logged days only.

The in-game echo stays on the right side of the anti-reference line — no gloss, no ornament, 1px borders, 6/8/12 radii, mono numbers. But the reason an in-game shop uses a card grid is that the icon carries item identity, and every card renders the same grey `Package` glyph: ~90px of vertical cost, zero information, and the grid additionally hides most of the shop behind tabs. The grid form is being paid for without the payoff.

**Deterministic scan:** 19 findings, all one advisory rule (`design-system-font-size`, literal `text-[9px]/[10px]/[11px]`). All 19 judged false positives: DESIGN.md itself documents `mono 10px bold tabular-nums` in its components block, and 61 identical literals already exist across 16 files outside this feature. Zero hardcoded colours, zero `shadow-*`, zero `rounded-full` in the feature. Real issues from the deterministic scan: 0.

## Overall Impression

The mechanics are solid and the design-system discipline is real; what's missing is a point of view about *money under a deadline*. The single biggest opportunity: the app already knows gold-per-day and which item is cheapest to drop, and still answers "you're short 4,000" with a bare red integer.

## What's Working

1. **`ShopGrid` is shared between the player surface and the admin preview** — the super-admin authoring templates literally sees the player's shop, drafts dimmed via a `dimmed` prop. Drift is structurally impossible.
2. **`QtyField`'s draft-on-blur design** — `key={value}` remount so a committed change resyncs while the DOM holds the draft mid-typing, motivated by a real domain fact (Mora Coin caps at 5,000/week).
3. **The diary → income shortcut** — averaging over *logged* days only so skipped days don't fabricate a lower number, then showing the value inline before you commit.

## Priority Issues

- **[P0] The answer leaves the screen when the decision is made (mobile).** `PlanSummary` stacks to three rows above the tabs and grid; by the third card the shortfall has scrolled away and every later tap is blind. Fix: below `sm`, collapse it into a sticky bottom bar carrying gold-needed and left-over/short. Command: `/impeccable adapt`
- **[P1] Screen readers get the controls but not the information.** The card body's `aria-label="{name} +1"` overrides its children, erasing price and weekly limit from the a11y tree; the card body and the in-card + button share one accessible name; every `QtyField` announces bare "Quantity"; `role="tablist"` has no `aria-controls`/tabpanel/arrow keys. Command: `/impeccable harden`
- **[P1] A weekly planner that forgets every week.** `pruneStaleBuyPlans` deletes the prior week on mount; a weekly plan is ~80% identical week to week. Fix: archive instead, and offer "Repeat last week" clamped to current stock. Command: `/impeccable delight`
- **[P2] The same number has two control panels.** Quantity is editable in the card row and again in the will-buy row (which adds a slider that is ~25 units/pixel at stock 5,000). Fix: cards own quantity, the will-buy section becomes a read-only receipt. Command: `/impeccable distill`
- **[P2] Labels that say the wrong thing.** "Weekly limit: 3/5" prints remaining under a *limit* label; Thai "ซื้อครบแล้ว" claims a purchase state that doesn't exist; the two empty-state buttons both open the same dialog at the same scroll position. Command: `/impeccable clarify`

## Persona Red Flags

**Alex (power user, 4 accounts, 30 items):** no search or filter in the shop; no bulk clear and no copy-plan-to-another-account, so he retypes near-identical plans four times; MAX is gated off exactly where he wants big round numbers (unlimited items); the account-switch entrance replays on his ninth switch.

**Sam (keyboard + screen reader):** `CategoryTabs` claims tab semantics it can't deliver (no `aria-controls`, no tabpanel, no roving tabindex); the card body's `aria-label` destroys the price for AT; duplicate accessible names between card body and + button; the range input is a third control for the same value with no `aria-valuetext`; `PlanSummary` had no heading and no live region, so the page's answer was unreachable by structure and its changes were never announced.

**Casey (one-handed, phone, in-game):** four targets across ~140px inside a whole-card +1 button, with 24×24px steppers and no undo; the budget is off-screen while tapping; the income pencil sits visually on the *gold-needed* tile once the tiles stack; `CatalogDialog` drops its column headers below `sm`, leaving unlabeled input soup.

## Minor Observations

- The ×N badge overlapped the truncated item name (`truncate` can't see an absolutely-positioned sibling).
- Gold is overloaded inside one card: price colour, maxed border, and completion stamp all read gold.
- Role colours leak onto decorative icons (`Store` gold, `ShoppingBasket` accent, `NotebookPen` gold) — the two most semantically loaded colours spent on ornament.
- Thai text in `font-mono` + `uppercase` + positive tracking: Geist Mono has no Thai glyphs, `uppercase` is a no-op, and tracking detaches combining marks.
- No write-failure path anywhere: `setPlanQuantity`, `updateShopItem`, `setDiaryEntry`, `addShopItem` are all floating `void` promises, against the project's own "no silently swallowed promises" rule.
- Page-level loading is a centered string where the layout is fully known — a free skeleton.
- `FirstRunCard` speaks with the checklist's voice because it reuses `dailies.*` keys.

## Questions to Consider

1. If you deleted the card grid tomorrow and shipped a dense ledger list, what would a player actually lose? Either earn the grid with per-item art (the way `MonsterAvatar` earns the tracker's tiles) or drop it.
2. Is this a planner or a shopping list — and does the Thai string already know the answer? A player standing at the Gold Shop wants to tick items off as she buys them; there is no bought state anywhere.
3. Monday 05:00 deletes the plan. Why is the default a blank shop rather than last week's plan, pre-filled and awaiting edits?
