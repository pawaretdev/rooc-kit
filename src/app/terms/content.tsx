"use client";

import { LegalPage } from "@/components/LegalPage";
import { useT } from "@/lib/i18n";

const LAST_UPDATED = "2026-08-09";

export function TermsContent() {
  const t = useT();

  return (
    <LegalPage
      title={t("legal.terms")}
      lastUpdated={LAST_UPDATED}
      en={
        <>
          <section>
            <h2>1. Acceptance</h2>
            <p>
              By using ROOC Kit you agree to these terms. If you do not agree,
              please do not use the service.
            </p>
          </section>
          <section>
            <h2>2. What ROOC Kit is</h2>
            <p>
              ROOC Kit is a free, fan-made companion planner for Ragnarok
              Origin Classic. All game data shown is entered manually by the
              community and may be incomplete or out of date. It is a planning
              aid — not a source of truth for the game.
            </p>
          </section>
          <section>
            <h2>3. No warranty</h2>
            <p>
              The service is provided “as is”, without warranty of any kind. We
              do not guarantee accuracy, availability, or that your data will
              never be lost — please use the export feature for backups.
            </p>
          </section>
          <section>
            <h2>4. Your account</h2>
            <p>
              Signing in is optional. You are responsible for the security of
              the Discord or Google account you sign in with. We may suspend
              accounts that abuse the service.
            </p>
          </section>
          <section>
            <h2>5. Acceptable use</h2>
            <ul>
              <li>Do not attempt to disrupt or overload the service.</li>
              <li>Do not use it to distribute harmful or unlawful content.</li>
            </ul>
          </section>
          <section>
            <h2>6. Intellectual property</h2>
            <p>
              Ragnarok Origin and related names, marks, and assets belong to
              their respective owners. {t("legal.fanDisclaimer")}
            </p>
          </section>
          <section>
            <h2>7. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, the developer is not
              liable for any damages arising from the use of, or inability to
              use, this service.
            </p>
          </section>
          <section>
            <h2>8. Changes and termination</h2>
            <p>
              The service and these terms may change, or the service may be
              discontinued, at any time. Significant changes will be announced
              in the app.
            </p>
          </section>
        </>
      }
      th={
        <>
          <section>
            <h2>1. การยอมรับข้อกำหนด</h2>
            <p>
              การใช้งาน ROOC Kit ถือว่าคุณยอมรับข้อกำหนดเหล่านี้
              หากไม่ยอมรับ กรุณาอย่าใช้บริการ
            </p>
          </section>
          <section>
            <h2>2. ROOC Kit คืออะไร</h2>
            <p>
              ROOC Kit เป็นเครื่องมือช่วยวางแผนแบบแฟนเมดสำหรับ Ragnarok Origin
              Classic ให้ใช้ฟรี ข้อมูลเกมทั้งหมดมาจากการกรอกมือของคอมมูนิตี้
              จึงอาจไม่ครบถ้วนหรือไม่เป็นปัจจุบัน — เป็นตัวช่วยวางแผน
              ไม่ใช่แหล่งข้อมูลอ้างอิงของตัวเกม
            </p>
          </section>
          <section>
            <h2>3. ไม่มีการรับประกัน</h2>
            <p>
              บริการนี้ให้ “ตามสภาพ” โดยไม่มีการรับประกันใด ๆ
              เราไม่รับประกันความถูกต้อง ความพร้อมใช้งาน
              หรือว่าข้อมูลของคุณจะไม่สูญหาย — กรุณาใช้ฟีเจอร์ส่งออกเพื่อสำรองข้อมูล
            </p>
          </section>
          <section>
            <h2>4. บัญชีของคุณ</h2>
            <p>
              การเข้าสู่ระบบเป็นทางเลือก คุณมีหน้าที่ดูแลความปลอดภัยของบัญชี
              Discord หรือ Google ที่ใช้เข้าสู่ระบบ
              เราอาจระงับบัญชีที่ใช้งานบริการในทางที่ผิด
            </p>
          </section>
          <section>
            <h2>5. การใช้งานที่ยอมรับได้</h2>
            <ul>
              <li>ห้ามพยายามรบกวนหรือทำให้บริการทำงานหนักเกินปกติ</li>
              <li>ห้ามใช้เผยแพร่เนื้อหาที่เป็นอันตรายหรือผิดกฎหมาย</li>
            </ul>
          </section>
          <section>
            <h2>6. ทรัพย์สินทางปัญญา</h2>
            <p>
              Ragnarok Origin รวมถึงชื่อ เครื่องหมาย และ asset ที่เกี่ยวข้อง
              เป็นของเจ้าของลิขสิทธิ์แต่ละราย {t("legal.fanDisclaimer")}
            </p>
          </section>
          <section>
            <h2>7. ข้อจำกัดความรับผิด</h2>
            <p>
              ภายใต้ขอบเขตสูงสุดที่กฎหมายอนุญาต
              ผู้พัฒนาไม่รับผิดต่อความเสียหายใด ๆ ที่เกิดจากการใช้งาน
              หรือการไม่สามารถใช้งานบริการนี้
            </p>
          </section>
          <section>
            <h2>8. การเปลี่ยนแปลงและการยุติบริการ</h2>
            <p>
              บริการและข้อกำหนดนี้อาจเปลี่ยนแปลง หรือบริการอาจยุติลงได้ทุกเมื่อ
              การเปลี่ยนแปลงสำคัญจะประกาศในแอป
            </p>
          </section>
        </>
      }
    />
  );
}
