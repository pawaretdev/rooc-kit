"use client";

import { LegalPage } from "@/components/LegalPage";
import { useT } from "@/lib/i18n";

const LAST_UPDATED = "2026-08-09";

export function PrivacyContent() {
  const t = useT();

  return (
    <LegalPage
      title={t("legal.privacy")}
      lastUpdated={LAST_UPDATED}
      en={
        <>
          <section>
            <h2>Local-first by design</h2>
            <p>
              ROOC Kit works without an account. Your Monster Research levels,
              filters, and language preference are stored in your own browser
              (IndexedDB / localStorage) and never leave your device unless you
              explicitly use a feature that sends them somewhere — signing in to
              sync, exporting a file, or configuring an alert webhook.
            </p>
          </section>
          <section>
            <h2>What we store if you sign in</h2>
            <p>
              Signing in with Discord or Google is optional. When you do, we
              receive and store your display name, email address, and avatar
              URL from the provider, plus the progress data you choose to sync.
              We use this only to operate your account and sync — nothing else.
              We never receive your password.
            </p>
          </section>
          <section>
            <h2>Cookies</h2>
            <p>
              We use only an essential session cookie to keep you signed in.
              There are no advertising, analytics, or tracking cookies.
            </p>
          </section>
          <section>
            <h2>Alert webhooks</h2>
            <p>
              If you configure a Discord webhook URL for market alerts, it is
              stored solely to deliver the alerts you asked for. You can remove
              it at any time.
            </p>
          </section>
          <section>
            <h2>Sharing</h2>
            <p>
              We do not sell or share your data. Our hosting providers (Vercel
              for the app, Railway for the database) process data on our behalf
              to run the service.
            </p>
          </section>
          <section>
            <h2>Deleting your data</h2>
            <ul>
              <li>Local data: clear this site&apos;s browser storage.</li>
              <li>
                Account data: contact the developer to have your account and
                synced data deleted.
              </li>
            </ul>
          </section>
          <section>
            <h2>Game disclaimer</h2>
            <p>{t("legal.fanDisclaimer")} We never read game memory, automate
            in-game actions, or modify game files.</p>
          </section>
          <section>
            <h2>Changes</h2>
            <p>
              If this policy changes, the date above will be updated and
              significant changes will be announced in the app.
            </p>
          </section>
        </>
      }
      th={
        <>
          <section>
            <h2>ออกแบบมาให้ข้อมูลอยู่กับคุณ</h2>
            <p>
              ROOC Kit ใช้งานได้โดยไม่ต้องมีบัญชี เลเวล Monster Research
              ตัวกรอง และภาษาที่เลือก ถูกเก็บในเบราว์เซอร์ของคุณเอง (IndexedDB /
              localStorage) และไม่ถูกส่งออกจากเครื่อง
              เว้นแต่คุณใช้ฟีเจอร์ที่ส่งข้อมูลเองอย่างชัดเจน — เช่น เข้าสู่ระบบเพื่อ
              sync, ส่งออกไฟล์ หรือตั้งค่า webhook แจ้งเตือน
            </p>
          </section>
          <section>
            <h2>ข้อมูลที่เก็บเมื่อคุณเข้าสู่ระบบ</h2>
            <p>
              การเข้าสู่ระบบด้วย Discord หรือ Google เป็นทางเลือก ไม่บังคับ
              เมื่อเข้าสู่ระบบ เราได้รับและเก็บชื่อที่แสดง อีเมล และ URL
              รูปโปรไฟล์จากผู้ให้บริการ พร้อมกับข้อมูล progress ที่คุณเลือก sync
              โดยใช้เพื่อการทำงานของบัญชีและการ sync เท่านั้น
              เราไม่มีทางเห็นรหัสผ่านของคุณ
            </p>
          </section>
          <section>
            <h2>คุกกี้</h2>
            <p>
              ใช้เฉพาะ session cookie ที่จำเป็นต่อการคงสถานะเข้าสู่ระบบ
              ไม่มีคุกกี้โฆษณา analytics หรือติดตามพฤติกรรมใด ๆ
            </p>
          </section>
          <section>
            <h2>Webhook แจ้งเตือน</h2>
            <p>
              หากคุณตั้งค่า Discord webhook สำหรับแจ้งเตือนรอบตลาด URL
              นั้นถูกเก็บไว้เพื่อส่งการแจ้งเตือนที่คุณขอเท่านั้น และลบออกได้ทุกเมื่อ
            </p>
          </section>
          <section>
            <h2>การแบ่งปันข้อมูล</h2>
            <p>
              เราไม่ขายหรือแบ่งปันข้อมูลของคุณ ผู้ให้บริการโฮสติ้งของเรา (Vercel
              สำหรับตัวแอป และ Railway สำหรับฐานข้อมูล)
              ประมวลผลข้อมูลในนามของเราเพื่อให้บริการทำงานได้
            </p>
          </section>
          <section>
            <h2>การลบข้อมูล</h2>
            <ul>
              <li>ข้อมูลในเครื่อง: ล้าง storage ของเว็บไซต์นี้ในเบราว์เซอร์</li>
              <li>
                ข้อมูลบัญชี: ติดต่อผู้พัฒนาเพื่อขอลบบัญชีและข้อมูลที่ sync ไว้
              </li>
            </ul>
          </section>
          <section>
            <h2>ข้อจำกัดความรับผิดชอบเกี่ยวกับตัวเกม</h2>
            <p>
              {t("legal.fanDisclaimer")} เราไม่อ่าน memory ของเกม
              ไม่ทำงานอัตโนมัติในเกม และไม่แก้ไขไฟล์เกมใด ๆ
            </p>
          </section>
          <section>
            <h2>การเปลี่ยนแปลงนโยบาย</h2>
            <p>
              หากนโยบายนี้เปลี่ยนแปลง วันที่ด้านบนจะถูกอัปเดต
              และการเปลี่ยนแปลงสำคัญจะประกาศในแอป
            </p>
          </section>
        </>
      }
    />
  );
}
