# Roadmap

แผนการพัฒนา ROOC Kit แบ่งตามเฟส แต่ละเฟสควรใช้งานได้จริงด้วยตัวเองก่อนขึ้นเฟสถัดไป

---

## Phase 1 — Core MR Tracker ✅ (เสร็จ 2026-08-10)

เป้าหมาย: กรอกข้อมูลได้ และเปิดดูได้ว่าแถวไหนเลเวลน้อยสุด

- [x] รวบรวม static data: element / row / monster / map — ครบทั้ง 10 ธาตุแล้ว (217 monsters, 59 maps, ผ่าน `pnpm data:check`)
- [x] Sign in with Discord / Google — Auth.js + Drizzle + Railway Postgres — account เป็น optional เสมอ tracker ใช้ได้เต็มรูปแบบโดยไม่ login (ทดสอบ login จริงผ่านแล้ว 2026-08-09)
- [x] หน้ากรอกข้อมูล Quick mode (กรอก row level อย่างเดียว → บันทึกเป็น `estimated`) — `/setup`
- [x] หน้ากรอกข้อมูล Detailed mode (กรอกรายตัว → `confirmed`) พร้อม fill-row และ keyboard navigation (Enter = ช่องถัดไป, ↑↓ = ปรับค่า)
- [x] เก็บข้อมูลลง IndexedDB (Dexie — `monsterLevels` + `settings`)
- [x] Row list + sort `Row Level ASC` / `DESC` + element filter + แก้เลเวล inline ได้จากหน้าแรก
- [x] เลือกจำนวนแถวที่จะแสดง (default 5 / 10 / 20 / ทั้งหมด)
- [x] Monster detail view — แมพ, monster อื่นในแมพ, row / ธาตุ / row level
- [x] UI 2 ภาษา ไทย/อังกฤษ (default en) — ทุก string ผ่าน `useT()`
- [x] Design polish ตาม `DESIGN.md` — ผ่าน design pass "Night Ops" ทั้งแอปแล้ว (2026-08-10; DESIGN.md + `.impeccable/design.json` เขียนจากโค้ดจริง) + เพิ่ม light theme ให้เลือกได้ (dark เป็นค่าเริ่มต้น)
- [x] รูป monster — ได้ asset จริงแล้ว: sprite + กรอบเลเวลจากเกม เสิร์ฟจาก `/public/img` ผ่าน `src/lib/images.ts` (ตั้ง `NEXT_PUBLIC_IMAGE_CDN` เมื่อย้ายขึ้น CDN)
- [x] หน้า Terms of Service + Privacy Policy (สองภาษา) + footer disclaimer
- [x] Landing page ที่ `/` (โครง "Live demo first" — demo row กดเล่นได้จริง) — tracker ย้ายไปอยู่ `/tracker`
- [x] Auth gate ก่อนเข้า `/tracker` และ `/setup`: Discord / Google / ใช้แบบไม่มีบัญชี (จำตัวเลือกไว้ใน local settings; แบบไม่มีบัญชีใช้ได้ครบทุกฟีเจอร์หลัก)

**เสร็จเฟสนี้แล้วควรเลิกใช้ Excel ได้**

---

## Phase 2 — Smart Planning ✅ (เสร็จ 2026-08-10)

เป้าหมาย: ให้แอปตอบได้เองว่าวันนี้ควรไปไหน

- [x] คำนวณ `RowStat` — blockers, maxSameMapBlockers (set cover ตาม PROPOSALS §5), hasMvp/hasMini ของแมพทริปคุ้มสุด
- [x] Sort `Fewest Blockers`
- [x] Sort `Smart Priority` (แถวที่ครบ 10 จมท้ายรายการ — ตั้งแต่ 2026-09-06 จมท้ายในทุก sort รวม `Row order`) + โชว์ "ทริปเดียวคุ้มสุด: แมพ × ตัวถ่วง" บนการ์ด
- [x] Filter: ไม่มี MVP / ไม่มี Mini (ตัดสินจากแมพทริปคุ้มสุดของแถว)
- [x] Filter: แมพที่ไม่ไป (avoid-list) — modal เลือกแมพ จัดกลุ่มตามช่วงเลเวล 20; แถวที่อัปได้เฉพาะบนแมพที่เลี่ยงจะถูกซ่อน/ลดอันดับตาม toggle
- [x] Toggle ระหว่าง hard filter (ซ่อนเลย) กับ soft penalty (ลดอันดับ)
- [x] โหมด MVP (เรียงตาม MR level อย่างเดียว) และโหมด Mini
- [x] Export / Import JSON (import = replace ทั้งหมด มี confirm; schema ใน `src/lib/progress-io.ts` — schema เดียวกับ sync)
- [x] Sort `Row order` (ตามลำดับแถวในเกม — เป็น default) + กติกาแถวไม่ครบ 5 ตัว: ไม่มี row level / ไม่มี blocker / ไม่นับ complete
- [x] Sync progress ขึ้น Postgres สำหรับคนที่ sign in — ตาราง `progress_snapshot` (snapshot ทั้งก้อนต่อ user, JSON schema เดียวกับ Export/Import), `PUT`/`GET /api/progress`; อัปโหลดจากเมนูบัญชี, อัปโหลด+restore จากหน้า Backup — local ยังเป็นแหล่งข้อมูลหลักเสมอ

