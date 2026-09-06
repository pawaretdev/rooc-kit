---
name: ROOC Kit
description: Companion planner for Ragnarok Origin Classic — "Night Ops": dark-first gamer-tool console with one blaze-orange accent (light theme opt-in)
colors:
  bg: "oklch(0.2 0.015 255)"
  surface: "oklch(0.24 0.016 255)"
  surface-2: "oklch(0.28 0.018 255)"
  ink: "oklch(0.93 0.008 250)"
  sub: "oklch(0.7 0.02 250)"
  line: "oklch(0.33 0.02 252)"
  accent: "oklch(0.68 0.19 40)"
  accent-ink: "oklch(0.17 0.03 40)"
  gold: "oklch(0.76 0.11 80)"
  gold-ink: "oklch(0.22 0.05 80)"
  danger: "oklch(0.62 0.17 25)"
  tip-bg: "oklch(0.14 0.012 255)"
  tip-ink: "oklch(0.93 0.008 250)"
typography:
  headline:
    fontFamily: "Poppins, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    letterSpacing: "-0.025em"
  hero:
    fontFamily: "Poppins, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 800
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Poppins, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
  body:
    fontFamily: "Poppins, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Poppins, Noto Sans Thai, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  number:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    fontVariation: "tabular-nums"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
components:
  card-row:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.xl}"
    padding: "16px"
  gate-card:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.xl}"
    padding: "24px"
    width: "max-w-sm, centered"
    entrance: "animate-rise-in"
  nav-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.lg}"
  sidebar-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.lg}"
  button-cta:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
    typography: "font-semibold + ArrowRightIcon; hover brightness-107; .press"
  button-provider:
    backgroundColor: "transparent"
    border: "1px solid {colors.line}"
    rounded: "{rounded.lg}"
    height: "40px"
    typography: "shadcn Button variant=outline size=lg + brand mark; hover bg-surface-2"
  badge-row-level:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    typography: "{typography.number}"
    rounded: "{rounded.md}"
    variants: "completed = bg-accent/text-accent-ink; pops with animate-lv-pop when the row level rises"
  proof-fragment:
    backgroundColor: "{colors.surface}"
    border: "1px solid {colors.line}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
    typography: "font-mono text-xs tabular-nums, text-sub with bold ink numbers; element dot or 1.75-stroke icon in front"
  sample-tag:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    border: "1px dashed {colors.gold}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
    typography: "text-xs font-medium tracking-wide"
  monster-tile:
    size: "56px"
    rounded: "{rounded.lg}"
    frame: "in-game frame image /img/ui/frame-{tier}.png — tier = min(level, 6) + 1 (gray Lv 0 → gold Lv 6+)"
    sprite: "/img/monsters/{id}.png inside the frame (letter fallback on 404)"
    kindBadge: "mvp.png / mini.png at the frame's top-left (in-game position)"
    variants: "estimated (dashed gold outline) · danger/blocker (orange-red outline + red corner badge + BlockerIcon top-right)"
  tile-level-badge:
    position: "corner -right-1.5 -bottom-1.5"
    typography: "mono 10px bold tabular-nums"
    variants: "normal (surface-2/ink) · blocker (danger/white) · maxed (gold/gold-ink)"
---

# Design System: ROOC Kit — "Night Ops"

> บันทึกจากโค้ดที่ ship จริง ณ 2026-08-10 (รอบสอง — เพิ่ม landing/auth surfaces + theme system) — ground truth คือ `src/app/globals.css`, `src/app/layout.tsx`, `src/components/`, `src/features/` เมื่อโค้ดกับเอกสารนี้ขัดกัน ให้ยึดโค้ดแล้วอัปเดตเอกสาร
>
> ที่มา: ผู้ใช้เลือก direction **A "Night Ops"** จาก proposal 4 แบบ แล้วสลับ accent เป็นส้มของ direction D; "โครง" (sidebar ธาตุ / tile รูปมอนสเตอร์ / tooltip / inline editor) ล็อกตาม artifact ที่อนุมัติ; โครง landing "Live demo first" อนุมัติจาก comp `.impeccable/mocks/landing-live-demo-first.approved.html` — แทนที่ทั้ง "Guild Companion warm-dark" และ "Origin Sky pastel" ก่อนหน้า

