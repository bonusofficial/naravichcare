# Setup บน VPS (Ubuntu 24.04)

คู่มือติดตั้ง MongoDB ด้วย Docker + รันระบบ navarichcare

## 1. ติดตั้ง Docker

```bash
# ติดตั้งจาก official Docker repository
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# ให้ user ปัจจุบันใช้ docker ได้โดยไม่ต้อง sudo (ต้อง logout/login ใหม่ 1 ครั้ง)
sudo usermod -aG docker $USER
```

## 2. ติดตั้ง Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## 3. อัปโหลดโปรเจกต์ขึ้น VPS

อัปโหลดโฟลเดอร์โปรเจกต์ไปไว้ที่ `/var/www/navarichcare` (ผ่าน git clone, scp หรือ rsync)

> **สำคัญ:** ไฟล์ `.env` และ `.env.local` อยู่ใน .gitignore — ถ้าใช้ git clone ต้อง copy 2 ไฟล์นี้ขึ้นไปเองด้วย:
> ```bash
> scp .env .env.local user@your-vps:/var/www/navarichcare/
> ```

## 4. แก้รหัสผ่าน MongoDB (แนะนำให้เปลี่ยนใหม่บน production)

```bash
cd /var/www/navarichcare

# สร้างรหัสผ่านใหม่
openssl rand -hex 24
```

เอารหัสผ่านที่ได้ไปแก้ **2 ที่ให้ตรงกัน** และตั้งค่า storage เพิ่ม:
- `.env` → บรรทัด `MONGO_ROOT_PASSWORD=...`
- `.env.local` → ส่วน password ใน `MONGODB_URI` (รูปแบบ `mongodb://navarich:<รหัสผ่าน>@localhost:27017/navarichcare?authSource=admin`)
- `.env.local` → เพิ่ม `BUYBACK_STORAGE_DIR=/var/lib/navarichcare/buybacks`
- `.env.local` → เพิ่ม `HERO_BANNER_STORAGE_DIR=/var/lib/navarichcare/hero-banner`

> ต้องแก้**ก่อน**สตาร์ท MongoDB ครั้งแรก เพราะ Mongo จะสร้าง user ตอน initialize ข้อมูลครั้งแรกเท่านั้น

## 5. สตาร์ท MongoDB

```bash
cd /var/www/navarichcare
docker compose up -d

# เช็คสถานะ (รอจน healthy)
docker compose ps
docker compose logs mongodb --tail 20
```

MongoDB จะเปิดที่ `127.0.0.1:27017` เท่านั้น (เข้าจากภายนอก VPS ไม่ได้ — ตั้งใจเพื่อความปลอดภัย)

## 6. เตรียม persistent storage สำหรับไฟล์ระบบ

แทน `<app-user>` ด้วย Linux user ที่ใช้รัน PM2:

```bash
sudo install -d -o <app-user> -g <app-user> -m 0750 /var/lib/navarichcare/buybacks
sudo install -d -o <app-user> -g <app-user> -m 0750 /var/lib/navarichcare/hero-banner
```

ห้ามวาง directory เหล่านี้ไว้ใต้ `public/` ระบบจะเปิดอ่านเฉพาะไฟล์ที่อนุญาตผ่าน API และควรรวมทั้งสอง directory ในแผน backup เพราะ PDF ใบรับคืนและรูป Hero ต้องคงอยู่หลัง deploy

## 7. Backup, ติดตั้ง dependencies และ migrate

```bash
cd /var/www/navarichcare
npm ci

# backup ก่อน migrate (ใช้รหัสจริงแทน <รหัสผ่าน>)
docker exec navarichcare-mongo mongodump \
  --username navarich --password "<รหัสผ่าน>" --authenticationDatabase admin \
  --db navarichcare --archive > backup-before-buyback-$(date +%F).archive

npm run migrate:coverage             # dry-run: ตรวจรายการที่พร้อม/ข้อมูลไม่ครบ
npm run migrate:coverage -- --apply  # apply เมื่อผล dry-run ถูกต้อง
npm run push-schema                  # สร้าง collections + unique indexes
```

รายการเก่าที่ขึ้น `REGISTRATION_INCOMPLETE` ต้องแก้ในเมนู **ซื้อคืนแพ็ก → แก้ข้อมูลแพ็กเก่า** ก่อนซื้อคืนได้ จากนั้นสร้างสาขาและผูก admin อย่างน้อย 2 บัญชี เพื่อแยกผู้สร้างกับผู้อนุมัติ

## 8. Build + รันระบบ

```bash
npm run build
npm start             # เปิดที่ port 3000
```