---

## ~~Phase 3 — Alerts~~ ❌ ยกเลิก (2026-10-08)

เจ้าของโปรเจกต์ตัดสินใจไม่ทำ Card Market Alert แล้ว (countdown รอบตลาด, Discord webhook, cron, PWA/Web Push) — ถอดเมนู "เร็วๆ นี้" ออกจาก navbar และเนื้อหาเรื่อง webhook ออกจากหน้า Privacy แล้ว เลขเฟสถัดไปคงเดิม

---

## Phase 4 — Data Entry Helper

เป้าหมาย: ลดความเจ็บปวดตอน setup ครั้งแรก ซึ่งเป็นอุปสรรคใหญ่สุดของคนใช้ใหม่

- [ ] Paste ตารางจาก Spreadsheet (parse TSV)
- [ ] Screenshot upload + OCR ฝั่ง client
- [ ] (พิจารณาทีหลัง) Desktop helper สำหรับ capture หน้าต่างเกม

> เปรียบเทียบแต่ละวิธีอยู่ใน [PROPOSALS.md](PROPOSALS.md)

---

## Backlog

ยังไม่จัดลำดับ เก็บไว้ก่อน

- ~~ตารางเวลากิจกรรมประจำวัน / ประจำสัปดาห์~~ (ทำแล้ว 2026-08-12 — Dailies)
- ~~Checklist กิจกรรมรายวัน (daily quest, instance)~~ (ทำแล้ว 2026-08-12 — หน้า `/dailies`: เช็คลิสต์รายวัน/รายสัปดาห์แยกตามไอดีเกม, reset ตี 5 / จันทร์ตี 5, template แนะนำจาก super admin ผ่านหน้า `/admin`)
- ~~กรอก Gold รายวันจากหน้า Dailies + เตือนตอนค่ำถ้ายังไม่กรอก + ปฏิทิน Gold ย้อนหลังแบบ PnL calendar~~ (ทำแล้ว 2026-09-06 — การ์ด "Gold วันนี้" บน `/dailies` เขียนลงสมุด Gold เล่มเดียวกับ Shop Planner, สว่างเตือนตั้งแต่ 21:00 เวลาเกมจนกว่าทุกไอดีจะกรอก, ปุ่ม "ย้อนหลัง" เปิดปฏิทินรายเดือนแตะแก้วันเก่าได้, `src/features/gold-diary/`)
- ~~วางแผนซื้อของร้าน Gold Shop รายสัปดาห์~~ (ทำแล้ว 2026-08-14 — หน้า `/shop-planner`: catalog ของในร้านพร้อมหมวดหมู่ที่แก้เองได้, แผนซื้อรายสัปดาห์แยกตามไอดีเกม (reset จันทร์ตี 5), หักลบกับรายรับ Gold โดยประมาณ, บันทึก Gold รายวันดูค่าเฉลี่ยย้อนหลัง (ตั้งแต่ 2026-09-06 แสดงปฏิทิน Gold ย้อนหลังแบบ inline ชุดเดียวกับ `/dailies` เปิดที่วันนี้ให้กรอกได้ทันที), template ของแนะนำจาก super admin ผ่าน `/admin/shop-templates` — สเปคเดิมอยู่ใน `docs/NEW-REQUIREMENTS.md`)
- ~~เครื่องคำนวณความถึก (DEF / PvP rating / PDMG) + เก็บประวัติ build ดูเป็นกราฟ~~ (ทำแล้ว 2026-10-08 — หน้า `/def-planner`: ใส่ build เดียวก็ได้ เลือกเทียบกับ build ที่บันทึกไว้ได้, ผลแยกชั้นพร้อมป้ายสถานะหลักฐาน, ตาราง Ignore 0–40%, ประวัติ + กราฟความถึก/สเตตัส, เก็บในเครื่องเป็นค่าเริ่มต้นและ sync เข้าบัญชีได้แบบ opt-in ต่อเครื่อง — สูตรและหลักฐานใน `docs/defense-formulas.md`)
- DEF Planner รอบถัดไป (ยังไม่ทำ): crit / crit reduction, ธาตุ/race/size, Base DEF + HP เมื่อมีสูตรรองรับ; อัปเดตสูตรเมื่อมีผลทดสอบในเกม (เพิ่ม `FORMULA_VERSION`)
- แชร์ progress หรือเปรียบเทียบกับเพื่อนใน party
- คำนวณว่าถ้าอยากดันธาตุนี้ให้ครบ ต้องใช้เวลาประมาณเท่าไหร่
- ประวัติการอัปเดตเลเวล — ดูย้อนหลังว่าสัปดาห์นี้ดันไปเท่าไหร่
- ปรับ UI ให้ใช้บนมือถือขณะเล่นเกมได้สะดวกยิ่งขึ้น (theme toggle dark/light ทำแล้ว 2026-08-10)
- Sync แบบละเอียดกว่า snapshot (merge ราย record / conflict resolution) ถ้า snapshot ทั้งก้อนเริ่มไม่พอ