## Overview

**Creative North Star: "เครื่องมือจอสองข้างเกมตอนกลางคืน"**

คอนโซลมืดโทนเทาน้ำเงินเย็น (hue ~255) แบบเครื่องมือเกมเมอร์ (Raidbots/WoWhead) — เส้นขอบบาง 1px, มุมโค้งน้อย (6–12px), ตัวเลข mono `tabular-nums` ทุกจุด, ไม่มีของประดับ **Dark-first**: ค่าเริ่มต้นคือมืด (เปิดคู่เกมตอนกลางคืน) และมี light theme "กลางวันของคอนโซลเดียวกัน" เป็น opt-in ผ่าน ThemeToggle (`:root.light` ใน globals.css — ส้ม/ทอง/แดงถูกกดเข้มลงให้ผ่าน 4.5:1 บนพื้นสว่าง; toggle มีเสียงคลิกสวิตช์ไฟ `rocker-switch.wav` และกัน FOUC ด้วย boot script ใน layout) สีหน้าที่เข้มงวด: **ส้มแสด** (`--accent`) = จุดตัดสินใจ/สถานะ active ทั้งหมด, **ทอง** = เลเวล/ความคืบหน้า/estimated, **แดง** = blocker เท่านั้น

**ผังหน้า:** `/` = landing (Persuade), `/tracker` = ตัว tracker (Operate, หลัง AuthGate), `/setup` = Backup/เครื่องมือเหมา (ถึงจาก tracker ไม่อยู่ใน header)

**โครงหลัก (locked structure):**
- **Element sidebar** ซ้ายมือ (desktop `lg:` sticky คอลัมน์ 200px, mobile ยุบเป็นแถบเลื่อนนอน) — ทุกธาตุ + 10 ธาตุ พร้อมตัวนับ `maxed/total` แบบ mono; ธาตุที่ครบแสดง CheckIcon ทอง; active = พื้นส้มเต็ม
- **แถวมอนสเตอร์เป็น tile 56px** (`MonsterAvatar size="lg"`) — **กรอบเป็นรูปจากเกมตามเลเวล** (`frame-1..7.png`: เทา Lv 0 → ทอง Lv 6+, mapping ใน `frameImageUrl`), sprite อยู่ในกรอบ ชิดขอบล่างเสมอ (`object-contain object-bottom` — รูปแนวนอนจะไม่ลอยกลางช่อง; fallback อักษรแรก+tint ธาตุเมื่อไฟล์หาย), badge MVP/Mini ของเกมที่มุมซ้ายบน; ชื่ออยู่ใน **tooltip** (`.tile-tip` — hover/focus-visible) + เลเวลตัวเลขเป็น badge มุมขวาล่าง
- **คลิก tile → inline editor กางใต้แถว** (`animate-rise-in`): ชื่อ, KindTag, สถานะ confirmed/estimated, Base Lv, LevelStepper, รายชื่อแมพ — แทน modal เดิม (MonsterDetail ถูกลบ)
- **หน้ากรอกรวมกับหน้าดู**: FillRowControl (เติมทั้งแถว — เขียนเป็นค่า confirmed เหมือนเครื่องมือเหมา; สถานะ estimated เหลือไว้รองรับข้อมูลเก่า/นำเข้า) อยู่ใน header ของ RowCard
- **Landing "Live demo first"** (`src/features/landing/`): viewport แรก = headline + CTA ส้มคู่ **DemoRowCard** (แถว Earth·Row 1 จริง เล่นได้ กด tile แล้วเลเวลขึ้น/badge pop — สอนกติกา row-level จริง, state อยู่ในหน้าไม่แตะ progress ผู้ใช้, ติดป้าย `sample-tag` เส้นประทอง) → ledger 3 ฟีเจอร์ (แถวคั่น `border-t border-line` ไม่ใช่ icon cards, แต่ละแถวพิสูจน์ด้วย **proof fragment** = ชิ้น UI จริงแบบ mono chip) → แถบ privacy 3 ข้อ → CTA ปิดกลางหน้า
- **Auth เป็นสอง surface ใช้ไส้ร่วมกัน** (`ProviderSignInButtons` + `LegalNotice`): **SignInDialog** (modal จากปุ่ม Sign in บน header — shadcn Dialog) และ **AuthGate** (การ์ดคั่นหน้า `/tracker` + `/setup` ครั้งแรก: Discord / Google / "ใช้แบบไม่ล็อกอิน" — ทางเลือก anonymous ต้องอยู่เสมอ core features ห้ามบังคับ sign-in)