### รันค้างไว้ถาวรด้วย pm2 (แนะนำ)

```bash
sudo npm install -g pm2
pm2 start npm --name navarichcare -- start
pm2 save
pm2 startup   # ทำตามคำสั่งที่ขึ้นมา เพื่อให้รันอัตโนมัติตอน reboot
```

จากนั้นตั้ง reverse proxy (nginx/caddy) ชี้มาที่ `localhost:3000` และทำ SSL ตามปกติ

## 9. ตั้ง cron ลบรูปตามอายุ

สร้างไฟล์ `/etc/cron.d/navarichcare-buyback-cleanup` โดยแทน `<app-user>` ด้วย user ที่อ่าน `.env.local` และเขียน private storage ได้:

```bash
sudo install -o <app-user> -g <app-user> -m 0640 /dev/null /var/log/navarichcare-buyback-cleanup.log
```

```cron
15 2 * * * <app-user> cd /var/www/navarichcare && /usr/bin/npm run cleanup:buyback-images >> /var/log/navarichcare-buyback-cleanup.log 2>&1
```

จากนั้นทดสอบด้วย `cd /var/www/navarichcare && npm run cleanup:buyback-images` สคริปต์จะลบรูปของรายการอนุมัติ/ปฏิเสธเมื่อครบ 35 วัน, ลบ orphan upload ที่เกิน 24 ชั่วโมง และเก็บ audit log โดยไม่ลบ PDF

## 10. ผูก Domain ด้วย Cloudflare Tunnel (ไม่ต้องใช้ nginx/certbot)

> ใช้ได้เมื่อโดเมนอยู่บน Cloudflare แล้ว — Cloudflare จัดการ SSL ให้ และไม่ต้องเปิด port 80/443 บน VPS

```bash
# ติดตั้ง cloudflared
mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | tee /etc/apt/sources.list.d/cloudflared.list
apt-get update && apt-get install -y cloudflared
```

จากนั้นที่ [one.dash.cloudflare.com](https://one.dash.cloudflare.com):

1. **Networks → Tunnels → Create a tunnel** → เลือก Cloudflared → ตั้งชื่อ → Save
2. Copy คำสั่ง install (Debian/Ubuntu 64-bit) มารันบน VPS: `cloudflared service install eyJ...`
3. ขั้น Public Hostname: Domain = โดเมนของคุณ, Service = `HTTP` → `localhost:3000` → Save
4. DNS record ถูกสร้างให้อัตโนมัติ เปิด `https://yourdomain.com` ได้เลย

คำสั่งดูแล: `systemctl status cloudflared` / `journalctl -u cloudflared -f` / `systemctl restart cloudflared`

ปิด firewall ให้เหลือแค่ SSH ได้เลย (tunnel วิ่งขาออก ไม่ต้องเปิดรับขาเข้า):

```bash
ufw allow OpenSSH
ufw enable
```

## คำสั่งดูแลรักษา

```bash
docker compose logs -f mongodb        # ดู log
docker compose restart mongodb        # restart
docker compose down                   # หยุด (ข้อมูลไม่หาย อยู่ใน volume)
docker compose down -v                # หยุด + ลบข้อมูลทั้งหมด (ระวัง!)

# backup ฐานข้อมูล
docker exec navarichcare-mongo mongodump \
  --username navarich --password "<รหัสผ่าน>" --authenticationDatabase admin \
  --db navarichcare --archive > backup-$(date +%F).archive

# restore
docker exec -i navarichcare-mongo mongorestore \
  --username navarich --password "<รหัสผ่าน>" --authenticationDatabase admin \
  --archive < backup-2026-06-12.archive

# backup PDF ใบรับคืน รูป Hero และ private files
sudo tar -czf navarichcare-files-$(date +%F).tar.gz -C /var/lib/navarichcare buybacks hero-banner
```

## แก้ปัญหาที่เจอบ่อย

- **Container ขึ้นแล้วดับทันที + log มีคำว่า AVX** → CPU ของ VPS ไม่รองรับ AVX ซึ่ง MongoDB 5+ ต้องใช้ ให้เปลี่ยน image ใน docker-compose.yml จาก `mongo:8` เป็น `mongo:4.4` (หรือย้าย VPS ที่ CPU ใหม่กว่า)
- **Authentication failed** → รหัสผ่านใน `.env` กับ `.env.local` ไม่ตรงกัน หรือแก้รหัสหลังจาก Mongo initialize ไปแล้ว — ถ้าเพิ่งเริ่มและยังไม่มีข้อมูลสำคัญ ให้ `docker compose down -v` แล้ว `up -d` ใหม่
