# Product

## Register

product

> หน้าแอป (tracker/planner) เป็น register หลัก แต่มี landing page เป็น surface รอง (register: brand) ไว้แนะนำเครื่องมือให้ผู้เล่นคนอื่น — landing ทำแล้ว (2026-08-10) อยู่ที่ `/` โครง "Live demo first"; brief อยู่ที่ `.impeccable/surfaces/src-app-page-tsx.md`

## Users

ผู้เล่น Ragnarok Origin Classic ที่จริงจังกับการฟาร์ม Monster Research ใช้งานสองบริบทเท่าๆ กัน:

- **Desktop ตอนกลางคืน** — วางแผนก่อนตั้ง auto party: กรอกข้อมูลจำนวนมาก, ดู Smart Priority, ตัดสินใจว่าคืนนี้จอดแมพไหน
- **มือถือระหว่างเล่น** — เช็คเร็วๆ ระหว่างรอ MVP เกิด / อัปเดตเลเวลหลังฟาร์มเสร็จ

ระยะยาวตั้งใจเปิดให้ผู้เล่นคนอื่นใช้ด้วย: login ผ่าน Google/Discord เพื่อ sync ข้อมูล MR ข้ามอุปกรณ์ หรือใช้แบบ local-only (localStorage/IndexedDB) ถ้าห่วง privacy — ทั้งสองโหมดเป็น first-class

## Product Purpose

ตอบคำถามเดียวให้เร็วที่สุด: **"คืนนี้ควรฟาร์มที่ไหน?"** — เกมไม่มี public API ผู้เล่นเลยต้องจำเองหรือใช้ spreadsheet; ROOC Kit เก็บ Monster Research progress ไว้ที่เดียวแล้วแปลงเป็นคำแนะนำ (Smart Priority) บวกแจ้งเตือน restock ตลาดการ์ด สำเร็จเมื่อผู้เล่นเปิดแอปแล้วได้คำตอบภายในไม่กี่วินาที ไม่ใช่ได้ "ข้อมูลดิบมากองให้ดู"

## Brand Personality

**อบอุ่น · มีชีวิต · แม่นยำ** — "Guild Companion ที่มีวินัยข้อมูลแบบ Ops Console"

- เปลือกอบอุ่นมีกลิ่น RO: โทนอุ่นเข้ม accent ชมพู Poring + ทอง มุมโค้ง ภาษา UI ชวนคุยเหมือนเพื่อนร่วมกิลด์ช่วยวางแผน
- ไส้ในเป็น console: ตัวเลข tabular/monospace ตารางแน่น อ่านจบในครึ่งวินาที สีเตือน (blocker) สงวนไว้ใช้จริงเท่านั้น
- ความ "น่ารัก" ห้ามแลกกับความเร็ว — ข้อมูลหนาแน่นมาก่อนการตกแต่งเสมอ

## Anti-references

- **UI เกมมือถือจ๋าๆ** — ปุ่มทองเงาวับ กรอบประดับ ornament เอฟเฟกต์ทุกการกด แถบ VIP/gacha — ห้ามเลียนแบบ UI ในเกมมาทั้งดุ้น
- **ธีม/asset ทางการของเกม** — ไม่ใช้โลโก้ ฟอนต์ หรือภาพ official จนดูเหมือนของ Gravity/ทางการ (กันสับสน + ปัญหาลิขสิทธิ์) — กลิ่น RO ต้องมาจาก palette/รูปทรง/สำนวน ไม่ใช่ asset

## Design Principles

1. **Answer first** — ทุกหน้าจอนำด้วยคำตอบ ("ไปแมพนี้") ก่อนข้อมูลประกอบ ไม่ใช่ตารางดิบให้ผู้ใช้คิดเอง
2. **Warm shell, sharp numbers** — บุคลิกอบอุ่นอยู่ที่เปลือก (สี มุมโค้ง สำนวน) ส่วนตัวเลข/ตารางคุมวินัยแบบ console: tabular-nums, แถวชิด, จัดแนวตรง
3. **One glance on mobile, full plan on desktop** — มือถือคือเช็คเร็ว/แก้เลเวลหลังฟาร์ม, desktop คือ bulk entry และวางแผน — ออกแบบทั้งคู่เท่ากันตั้งแต่แรก ไม่ใช่ desktop-first แล้วค่อยบีบ
4. **Game flavor without game assets** — ความเป็น RO สื่อผ่านสี รูปทรง และภาษา ไม่พึ่ง asset ทางการ
5. **Trust through honesty** — สถานะข้อมูลต้องเห็นชัด: เลเวล `estimated` vs `confirmed` แยกด้วยรูปทรงไม่ใช่สีอย่างเดียว, จุดยืน privacy (local-only ได้เสมอ) พูดตรงๆ ใน UI

## Accessibility & Inclusion

- เป้าหมาย **WCAG 2.1 AA**: contrast ≥4.5:1 (ข้อความปกติ) / ≥3:1 (ข้อความใหญ่), keyboard navigation ครบ (สำคัญมากกับหน้า bulk entry), `prefers-reduced-motion` ทุกแอนิเมชัน
- ธาตุทั้ง 10 ใช้สีประจำธาตุได้ แต่ต้องมีไอคอน/ตัวอักษรกำกับเสมอ — ไม่พึ่งสีอย่างเดียว (กันตาบอดสี)
- รองรับ dark/light ตาม system ทั้งคู่ตั้งแต่แรก (ผู้ใช้หลักเล่นกลางคืนจอมืด แต่ light ต้องไม่เป็นพลเมืองชั้นสอง)