## Tokens

สีทั้งหมด OKLCH บน `:root` (dark = ค่า canonical ตาม frontmatter) และนิยามซ้ำครบชุดใน `:root.light` — map ผ่าน `@theme inline` — component อ้าง Tailwind token (`bg-surface`, `text-sub`, `border-line`, `bg-accent`, `text-gold-ink`, …) เท่านั้น ห้าม hardcode สีธาตุ 10 ตัว (`--el-*`) ใช้กับ dot ธาตุ + tint ตัวอักษร fallback; คลาสเป็น static string ใน `ELEMENT_TEXT`/`ELEMENT_TINT` Token พิเศษ: `--tip-bg`/`--tip-ink` (tooltip เข้มทั้งสองธีม), `--frame-ink` (ตัวอักษรในกรอบรูปเกม — กรอบสว่างทั้งสองธีมเลยไม่พลิกตามธีม)

**shadcn/ui bridge:** `components/ui/*` (button, dialog, select, input, checkbox, tooltip, …) ต่อเข้าระบบผ่าน token bridge ใน `globals.css` (`--color-card/popover/primary/secondary/muted/border/input/ring` → token Night Ops) + `@custom-variant dark` ทำให้ `dark:` utilities ทำงานกับ class `light` แบบ opt-out; hover/focus แบบ "accent tint" ของ shadcn ถูกแก้เป็น `surface-2` ในไฟล์ component แล้ว — เพิ่ม component shadcn ใหม่ต้อง bridge แบบเดียวกัน ห้ามปล่อยสี zinc/neutral ดิบ

Recipe กลางใน `globals.css`: `.tile-tip` (tooltip ชื่อมอนสเตอร์), `.press` (กดแล้วยุบ scale 0.96), `.animate-rise-in` (editor/gate เข้าฉาก), `.animate-lv-pop` (ฉลองเลเวลแถวขึ้น — signature moment ใช้ทั้ง tracker และ demo บน landing)

## Component rules

