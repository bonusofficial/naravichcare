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

เอาค่าที่ได้ไปแก้ **2 ที่ให้ตรงกัน**:
- `.env` → บรรทัด `MONGO_ROOT_PASSWORD=...`
- `.env.local` → ส่วน password ใน `MONGODB_URI` (รูปแบบ `mongodb://navarich:<รหัสผ่าน>@localhost:27017/navarichcare?authSource=admin`)

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

## 6. ติดตั้ง dependencies + push schema

```bash
cd /var/www/navarichcare
npm install
npm run push-schema   # สร้าง collections + indexes ทั้งหมด
```

## 7. Build + รันระบบ

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
```

## แก้ปัญหาที่เจอบ่อย

- **Container ขึ้นแล้วดับทันที + log มีคำว่า AVX** → CPU ของ VPS ไม่รองรับ AVX ซึ่ง MongoDB 5+ ต้องใช้ ให้เปลี่ยน image ใน docker-compose.yml จาก `mongo:8` เป็น `mongo:4.4` (หรือย้าย VPS ที่ CPU ใหม่กว่า)
- **Authentication failed** → รหัสผ่านใน `.env` กับ `.env.local` ไม่ตรงกัน หรือแก้รหัสหลังจาก Mongo initialize ไปแล้ว — ถ้าเพิ่งเริ่มและยังไม่มีข้อมูลสำคัญ ให้ `docker compose down -v` แล้ว `up -d` ใหม่
