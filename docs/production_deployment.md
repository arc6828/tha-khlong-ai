# คู่มือการติดตั้งระบบบน Production (Ubuntu + Nginx + PM2)

เมื่อเปลี่ยนระบบการดึงข้อมูลจาก Short Polling มาเป็น WebSockets เพื่อให้บริการบนโดเมนจริง (`ai.samkhok.org`) ผ่าน HTTPS (SSL) จะต้องมีการปรับเปลี่ยนการตั้งค่า **Nginx Reverse Proxy** และการจัดการโปรเซสด้วย **PM2** เพื่อให้สามารถสื่อสารข้อมูลแบบสองทาง (WebSockets) ผ่านพอร์ตมาตรฐาน 443 ได้อย่างปลอดภัย

---

## 1. การตั้งค่า Nginx (Reverse Proxy & SSL Upgrade)

เนื่องจากหน้าเว็บทำงานผ่าน HTTPS (พอร์ต `443`) เบราว์เซอร์จะบล็อกการเชื่อมต่อที่ไม่ปลอดภัย (`ws://`) ทันที (Mixed Content Blocker) 
เราจึงใช้ Nginx ทำหน้าที่เป็น **SSL Terminator** และส่งต่อข้อมูล (Reverse Proxy) ไปยังเซิร์ฟเวอร์ย่อยในเครื่อง (localhost):
- คำขอหน้าเว็บปกติและ REST API -> ส่งไปที่ Next.js (พอร์ต `3000`)
- คำขอเชื่อมต่อ WebSockets (`/ws`) -> ส่งไปที่ Companion Server (พอร์ต `3001`)

### 📝 ไฟล์ตั้งค่า Nginx (`/etc/nginx/sites-available/default` หรือไฟล์ของโดเมน)

ให้เพิ่มบล็อก `location /ws` และอัปเดตค่าความเข้ากันได้ของโปรโตคอล WebSockets ดังนี้:

