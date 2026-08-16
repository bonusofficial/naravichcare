# NavarichCare

ระบบลงทะเบียนแพ็กคุ้มครอง เคลม งานซ่อม และซื้อคืนแพ็ก ใช้ Next.js กับ MongoDB

## เริ่มระบบในเครื่อง

```bash
docker compose up -d
npm install
npm run push-schema
npm run dev
```

เปิด [http://localhost:3000/admin](http://localhost:3000/admin) และดูคู่มือติดตั้ง production ที่ [SETUP-VPS.md](./SETUP-VPS.md)

## ระบบซื้อคืนแพ็ก

- เมนู `/admin/buybacks` สำหรับ `admin` และ `super_admin`
- ต้องผูกบัญชีกับสาขา และผู้สร้างรายการห้ามอนุมัติรายการของตนเอง
- ตั้ง `BUYBACK_STORAGE_DIR` เป็น private persistent directory ห้ามอยู่ใน `public/`
- PDF ใบรับคืนเก็บถาวร ส่วนรูปถูกลบหลังอนุมัติหรือปฏิเสธ 35 วัน

คำสั่งที่เกี่ยวข้อง:

```bash
npm run migrate:coverage             # dry-run
npm run migrate:coverage -- --apply  # migrate จริงหลัง backup
npm run cleanup:buyback-images       # งาน cron รายวัน
npm run test:buyback
```

## แก้ไข Hero Banner

- เมนู `/admin/hero-banner` แก้รูปหลัก ไอคอน Badge ขวา ตำแหน่งรูป ข้อความ และราคา
- ตั้ง `HERO_BANNER_STORAGE_DIR` เป็น persistent directory ที่ user ของแอปเขียนได้
- รูปที่อัปโหลดจะถูกตรวจชนิดจริง ย่อขนาด ตัด EXIF และแสดงผ่าน public read-only API
- ทดสอบส่วนนี้ด้วย `npm run test:hero-banner`
