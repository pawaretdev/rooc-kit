---
version: 1
slug: "src-app-guide-page-tsx"
primary_target: "src/app/guide/page.tsx"
related_targets: ["src/app/guide/card-upgrade/page.tsx", "src/features/guide/GuideIndex.tsx", "src/features/guide/CardUpgradeGuide.tsx"]
---

# Surface brief: Guide

- Mode: Read. Players check materials before investing in card upgrades; public access without an account.
- Visual authority: inherit Night Ops from DESIGN.md, including existing fonts, theme tokens, tabular numbers and compact borders.
- Structure: guide index links to a dedicated card upgrade article. Seven native radio choices select a grade, followed by seven sequential steps and a total summary. A comparison table covers all grades.
- Mobile: grade choices wrap, material rows stack, totals follow the steps, and only the comparison table scrolls horizontally. The app header uses its compact menu below xl to fit the additional navigation link.
- Content: player-supplied chart and upgrade sequence. Each range uses the chart's first fragment amount; the following card/fragment amount is the star cost. Totals include the original card once. No individual level costs or exchange rates are invented.
- Assets: existing blue/purple fragments via itemIconUrl; yellow uses a labeled Puzzle icon until supplied.
- Locales: Thai and English follow the existing locale provider. Canonical grade names and Awaken retain their game names.
