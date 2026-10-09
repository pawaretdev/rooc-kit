# DEF Planner — สูตรและสถานะหลักฐาน

อัปเดต 2026-10-09 · โค้ด: `src/features/defense/model.ts` (`FORMULA_VERSION = 2026-10-09.1`) · หน้า: `/def-planner`

สรุปจาก research ของเจ้าของโปรเจกต์ (`FORMULA-SPEC.md` + `WEB-REQUIREMENTS.md` + `def-research/` ใน workspace ROOC research, 2026-10-07 ถึง 2026-10-09 — ไฟล์ต้นทาง/bytecode/source ไม่ได้อยู่ใน repo นี้) เก็บเฉพาะส่วนที่เว็บใช้จริงและเหตุผลที่เลือก ถ้าสูตรเปลี่ยน ให้แก้ทั้ง `model.ts`, ไฟล์นี้ และขยับ `FORMULA_VERSION`

## ขอบเขต

- PvP เท่านั้น แยก Physical/PDEF กับ Magic/MDEF เสมอ
- แต่ละชั้นคำนวณแยกและติดป้ายโมเดล; "ผลรวม" = คูณเฉพาะชั้นที่ input ครบ เรียกว่าผลรวมตามสมมติฐานของโมเดล — **ไม่ใช่ final damage และไม่ตัดสินว่า "รับไหว"**
- ไม่มี Crit / Crit Damage Reduction, HP, Base DEF, ธาตุ, race/size (ผู้ใช้สั่งตัดออกรอบนี้)
- ช่องว่าง = `null` ไม่ถูกนับเป็น 0; ค่าที่อ่านไม่ได้/นอกช่วง (NaN, Infinity, ติดลบ, Ignore% > 100, เลเวลไม่ใช่จำนวนเต็ม) = ไม่สร้างผล
- ใส่ build เดียวก็ใช้ได้ (ไม่บังคับเทียบ A/B) — การเทียบทำได้โดยเลือก build ที่บันทึกไว้ในประวัติ

## ชั้นที่ใช้

| ชั้น | สูตร | สถานะ | ป้ายใน UI |
|---|---|---|---|
| DEF (C01) | `Raw = Equip/(1+DEF%)` → `Eff = max(Raw−Flat,0)×(1+DEF%)×(1−min(Ignore%,40%))+Refine` → `max(5Lv/(Eff+5Lv), 0.05)` | candidate — ตรงกับ branch PvP ของ source server ROO รุ่นเก่าทุกขั้น + Excel/ROOG; Raw มี client F01/F03 รองรับ, curve 5Lv เห็นใน client ROOC เฉพาะ `BuffMagDamWithMdef`; ยังไม่เจอ producer ของ ROOC | ประมาณการ (เส้นประ) |
| Ignore cap | `effective = min(entered, 40%)` ทั้ง PDEF/MDEF | คำอธิบายในเกม (ผู้ใช้รายงาน); clamp 100% ใน Lua ไม่ใช่ combat cap | แสดง entered → used เมื่อเกิน |
| PvP rating (F10) | `D = OpponentBonus − OurReduction`, `×(1 + sign(D)·f(|D|))` | confirmed_client + 7 จุดฐานตรง tooltip ในเกม | จากไฟล์เกม (เส้นทึบ) |
| PDMG | `×(1 + clamp((Bonus%−Reduction%)×0.5%, ±25%))` | candidate (BV sheet); cap เป็นสมมติฐานของชีต | ชีตชุมชน + เตือนเมื่อชน cap |
| MDMG | `relative = 1 + (Bonus%−Reduction%−50.47)×0.72%` | candidate เทียบ baseline ของชุดทดลอง BV เท่านั้น | แสดงแยก ไม่คูณรวม, ≤0 = "นอกช่วงโมเดล" |
| PDMG/MDMG เส้นตรง (เทียบ) | `max(1 + (Bonus%−Reduction%)/100, 0.1)` | comparison_only — term ใน client Lua + source ROO ส่งค่าเข้าไปตรงๆ; producer ของ ROOC ยังไม่เห็น | บรรทัด "สูตรเส้นตรงของ client" ใต้ชั้น PDMG และในกล่อง MDMG — ไม่คูณรวม |