- **Radius scale:** การ์ด/sidebar `rounded-xl` (12px) · ปุ่ม/tile/editor/chip `rounded-lg` (8px) · badge/stepper/tag `rounded-md` (6px) — **ไม่มี pill `rounded-full`** ยกเว้น dot ธาตุ; ความ "คม" คือลายเซ็นของ direction นี้ (shadcn Button ค่า default เป็น `rounded-md` — จุดที่ใช้จริงส่ง `className="rounded-lg"` ทับเสมอ)
- **Active state ทุกชนิด** (nav, mode switch, locale, sidebar item) = พื้น `accent` เต็ม + `text-accent-ink` + `font-semibold`; ปุ่มรอง = ขอบ `border-line` hover `bg-surface-2` หรือ hover ขอบ/ตัวอักษรเป็นส้ม
- **CTA (`button-cta`):** ปุ่มส้มเต็มมีได้จุดเดียวต่อ viewport (landing hero, closing CTA) = `bg-accent rounded-lg px-5 py-2.5 font-semibold` + ArrowRightIcon + `.press` + `hover:brightness-107`; ทางเลือกรองเป็นลิงก์ขีดเส้นใต้ `text-sub`
- **Proof fragment (`proof-fragment`):** "หลักฐาน UI จริง" บน landing = chip `rounded-lg border-line bg-surface` ตัว mono `text-xs tabular-nums text-sub` ตัวเลขเด่น `font-bold text-ink` นำด้วย dot ธาตุหรือไอคอน stroke 1.75; fragment แถว trip ใช้ขอบ mix ส้ม `color-mix(in oklab, var(--accent) 45%, var(--line))` — ห้ามแทน pattern นี้ด้วย icon card ลอยๆ
- **Ledger row + gold subline:** ฟีเจอร์บน landing เรียงเป็นแถวคั่น `border-t border-line`; หัวข้อ `text-lg font-bold` มี subline ทอง `text-xs font-medium text-gold` ใต้ชื่อ (ทอง = คำสัญญาเรื่องความคืบหน้า สอดคล้อง gold=progress)
- **Gate card (`gate-card`):** การ์ด `max-w-sm rounded-xl border-line bg-surface p-6` เข้าฉากด้วย `animate-rise-in`; หัวเรื่องนำด้วย BlobMark สีส้ม; ตัวคั่น "หรือ" = เส้น `h-px bg-line` สองข้าง + ตัวจิ๋ว `uppercase tracking-widest text-sub`; หมายเหตุ anonymous ใส่กรอบ **เส้นประ** `border-dashed border-line` (เส้นประ = ยังไม่ commit ตามกติกา Dashed-Means-Unconfirmed)
- **Provider buttons (`button-provider`):** shadcn `Button variant="outline" size="lg"` + `rounded-lg` + `.press` + brand mark สี official; ตอน pending เปลี่ยน label เป็น loading + `disabled`; error เป็น `role="alert" text-danger` (จุดเดียวที่ danger ปรากฏนอก blocker — คือ auth failure จริง ไม่ใช่ตกแต่ง)
- **Brand-mark exception:** `DiscordMark` (#5865F2) และ `GoogleMark` (4 สี official) เป็น **ข้อยกเว้นเดียว** ของกติกา token-only/one-accent — สี hardcode คงที่ทั้งสองธีม เฉพาะโลโก้ third-party เท่านั้น; `BlobMark` ของเราเองยังใช้ `currentColor` (ปกติ = accent)
- **Tile states** (คู่รูปทรง+สีเสมอ): เทียร์เลเวล = กรอบรูปจากเกม; blocker = outline แดง + badge เลขแดง + BlockerIcon **มุมขวาบน** (ซ้ายบนสงวนให้ badge MVP/Mini ตามเกม) + ระบุใน tooltip/aria-label; estimated = outline เส้นประทอง; maxed = badge เลขทอง; selected = outline ส้ม 2px offset; row completed = badge เปลี่ยนทอง→ส้ม
- **ตัวเลขเทียบกันได้ทุกตัว** = `font-mono tabular-nums` (Lv badge, ตัวนับ sidebar, stepper, fill input, proof fragment)
- **Touch:** stepper 28px ขยาย 36px บน `pointer-coarse:` + `::after -inset-1` ให้ hit ≥44px; tile 56px ผ่านอยู่แล้ว
- **A11y:** tile เป็น `<button>` มี `aria-label` (ชื่อ+Lv+blocker) และ `aria-expanded`; sidebar/mode ใช้ `aria-pressed`; nav ใช้ `aria-current="page"`; tooltip เป็น `aria-hidden` (ข้อมูลซ้ำกับ aria-label); focus ring ส้ม global; dialog ใช้ Radix (focus trap ให้ฟรี)
- **Elevation:** โลกนี้แบน — ความลึกมาจากเส้น 1px กับ `surface → surface-2` ไม่ใช่เงา; ชั้นลอย (dialog/select) ใช้ backdrop `bg-black/50` + เงา shadcn ตามมาตรฐาน Radix เท่านั้น ห้ามเพิ่มเงาการ์ดปกติ
- **Motion budget:** `lv-pop` + `rise-in` + `.press` + tooltip fade 120ms + transition สั้น + dialog animate-in/out ของ shadcn เท่านั้น ทั้งหมดปิดใต้ `prefers-reduced-motion`

## Do's and Don'ts

- **Do** อ้างสีผ่าน token; สีใหม่ต้องนิยามทั้ง `:root` และ `:root.light` และผ่าน contrast 4.5:1 บน `surface`/`surface-2` ทั้งสองธีม
- **Do** ให้ทุกสถานะมีรูปทรงคู่สี (ไอคอนชุด stroke 1.75 ใน `icons.tsx`)
- **Do** เก็บลุคที่ใช้ซ้ำเป็น recipe class ใน `globals.css` ไม่ก็อปคลาสยาวใน JSX
- **Do** ธีม: dark คือบ้านหลัก, light เป็น opt-in ผ่าน ThemeToggle (class `light` บน `<html>`, เก็บใน `localStorage["rooc.theme"]`, boot script ใน layout กัน FOUC) — ห้าม pastel
- **Gold calendar (`GoldCalendarDialog`):** ปฏิทินรายเดือนสไตล์ PnL calendar — grid 7 คอลัมน์เริ่มวันจันทร์ (ตรงกับสัปดาห์เกม), ช่องละวันเกม: เลขวันมุมซ้ายบน + ยอด Gold แบบย่อ (`1.2K`/`2.5M`) ชิดล่าง, พื้นช่องเป็น `color-mix(gold 12–67%)` ตามสัดส่วนเทียบวันที่ได้เยอะสุดของเดือน, วันนี้ขอบ `accent/60`, วันที่ยังไม่จดเป็นเส้นประ, อนาคต `opacity-40` + disabled; แตะช่องเพื่อเปิดแถวแก้ไขใต้ grid; ท้าย dialog เป็น stat tile 4 ช่อง (รวม/จำนวนวัน/เฉลี่ย/วันที่ดีสุด) — การ์ด "Gold วันนี้" บน `/dailies` ใช้ขอบ `gold/70` + วงแหวน gold 18% เมื่อถึงช่วงเตือน (21:00 เวลาเกม) และยังไม่กรอก
- **Do** เสิร์ฟ game art (sprite/กรอบเลเวล/badge) จาก `/public/img` ผ่าน helper ใน `src/lib/images.ts` เท่านั้น (`NEXT_PUBLIC_IMAGE_CDN` override ได้ตอนย้ายขึ้น CDN) — asset เหล่านี้ผู้ใช้เป็นคนจัดหา ห้ามดึงโลโก้/ฟอนต์ official เพิ่มเอง
- **Do** พิสูจน์ฟีเจอร์บน surface โน้มน้าวด้วยชิ้น UI จริง (proof fragment / demo เล่นได้) ไม่ใช่ icon card หรือภาพ mock
- **Don't** ใช้ `--danger` นอกบริบท blocker/ความล้มเหลวจริง (auth error); ส้ม/ทองห้ามสลับหน้าที่
- **Don't** hardcode สี — ยกเว้น brand mark third-party (Discord blurple, Google 4 สี) ที่ต้องคงสี official ทั้งสองธีม
- **Don't** ใช้ `rounded-full` (นอกจาก dot ธาตุ) และห้ามปล่อย shadcn component ที่ยังไม่ bridge เข้า token Night Ops
- **Don't** บังคับ sign-in: ทุก gate ต้องมีทาง anonymous ที่เท่าเทียม (ขอบ `border-line` ปกติ ไม่ถูกกดให้ด้อย)
- **Don't** เพิ่ม animation ใหม่โดยไม่มีเหตุผลเชิงความหมาย + fallback reduced-motion