```nginx
server {
    server_name ai.samkhok.org;

    # พอร์ต HTTPS (จัดการ SSL โดย Let's Encrypt / Certbot เรียบร้อยแล้ว)
    listen 443 ssl; 
    ssl_certificate /etc/letsencrypt/live/ai.samkhok.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.samkhok.org/privkey.pem;

    # 1. จัดการ Next.js Web Application (พอร์ต 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. เพิ่มเติม: จัดการระบบซิงก์เรียลไทม์ WebSockets (พอร์ต 3001)
    location /ws {
        proxy_pass http://127.0.0.1:3001; # ส่งต่อไปที่ WebSocket Companion Server
        proxy_http_version 1.1;
        
        # ส่วนสำคัญในการบอก Nginx ให้เปลี่ยนโปรโตคอลจาก HTTP เป็น WebSockets
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # ป้องกันการปิดการเชื่อมต่อจาก Timeout (ปรับตั้งค่าตามความเหมาะสม)
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

หลังจากทำการแก้ไขไฟล์คอนฟิกเรียบร้อยแล้ว ให้ทดสอบโครงสร้างและสั่งให้ Nginx โหลดคอนฟิกใหม่:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 2. การจัดการโปรเซสรันไทม์ด้วย PM2 (Process Management)

การเปิดรันเซิร์ฟเวอร์บนบอร์ดจำลองใน Production **ไม่แนะนำให้ใช้ `concurrently`** ภายใต้กระบวนการ PM2 เดียวกัน เนื่องจากหากมีโปรเซสใดโปรเซสหนึ่งพังลง PM2 จะไม่สามารถตรวจจับเพื่อรีสตาร์ทแยกเฉพาะโปรเซสได้

เราแนะนำให้แยกการรันออกเป็น **2 แอปพลิเคชันย่อย** ใน PM2 โดยสร้างไฟล์กำหนดค่าระบบตัวจัดการโปรเซสในรูทของโปรเจกต์:

### 📝 สร้างไฟล์ `ecosystem.config.js` ในรูทโฟลเดอร์ของโปรเจกต์

```javascript
module.exports = {
  apps: [
    {
      name: "tha-khlong-next",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
        GEMINI_API_KEY: "ใส่คีย์ของคุณตรงนี้_หรือโหลดจากสิ่งแวดล้อมระบบ"
      }
    },
    {
      name: "tha-khlong-ws",
      script: "npx",
      args: "tsx ws-server.ts",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```

### 🚀 คำสั่งเปิดใช้งานระบบผ่าน PM2
เมื่อมีไฟล์ `ecosystem.config.js` แล้ว สามารถสั่งงานให้ PM2 จัดการรันและเฝ้าดูโปรเซสทั้งสองพร้อมกันได้ด้วยคำสั่งเดียว:

```bash
# สั่งเริ่มการทำงานคู่ขนานแบบแยกโปรเซสอิสระ
pm2 start ecosystem.config.js

# บันทึกสถานะโปรเซสเพื่อให้ออโต้บูตหากเซิร์ฟเวอร์ Ubuntu รีสตาร์ท
pm2 save
```

### 📊 คำสั่งตรวจสอบการทำงานในเซิร์ฟเวอร์
```bash
# ดูสถานะและทรัพยากรที่ใช้ของแต่ละแอป
pm2 list

# ดู logs การเชื่อมต่อและคิวแบบเรียลไทม์
pm2 logs tha-khlong-ws
pm2 logs tha-khlong-next
```

---

## 3. การจัดการสิทธิ์ไดเรกทอรีฐานข้อมูล SQLite (Permissions Setup)

ระบบได้ปรับโครงสร้างมาเก็บข้อมูลในไดเรกทอรี `database/` และรัน SQLite ในโหมด **WAL (Write-Ahead Logging)** ซึ่งระบบจะทำการเขียนไฟล์ชั่วคราว (`-wal` และ `-shm`) อยู่ตลอดเวลา

เพื่อป้องกันการเกิดข้อผิดพลาดในการเขียนข้อมูล (`SQLITE_CANTOPEN` หรือ Permission Denied) ก่อนเริ่มรันระบบผ่าน PM2 คุณจะต้องสร้างโฟลเดอร์และตั้งสิทธิ์การเข้าถึงให้เรียบร้อย:

### 🚀 คำสั่งเตรียมโฟลเดอร์และตั้งค่าสิทธิ์บน Ubuntu:

```bash
# 1. เข้าไปยังโฟลเดอร์โปรเจกต์ของคุณ
cd /path/to/your/app

# 2. สร้างโฟลเดอร์ database รอไว้ล่วงหน้า
mkdir -p database

# 3. มอบสิทธิ์ให้ user ที่รันเว็บแอป (เช่น www-data) เป็นเจ้าของและเขียนโฟลเดอร์นี้ได้
sudo chown -R www-data:www-data database
sudo chmod 775 database
```

> [!NOTE]
> * หากรันแอปผ่าน PM2 ด้วยสิทธิ์ของ User ปกติ (เช่น `ubuntu` หรือ `node`) ให้เปลี่ยนคำว่า `www-data:www-data` เป็น `ชื่อผู้ใช้:ชื่อผู้ใช้` ของท่านแทน
> * เมื่อกำหนดสิทธิ์โฟลเดอร์เป็น `775` และแอปเป็นผู้สร้างไฟล์ฐานข้อมูล `tha_khlong.db` เอง ตัวระบบจะรันงานต่อได้ทันทีโดยไม่ต้องสั่ง `chmod` บนไฟล์ซ้ำ

---

## 4. ทำไมสเตปนี้ถึงทำงานได้อย่างราบรื่น?
1. **Adaptive URL**: ไคลเอนต์ฝั่งเบราว์เซอร์จะตรวจสอบโดยอัตโนมัติ หากพบว่าใช้งานภายใต้โปรโตคอล `https:` ระบบจะเปลี่ยน URL สำหรับเชื่อมต่อไปใช้ `wss://ai.samkhok.org/ws` โดยวิ่งเข้า Nginx (พอร์ต 443) โดยตรง ทำให้ไม่มีปัญหาเรื่องการบล็อกพอร์ตภายนอกหรือเรื่อง SSL
2. **Zero Insecure Ports**: ไม่จำเป็นต้องเปิดพอร์ต `3001` ออกสู่อินเทอร์เน็ตภายนอก (ไม่ต้องตั้งค่า UFW firewall เพิ่มเติมสำหรับพอร์ต `3001`) ช่วยยกระดับความปลอดภัยให้กับเซิร์ฟเวอร์โรงเรียน

