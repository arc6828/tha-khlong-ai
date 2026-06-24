This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 📋 Requirements และ ข้อจำกัดของระบบ (System Requirements & Limitations)

ระบบนี้ออกแบบมาเพื่อการเรียนการสอนแบบสาธิต (Interactive Live Coding Demo) ความยาว 15 นาที สำหรับนักเรียนระดับประถมปลาย โดยทำงานร่วมกันพร้อมกัน 30 เครื่องในห้องเรียน โดยแสดงผลภาพเวกเตอร์ (SVG) ที่เจนเนอเรตโดย Google Gemini API ตามหัวข้อที่นักเรียนส่งเข้ามา

### 🚀 ความต้องการระบบ (System Requirements)
1. **การซิงโครไนซ์สถานะแบบเรียลไทม์ (Real-time State Sync):**
   * เก็บสถานะระบบและคิวข้อเสนอของเด็กๆ ลงในไฟล์ `db.json` ใน Root ของโปรเจกต์
   * เครื่องของเด็กๆ ทุกเครื่องจะใช้การดึงข้อมูลสเตตัส (Short Polling) ผ่าน API Route `/api/sync` ทุกๆ 5 วินาที เพื่อประหยัดแบนด์วิธและลดภาระของระบบเครือข่าย โดยที่หน้าจอยังแสดงผลเวลานับถอยหลังวินาทีต่อวินาทีได้อย่างราบรื่นผ่านตัวนับเวลาฝั่ง Client (Local Clock Timer)
2. **ระบบการรันคิวแบบวนรอบ 30 วินาที (Auto-Queue Engine):**
   * เมื่อมี Requirement ถูกส่งเข้ามาจะต่อแถวคิวในสถานะ `pending` (รอทำ)
   * ดึงข้อเสนอแรกขึ้นมาประมวลผลเป็นเวลา 30 วินาที ต่อ 1 คำสั่ง
   * **ช่วง 5 วินาทีแรก:** หน้าจอเครื่องลูกข่าย 30 เครื่องจะล็อกและแสดงผล "หน้าจอจำลอง AI กำลังเขียนโค้ดสด" โชว์กระบวนการคอมไพล์และเปอร์เซ็นต์โหลด
   * **ช่วงวินาทีที่ 6-30:** เปิดการทำงานของธีมภาพพื้นหลังเวกเตอร์แบบเรียลไทม์ตามธีมที่กำหนด
3. **การเปลี่ยนธีมตามคีย์เวิร์ด:**
   * สแกนหาคำหลักจากช่องเสนอความคิดเห็นของนักเรียนในภาษาไทย/ภาษาอังกฤษ เพื่อปรับแต่งฉากหลังและภาพเวกเตอร์:
     * **ธีมสีพื้นหลัง:** อวกาศ (`space`), สีชมพูพาสเทล (`pink`), แฮกเกอร์รหัสวิ่ง (`matrix`), นีออนแสงไซเบอร์ (`neon`)
     * **เอฟเฟกต์หน้าจอ:** ฉลองเปเปอร์ชูตเตอร์ (`confetti`), หิมะตก (`snow`), ฟองสบู่ลอยขึ้น (`bubbles`)
4. **แผงการควบคุมของคุณครู (Teacher Admin Portal):**
   * ซ่อนอยู่ที่แถบล่างสุดของหน้าจอ (ปุ่มฟันเฟือง ⚙️)
   * สามารถกดข้ามคิว (Skip), ล้างคิว (Clear), ปิด-เปิดรับคำเสนอใหม่ (Toggle Submissions) และรีเซ็ตระบบทั้งหมดได้ทันที

---

### ⚠️ ข้อจำกัดของระบบปัจจุบัน (Limitations)
1. **การจำลอง Live Coding และการใช้ Gemini API:**
   * ระบบสามารถทำงานร่วมกับ Google Gemini API เพื่อสร้างภาพเวกเตอร์ SVG แบบเรียลไทม์ได้ หากไม่มี API Key หรือเชื่อมต่อล้มเหลว ระบบจะทำการดึงภาพ Mock SVG ขึ้นแสดงตามธีมเพื่อความลื่นไหลในการนำเสนอ
2. **ความดีเลย์ของสถานะหน้าจอ (Short Polling Latency):**
   * เนื่องจากมีการปรับแต่งการดึงข้อมูลเป็นทุกๆ 5 วินาที จังหวะการเปลี่ยนธีมบนคอมพิวเตอร์แต่ละเครื่องอาจจะมีความเหลื่อมล้ำกันประมาณ 1-5 วินาที แต่จะเห็นคิวและเวลานับถอยหลังตรงกันและค่อยๆ รันสลับไปตามลำดับอย่างถูกต้อง
3. **ขนาดของข้อมูลคิวที่ส่ง:**
   * จำกัดความยาวชื่อผู้ส่งสูงสุดไม่เกิน 20 ตัวอักษร และข้อความความต้องการไม่เกิน 80 ตัวอักษร เพื่อให้จัดหน้าจอบอร์ดคิวในแบบจำลองเสถียรที่สุด