**PDMG ยังใช้ BV เป็นตัวหลัก** (เจ้าของตัดสิน 2026-10-09) และแสดงสูตรเส้นตรงไว้เทียบ — ห้ามสลับไปใช้เส้นตรงในผลรวมโดยไม่ตัดสินใหม่

### F10 ตาราง (ห้าม interpolate แบบเส้นตรง)

`i = min(floor(x/300), 8)`, `f(x) = slope[i]·(x−start[i]) + base[i]`

| x | slope | start | base |
|---|---:|---:|---:|
| 0–<300 | 0.0000775 | 0 | 0 |
| 300–<600 | 0.0000375 | 300 | 0.04 |
| 600–<900 | 0.0000525 | 600 | 0.06 |
| 900–<1200 | 0.0000225 | 900 | 0.08 |
| 1200–<1500 | 0.000035 | 1200 | 0.10 |
| 1500–<1800 | 0.000015 | 1500 | 0.12 |
| 1800–<2100 | 0.0000175 | 1800 | 0.15 |
| 2100–<2400 | 0.0000075 | 2100 | 0.18 |
| ≥2400 | 0 | 0 | 0.20 |

ไม่คูณ base coefficient ของ PvP (0.3/0.6/0.7) ซ้ำ เพราะไม่รู้ skill path — ใช้เฉพาะ rating term

### การแสดงผล

- ตัวเลขหลัก = **ลดดาเมจได้** `1 − (ผลคูณชั้นที่รวม)` ยิ่งสูงยิ่งถึก (เดิมแสดง "% ผ่าน" แต่ผู้ใช้อ่านกลับด้าน — เปลี่ยน 2026-10-08); ถ้าผลคูณ > 1 แสดงเป็น "ดาเมจเพิ่มขึ้น"
- แต่ละชั้นแสดงผลเป็น "ลด / เพิ่ม X%" และตำแหน่งในช่วงที่โมเดลเป็นไปได้ (`standing.ts`): DEF 0→95% (floor 0.05), PvP rating ±20%, PDMG ±25% — "เต็มเพดาน" เมื่อถึงขีดบนของโมเดล
- ใต้ตัวเลขหลักแสดงที่มาเป็นผลคูณ เช่น "ทะลุมาถึงตัว 21.9% = ชั้น PDEF 19.1% × PvP rating ×1.044 × PDMG ×1.100" — ชั้นต่างๆ **คูณ** กัน ห้ามเอา % มาบวกลบ
- **จุดอ่อน** = ชั้นที่คู่ต่อสู้ได้เปรียบ (รวม MDMG เมื่อ Bonus เขา > Reduction เรา แม้ไม่อยู่ในผลรวม) + บรรทัด **"ถ้าดันให้เสมอ"** (`evenOutWeakSpots`): ตั้งชั้นที่แพ้เป็น ×1 แล้วคำนวณใหม่ พร้อมบอก stat ที่ต้องเพิ่ม (= ส่วนต่างพอดี) — เลือก "เสมอ" เป็นเป้าเพราะไม่ต้องอาศัยโมเดลเกินจุดนั้น
- กล่อง MDMG นำด้วย "เรา/เขาได้เปรียบ" (เครื่องหมายของส่วนต่างไม่ขึ้นกับโมเดล) แล้วจึงตัวคูณเทียบ baseline BV; เตือนเมื่อตัวคูณเกิน ±25% จาก 1 (ไกลกว่าข้อมูลที่ชีตมี) ให้อ่านแค่ทิศทาง
- **ไม่มีเกรด ถึก/บาง/รับไหว** — ไม่มีข้อมูลประชากรหรือ HP ให้เทียบ ใช้ "จุดอ่อน" (ชั้นที่คู่ต่อสู้ได้เปรียบ) + ประวัติของตัวเองแทน

