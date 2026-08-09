/**
 * UI strings only — monster, map, and element names render from static game
 * data (canonical English) and are never translated here.
 *
 * `en` is the source of truth for keys; `th` must cover every key (enforced
 * by the Messages type). Add keys as features grow.
 */

export const locales = ["th", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

const en = {
  "app.title": "ROOC Kit",
  "app.tagline": "Where should I farm today?",

  "nav.monsterResearch": "Monster Research",
  "nav.marketAlert": "Market Alert",
  "nav.settings": "Settings",

  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.edit": "Edit",
  "common.import": "Import",
  "common.export": "Export",
  "common.search": "Search",
  "common.clear": "Clear",
  "common.loading": "Loading…",

  "locale.label": "Language",
  "locale.th": "ไทย",
  "locale.en": "English",

  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",
  "theme.label": "Theme",
  "theme.dark": "Dark",
  "theme.light": "Light",

  "nav.soon": "soon",
  "nav.menu": "Menu",
  "auth.menu": "Account menu",

  "notFound.title": "You warped to a map that doesn't exist",
  "notFound.body":
    "These coordinates haven't been discovered yet — check the URL, or warp back and keep planning.",
  "notFound.backTracker": "Back to Tracker",
  "notFound.backHome": "Home",

  "legal.terms": "Terms of Service",
  "legal.privacy": "Privacy Policy",
  "legal.lastUpdated": "Last updated",
  "legal.fanDisclaimer":
    "ROOC Kit is an unofficial fan project, not affiliated with or endorsed by the developers or publishers of Ragnarok Origin Classic.",

  "auth.signIn": "Sign in",
  "auth.dialog.title": "Sign in to ROOC Kit",
  "auth.signInWith.discord": "Continue with Discord",
  "auth.signInWith.google": "Continue with Google",
  "auth.signOut": "Sign out",
  "auth.syncHint": "Optional — sign in to sync your progress across devices.",
  "auth.localNote":
    "No account needed for the tracker — your data stays in this browser until you upload it to sync.",
  "auth.legalNotice": "By continuing, you accept our {terms} and {privacy}.",
  "auth.error": "Sign-in failed — please try again.",

  "gate.title": "Welcome to ROOC Kit",
  "gate.subtitle": "Choose how to keep your Monster Research progress.",
  "gate.or": "or",
  "gate.anonymous": "Continue without an account",
  "gate.anonymousNote":
    "Anonymous: your data is stored only in this browser — export it as JSON anytime.",
  "gate.syncNote":
    "Signed-in players can sync progress across devices — upload from the account menu or the Backup page. Local data stays the source of truth.",

  "landing.headline": "Where should I farm tonight?",
  "landing.pitch":
    "Ragnarok Origin Classic has no API for your Monster Research, so players track it in spreadsheets or memory. ROOC Kit keeps every research row in one place, shows exactly which monsters are blocking each level, and turns it all into one recommended map trip.",
  "landing.cta.open": "Open Tracker",
  "landing.cta.how": "See how it works",
  "landing.cta.note": "Free, no account needed — or sign in with Discord / Google.",
  "landing.demo.tag": "Sample data — tap the red-ringed monsters",
  "landing.demo.complete": "Row complete — that's the feeling.",
  "landing.what.title": "Three things it does for you",
  "landing.f1.title": "Every row, every blocker",
  "landing.f1.sub": "All 10 elements on one screen",
  "landing.f1.body":
    "A row's level is its lowest monster. The tracker rings the monsters holding each row back, so you always know who to farm next.",
  "landing.f2.title": "Smart Priority",
  "landing.f2.sub": "The best trip for tonight",
  "landing.f2.body":
    "One suggested map trip that clears the most blockers in a single stop — park your party where it actually moves your research forward.",
  "landing.f3.title": "Your data stays yours",
  "landing.f3.sub": "Works without an account",
  "landing.f3.body":
    "Progress lives in this browser and exports as JSON any time. Sign in with Discord or Google when you want cross-device sync — never to unlock features.",
  "landing.frag.maxed": "maxed",
  "landing.privacy1.title": "No game hooks",
  "landing.privacy1.body":
    "Never reads game memory, never automates in-game actions. Manual entry only.",
  "landing.privacy2.title": "Nothing uploaded",
  "landing.privacy2.body":
    "Anonymous use sends nothing anywhere. Sync is opt-in and tied to your own account.",
  "landing.privacy3.title": "Fan project",
  "landing.privacy3.body":
    "An unofficial companion tool — not affiliated with or endorsed by the game's publishers.",
  "landing.close.title": "Stop farming the wrong map.",
  "landing.close.body": "Enter your levels once — ROOC Kit does the thinking.",

  "mr.rowLevel": "Row level",
  "mr.monsterLevel": "Research level",
  "mr.trip.go": "Go to",
  "mr.trip.clears": "clears {n} blockers",
  "mr.trip.clearsOne": "clears 1 blocker",
  "mr.mapHasMvp": "MVP on map",
  "mr.mapHasMini": "Mini on map",
  "mr.demotedFlag": "demoted by filter",
  "mr.completedFlag": "complete",
  "mr.sort.label": "Sort",
  "mr.sort.rowOrder": "Row order",
  "mr.sort.rowLevelAsc": "Row level: low → high",
  "mr.sort.rowLevelDesc": "Row level: high → low",
  "mr.sort.fewestBlockers": "Fewest blockers",
  "mr.sort.smartPriority": "Smart priority",
  "mr.filter.label": "Filters",
  "mr.filter.noMvp": "No MVP on map",
  "mr.filter.noMini": "No Mini on map",
  "mr.filter.behaviorLabel": "Filtered rows",
  "mr.filter.behavior.hide": "Hide",
  "mr.filter.behavior.demote": "Demote",
  "mr.filter.maps": "Avoided maps",
  "mr.filter.mapsHint":
    "Checked maps are skipped when planning trips. Rows that can only advance on avoided maps are hidden or demoted.",
  "mr.filter.mapsNoMatch": "No maps match your search.",
  "mr.filter.mapsExcludedCount": "{n} maps avoided",
  "mr.filter.lvUnknown": "Level unknown",
  "mr.allMapsExcludedFlag": "all its maps are avoided",
  "mr.filter.element": "Element",
  "mr.element.all": "All elements",
  "mr.rowsShown": "Rows shown",
  "mr.rows.all": "All",
  "mr.row": "Row",
  "mr.lvShort": "Lv",
  "mr.fillRow": "Fill row",
  "mr.noRows": "No rows match the current filter.",
  "mr.topPick": "Tonight's pick",
  "mr.topPick.hide": "Hide Tonight's pick",
  "mr.farmThis": "farm this",
  "mr.bestTrip": "Best trip",
  "mr.editRow": "Edit levels",
  "mr.editRow.hint": "Set the whole row at once, or step each monster.",
  "mr.emptyState": "No progress yet — fill in your current levels once, then keep them updated right here.",
  "mr.detail.maps": "Spawn maps",
  "mr.detail.alsoOnMap": "Also on this map",
  "mr.blockerFlag": "row blocker",
  "mr.blockerCount": "blockers: {n}",
  "mr.rowsCount": "{n} rows",
  "mr.noRowLevel": "row not full (5) — no row level yet",

  "nav.dataEntry": "Backup",
  "entry.title": "Backup & tools",
  "entry.movedHint":
    "Levels are edited right on the tracker now — pick an element in the sidebar and click any monster tile. This page keeps backup and bulk tools.",
  "entry.mode.quick": "Quick",
  "entry.mode.detailed": "Detailed",
  "entry.quickHint":
    "Enter one level per row — every monster in it is set to that level and marked as estimated.",
  "entry.detailedHint":
    "Enter each monster individually — these count as confirmed. Use “fill row” to set a baseline, then correct the outliers.",
  "entry.apply": "Apply",
  "entry.fillMinis": "Set every Mini to 10",
  "entry.fillMinisConfirm":
    "Set every Mini monster to level 10 (confirmed)? This overwrites their current levels.",
  "entry.backupTitle": "Backup / transfer",
  "entry.backupHint":
    "Export your progress as JSON for backup or moving to another device. Importing replaces everything currently stored.",
  "entry.importReplaceWarning":
    "Importing replaces ALL current progress with the file's contents. Continue?",
  "entry.importInvalid": "This file is not a ROOC Kit progress export.",
  "entry.importDone": "Imported.",

  "sync.title": "Cloud sync",
  "sync.hint":
    "Push your progress to your account to move between devices. Restoring replaces everything stored in this browser.",
  "sync.upload": "Sync to cloud",
  "sync.download": "Restore from cloud",
  "sync.done": "Synced.",
  "sync.restored": "Restored.",
  "sync.none": "No cloud backup yet.",
  "sync.error": "Sync failed — please try again.",

  "settings.display": "Display",
  "settings.showTopPick": "Show Tonight's pick",
  "settings.showTopPickHint":
    "The highlighted recommendation above the Smart-priority list.",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;

const th: Messages = {
  "app.title": "ROOC Kit",
  "app.tagline": "วันนี้ไปฟาร์มไหนดี?",

  "nav.monsterResearch": "Monster Research",
  "nav.marketAlert": "แจ้งเตือนรอบตลาด",
  "nav.settings": "ตั้งค่า",

  "common.save": "บันทึก",
  "common.cancel": "ยกเลิก",
  "common.close": "ปิด",
  "common.edit": "แก้ไข",
  "common.import": "นำเข้า",
  "common.export": "ส่งออก",
  "common.search": "ค้นหา",
  "common.clear": "ล้าง",
  "common.loading": "กำลังโหลด…",

  "locale.label": "ภาษา",
  "locale.th": "ไทย",
  "locale.en": "English",

  "theme.toLight": "สลับเป็นธีมสว่าง",
  "theme.toDark": "สลับเป็นธีมมืด",
  "theme.label": "ธีม",
  "theme.dark": "มืด",
  "theme.light": "สว่าง",

  "nav.soon": "เร็วๆ นี้",
  "nav.menu": "เมนู",
  "auth.menu": "เมนูบัญชี",

  "notFound.title": "วาร์ปมาแมพที่ไม่มีอยู่",
  "notFound.body":
    "พิกัดนี้ยังไม่ถูกค้นพบ — ลองเช็ค URL อีกครั้ง หรือวาร์ปกลับไปวางแผนต่อ",
  "notFound.backTracker": "กลับไปหน้า Tracker",
  "notFound.backHome": "หน้าแรก",

  "legal.terms": "ข้อกำหนดการใช้งาน",
  "legal.privacy": "นโยบายความเป็นส่วนตัว",
  "legal.lastUpdated": "อัปเดตล่าสุด",
  "legal.fanDisclaimer":
    "ROOC Kit เป็นโปรเจกต์แฟนเมดไม่เป็นทางการ ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจากผู้พัฒนา/ผู้ให้บริการเกม Ragnarok Origin Classic",

  "auth.signIn": "เข้าสู่ระบบ",
  "auth.dialog.title": "เข้าสู่ระบบ ROOC Kit",
  "auth.signInWith.discord": "เข้าสู่ระบบด้วย Discord",
  "auth.signInWith.google": "เข้าสู่ระบบด้วย Google",
  "auth.signOut": "ออกจากระบบ",
  "auth.syncHint": "ไม่บังคับ — เข้าสู่ระบบเพื่อ sync ข้อมูลข้ามอุปกรณ์",
  "auth.localNote":
    "ไม่ต้องมีบัญชีก็ใช้ tracker ได้ — ข้อมูลอยู่ในเบราว์เซอร์นี้จนกว่าคุณจะอัปโหลดเพื่อ sync",
  "auth.legalNotice": "การเข้าสู่ระบบถือว่าคุณยอมรับ{terms}และ{privacy}ของเรา",
  "auth.error": "เข้าสู่ระบบไม่สำเร็จ — ลองใหม่อีกครั้ง",

  "gate.title": "ยินดีต้อนรับสู่ ROOC Kit",
  "gate.subtitle": "เลือกวิธีเก็บข้อมูล Monster Research ของคุณ",
  "gate.or": "หรือ",
  "gate.anonymous": "ใช้งานแบบไม่มีบัญชี",
  "gate.anonymousNote":
    "แบบไม่มีบัญชี: ข้อมูลอยู่เฉพาะในเบราว์เซอร์นี้ — ส่งออกเป็น JSON ได้ตลอด",
  "gate.syncNote":
    "ผู้ที่เข้าสู่ระบบ sync ข้อมูลข้ามอุปกรณ์ได้จากเมนูบัญชีหรือหน้า Backup — ข้อมูลหลักยังอยู่ในเครื่องของคุณเสมอ",

  "landing.headline": "คืนนี้ไปฟาร์มไหนดี?",
  "landing.pitch":
    "Ragnarok Origin Classic ไม่มี API ให้ดึงข้อมูล Monster Research ผู้เล่นเลยต้องจดใส่ spreadsheet หรือจำเอาเอง ROOC Kit เก็บทุกแถวไว้ที่เดียว ชี้ให้เห็นว่ามอนตัวไหนกำลังถ่วงเลเวลแถวอยู่ แล้วสรุปทั้งหมดเป็นทริปแมพเดียวที่คุ้มที่สุดให้เลย",
  "landing.cta.open": "เปิด Tracker",
  "landing.cta.how": "ดูวิธีทำงาน",
  "landing.cta.note": "ใช้ฟรี ไม่ต้องมีบัญชี — หรือเข้าสู่ระบบด้วย Discord / Google ก็ได้",
  "landing.demo.tag": "ข้อมูลตัวอย่าง — ลองกดมอนขอบแดงดู",
  "landing.demo.complete": "แถวครบแล้ว — ฟีลแบบนี้แหละ",
  "landing.what.title": "3 อย่างที่มันทำให้คุณ",
  "landing.f1.title": "เห็นทุกแถว ทุกตัวถ่วง",
  "landing.f1.sub": "ครบทั้ง 10 ธาตุในจอเดียว",
  "landing.f1.body":
    "เลเวลแถวเท่ากับเลเวลมอนที่ต่ำสุดในแถว tracker จะวงมอนที่ถ่วงแถวไว้ให้ เปิดมาก็รู้ทันทีว่าต้องไปฟาร์มตัวไหนต่อ",
  "landing.f2.title": "Smart Priority",
  "landing.f2.sub": "ทริปที่คุ้มที่สุดของคืนนี้",
  "landing.f2.body":
    "แนะนำทริปแมพเดียวที่ปลดตัวถ่วงได้มากที่สุดในรอบเดียว — จอดปาร์ตี้ตรงจุดที่ทำให้ research คืบจริง ๆ",
  "landing.f3.title": "ข้อมูลเป็นของคุณ",
  "landing.f3.sub": "ไม่มีบัญชีก็ใช้ได้",
  "landing.f3.body":
    "ข้อมูลอยู่ในเบราว์เซอร์ของคุณ ส่งออกเป็น JSON ได้ตลอดเวลา เข้าสู่ระบบด้วย Discord หรือ Google เมื่ออยาก sync ข้ามอุปกรณ์ — ไม่ใช่เพื่อปลดล็อกฟีเจอร์",
  "landing.frag.maxed": "เต็มแล้ว",
  "landing.privacy1.title": "ไม่ยุ่งกับตัวเกม",
  "landing.privacy1.body":
    "ไม่อ่าน memory ของเกม ไม่เล่นแทนผู้เล่น กรอกข้อมูลด้วยมือเท่านั้น",
  "landing.privacy2.title": "ไม่อัปโหลดข้อมูล",
  "landing.privacy2.body":
    "ใช้แบบไม่มีบัญชี ข้อมูลไม่ถูกส่งไปไหนเลย ส่วน sync เป็นแบบสมัครใจและผูกกับบัญชีของคุณเอง",
  "landing.privacy3.title": "โปรเจกต์แฟนเมด",
  "landing.privacy3.body":
    "เครื่องมือไม่เป็นทางการ ไม่มีส่วนเกี่ยวข้องหรือได้รับการรับรองจากผู้ให้บริการเกม",
  "landing.close.title": "เลิกฟาร์มผิดแมพกันเถอะ",
  "landing.close.body": "กรอกเลเวลครั้งเดียว ที่เหลือให้ ROOC Kit คิดให้",

  "mr.rowLevel": "เลเวลแถว",
  "mr.monsterLevel": "เลเวลวิจัย",
  "mr.trip.go": "ไป",
  "mr.trip.clears": "ปลดตัวถ่วง {n} ตัว",
  "mr.trip.clearsOne": "ปลดตัวถ่วง 1 ตัว",
  "mr.mapHasMvp": "มี MVP ในแมพ",
  "mr.mapHasMini": "มี Mini ในแมพ",
  "mr.demotedFlag": "โดนตัวกรองลดอันดับ",
  "mr.completedFlag": "ครบแล้ว",
  "mr.sort.label": "เรียงตาม",
  "mr.sort.rowOrder": "ตามลำดับแถว",
  "mr.sort.rowLevelAsc": "เลเวลแถว น้อย → มาก",
  "mr.sort.rowLevelDesc": "เลเวลแถว มาก → น้อย",
  "mr.sort.fewestBlockers": "ตัวถ่วงน้อยสุดก่อน",
  "mr.sort.smartPriority": "เรียงให้อัตโนมัติ",
  "mr.filter.label": "ตัวกรอง",
  "mr.filter.noMvp": "แมพที่ไม่มี MVP",
  "mr.filter.noMini": "แมพที่ไม่มี Mini",
  "mr.filter.behaviorLabel": "แถวที่ไม่ผ่านตัวกรอง",
  "mr.filter.behavior.hide": "ซ่อน",
  "mr.filter.behavior.demote": "ลดอันดับ",
  "mr.filter.maps": "แมพที่ไม่ไป",
  "mr.filter.mapsHint":
    "แมพที่ติ๊กไว้จะถูกข้ามตอนวางแผนทริป — แถวที่อัปได้เฉพาะบนแมพเหล่านี้จะถูกซ่อนหรือลดอันดับ",
  "mr.filter.mapsNoMatch": "ไม่พบแมพที่ค้นหา",
  "mr.filter.mapsExcludedCount": "ยกเว้น {n} แมพ",
  "mr.filter.lvUnknown": "ไม่ทราบเลเวล",
  "mr.allMapsExcludedFlag": "แมพของแถวนี้ถูกยกเว้นหมด",
  "mr.filter.element": "ธาตุ",
  "mr.element.all": "ทุกธาตุ",
  "mr.rowsShown": "จำนวนแถวที่แสดง",
  "mr.rows.all": "ทั้งหมด",
  "mr.row": "แถว",
  "mr.lvShort": "Lv",
  "mr.fillRow": "เติมทั้งแถว",
  "mr.noRows": "ไม่มีแถวตรงกับตัวกรองตอนนี้",
  "mr.topPick": "คืนนี้แนะนำแถวนี้",
  "mr.topPick.hide": "ซ่อนคำแนะนำ",
  "mr.farmThis": "ฟาร์มตัวนี้",
  "mr.bestTrip": "ทริปแนะนำ",
  "mr.editRow": "แก้เลเวล",
  "mr.editRow.hint": "ตั้งเลเวลทั้งแถวทีเดียว หรือปรับรายตัวก็ได้",
  "mr.emptyState": "ยังไม่มีข้อมูล — กรอกเลเวลปัจจุบันครั้งแรกก่อน แล้วค่อยอัปเดตจากหน้านี้ได้เลย",
  "mr.detail.maps": "แมพที่เกิด",
  "mr.detail.alsoOnMap": "มอนอื่นในแมพนี้",
  "mr.blockerFlag": "ตัวถ่วงแถว",
  "mr.blockerCount": "ตัวถ่วง {n} ตัว",
  "mr.rowsCount": "{n} แถว",
  "mr.noRowLevel": "มอนยังไม่ครบ 5 ตัว — ยังไม่มีเลเวลแถว",

  "nav.dataEntry": "สำรองข้อมูล",
  "entry.title": "สำรองข้อมูล & เครื่องมือ",
  "entry.movedHint":
    "ตอนนี้แก้เลเวลได้ที่หน้า tracker โดยตรง — เลือกธาตุจาก sidebar แล้วคลิกที่รูปมอนสเตอร์ได้เลย หน้านี้เหลือไว้สำหรับสำรองข้อมูลและเครื่องมือเหมา",
  "entry.mode.quick": "แบบเร็ว",
  "entry.mode.detailed": "แบบละเอียด",
  "entry.quickHint":
    "กรอกเลเวลเดียวต่อแถว — มอนทุกตัวในแถวถูกตั้งเป็นค่านั้นและนับเป็นค่าประมาณ",
  "entry.detailedHint":
    "กรอกเลเวลรายตัว — ค่าที่กรอกนับเป็นค่ายืนยัน ใช้ “เติมทั้งแถว” ตั้งฐานก่อนแล้วค่อยแก้ตัวที่ต่าง",
  "entry.apply": "ใส่ค่า",
  "entry.fillMinis": "ตั้ง Mini ทุกตัวเป็น 10",
  "entry.fillMinisConfirm":
    "ตั้งเลเวล Mini ทุกตัวเป็น 10 (นับเป็นค่ายืนยัน)? ค่าปัจจุบันของ Mini ทั้งหมดจะถูกแทนที่",
  "entry.backupTitle": "สำรอง / ย้ายเครื่อง",
  "entry.backupHint":
    "ส่งออก progress เป็น JSON ไว้สำรองหรือย้ายไปเครื่องอื่น การนำเข้าจะแทนที่ข้อมูลที่มีอยู่ทั้งหมด",
  "entry.importReplaceWarning":
    "การนำเข้าจะแทนที่ progress ปัจจุบันทั้งหมดด้วยข้อมูลในไฟล์ ทำต่อไหม?",
  "entry.importInvalid": "ไฟล์นี้ไม่ใช่ไฟล์ progress ของ ROOC Kit",
  "entry.importDone": "นำเข้าเรียบร้อย",

  "sync.title": "Sync ขึ้นคลาวด์",
  "sync.hint":
    "อัปโหลด progress ไว้กับบัญชีของคุณเพื่อย้ายเครื่อง/เล่นหลายอุปกรณ์ การกู้คืนจะแทนที่ข้อมูลทั้งหมดในเบราว์เซอร์นี้",
  "sync.upload": "Sync ขึ้นคลาวด์",
  "sync.download": "กู้คืนจากคลาวด์",
  "sync.done": "Sync เรียบร้อย",
  "sync.restored": "กู้คืนเรียบร้อย",
  "sync.none": "ยังไม่มีข้อมูลบนคลาวด์",
  "sync.error": "Sync ไม่สำเร็จ — ลองใหม่อีกครั้ง",

  "settings.display": "การแสดงผล",
  "settings.showTopPick": "แสดง Tonight's pick",
  "settings.showTopPickHint":
    "การ์ดแนะนำที่เด่นอยู่บนสุดของโหมดเรียงอัตโนมัติ",
};

export const messages: Record<Locale, Messages> = { en, th };