### ช่วง 4 สมมติฐาน

ชั้น DEF แสดงช่วงจาก Flat Ignore (หัก Raw / หัก Final) × Refine (บวกหลัง / ก่อน Ignore%) ภายใต้ curve เดิม — **ไม่ใช่ confidence interval และไม่ครอบคลุมความไม่แน่นอนของ curve**

ตั้งแต่ 2026-10-09 ค่าหลัก (หัก Raw + Refine บวกหลัง) คือลำดับที่ source ROO ใช้ ช่วงนี้จึงถูกลดเป็นบรรทัด "ถ้า ROOC เรียงต่างจาก source ROO" และแสดงเฉพาะเมื่อสมมติฐานให้ผลต่างกันจริง (Flat Ignore = 0 และ Refine = 0 → ไม่แสดง)

## หลักฐานใหม่ 2026-10-08/09

- **Source server ROO รุ่นเก่า** (`Cópia de RO(1).7z`, `rogamelibs/battle/damage_def.cpp`, `DamageLuaArgs::CalculatorProcess`): เขียน `def_jianshang/mdef_jianshang` จริง ฝั่ง PvP = `E = [max((D−I)(1+p),0) + max((S−Is)(1+p),0)]×(1−q)`, `max(1 − (E+R)/(E+R+5L), 0.05)` (D = Raw DEF ไม่รวม %, S/Is = DEF โล่และ Ignore ของโล่, R = Refine DEF) — ตรงกับ C01 (ต่างแค่โล่ถูกหักแยก ซึ่งให้ผลเท่ากันเมื่อไม่ชน 0) ข้อจำกัด: เป็น ROO รุ่นเก่ามาก (ยังไม่มี PvP rating, `ATTR_MAX_COUNT = 348`, ไม่มี stat 573/574) ไม่มีเพดาน Ignore 40% ในโค้ด (Lua clamp 100% แบบมีเงื่อนไข) — 40% ยังอิงคำอธิบายในเกม
- **PDMG/MDMG** (ตรวจเพิ่มตอนอัปเดตเว็บ — research ยังไม่ได้สรุปข้อนี้): สูตรสกิลใน client ROOC ใช้ `max(npc_dam + up/10000 − down/10000, 0.1)` (328 จุดฝั่งกายภาพ, 97 จุดฝั่งเวท; `npc_dam = 1` เมื่อเป้าเป็นผู้เล่นใน source ROO) และ source ROO ส่ง PDMG Bonus (stat 65) / Reduction (stat 67) เข้าไปตรงๆ ไม่คูณ 0.5 ไม่มี cap; attribute calculator ของ ROOC แค่บวก BOTH เข้าไป — ขัดกับโครง BV ส่วน "ผลแค่ครึ่งเดียว" ที่ชุมชนเห็น อธิบายได้ด้วยฐาน `1 + Bonus − Reduction` ที่สูงกว่า 1 และดาเมจคงที่ที่ไม่ผ่านชั้นนี้; เช็ก MDMG ของ BV: เส้นตรงเทียบ baseline 50.47 ให้ความชัน 1/150.47 ≈ 0.66%/จุด ใกล้ 0.72% ที่ชีต fit — ยังไม่รู้ว่า producer ของ ROOC ปรับค่าก่อนหรือไม่
- **Retained reduction หลัง Ignore** (stat 573 `ATTR_DEF_REDUC_LIMI` / 574 `ATTR_MDEF_REDUC_LIMIT`, "อย่างน้อยคงเหลือ N%"): จาก Spirit ครบชุด 5 ตัว (3–20% ตามเกรด, client เลือกชุดเดียว) และ Antique resonance (+3/+1/+0.5% ต่อแถว) — ยังไม่รู้ consumer/ตำแหน่งในสูตร จึงไม่ใส่สูตร แจ้งเป็นข้อจำกัดใน "สิ่งที่ยังไม่ยืนยัน" ของหน้าแทน
- **Curve 55% ของคลิป Mima มีใน client ROOC จริง** แต่เป็น F11 `CrusaderReflexHMT` (Paladin Reflect Shield) อ่าน PvP Reduction ฝั่งรับอย่างเดียว ไม่หัก Bonus — general PvP ยังเป็น F10 cap 20%
- **ไม่เปลี่ยน**: Android 2.0.4 ใช้ attribute script + F10 ตรงกับ PC, HotUpdate ไม่มี Lua ใหม่, ตาราง Refine ตรงกับ ROO เก่าครบ 168 แถว → F01/F10/150 bytecode cases ยังใช้ได้
- **เส้นทางที่ข้าม DEF / post-processing**: Asura, `PhysicalSkillCalcReal/MagicSkillCalcReal`, ดาเมจตาม HP/คงที่/สะท้อน มีเส้นทางแยก; shield, เพดาน 15% Max HP ของ affix เฉพาะ, HP budget ต่อช่วงเวลา (`LimitHudunBeHit`) แก้ผลหลังสูตร — หน้าเว็บระบุใน scope ว่าไม่ครอบคลุม
- ผลทดลองในเกม: ยังไม่มี (`combat-test-log.csv` ว่าง)

## การทดสอบ (`pnpm test`)

- `model.test.ts`: F10 ตรงกับ **150 กรณีที่ dump จาก bytecode ต้นฉบับ** (`pvp-bytecode-cases.json` — สร้างจาก `PvpDamProcess` ด้วย LuaJIT, mock เฉพาะผู้เล่นและ neutralize ชั้นอื่น เหมือน `verify_pvp.lua`), จุดฐาน tooltip 7 จุด, ขอบช่วง/สองเครื่องหมาย/cap, ตัวอย่าง spec (Lv99 MDEF 360 → 495/855), Ignore cap, PDMG cap, MDMG ≤0, สูตรเส้นตรง (1:1, floor 0.1, ไม่เข้าผลรวม), ช่องว่างไม่เป็น 0, NaN/Infinity ไม่สร้างผล, A=B → 0
- `history.test.ts`: merge ประวัติ (LWW ต่อ record + tombstone), validation, จุดกราฟ

## สิ่งที่ยังไม่ยืนยัน (ไม่บล็อกงานเว็บ)

- ลำดับ Ignore/Refine และ curve 5Lv ของ ROOC เอง (source ROO ตอบแล้ว แต่ยังไม่เจอ producer ของ ROOC และยังไม่ได้ทดสอบ) · ROOC ปรับ PDMG/MDMG ก่อนเข้า term เส้นตรงหรือไม่ (BV vs เส้นตรง) · cap PDMG จริง · ตำแหน่ง/การ stack ของ retained reduction 573/574
- ห้ามใช้: curve 55% กับ general PvP (เป็นของ Reflect Shield F11 เท่านั้น), linear interpolation ของ BV sheet, gap 30 เป็นเกณฑ์ถึก/บาง, อัตรา Bonus:Reduction 2:1, `1 MDEF = 4 PDEF`, ผลรวมแถว retained reduction เป็น floor ที่ยืนยันแล้ว

## Export JSON

`buildDefenseExport` (`export.ts`) — input, ผลแยก layer (รวม entered/effective Ignore), model IDs + สถานะ (รวม `dmgLinear` = `comparison_only`; ค่าอยู่ใน `results.*.dmg.linear` / `mdmg.linear`), `formulaVersion`, `scope`, `status: "estimate"`, `inGameVerified: false`, และผลเทียบเมื่อเลือก build อ้างอิง; สร้างในเบราว์เซอร์ ไม่ส่งออก backend
