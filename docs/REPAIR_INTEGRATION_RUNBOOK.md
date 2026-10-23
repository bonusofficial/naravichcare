# Repair Integration Runbook

คู่มือดูแล API Key และการเชื่อม Web POS ↔ NavarichCare (Repair Integration API v1)
รายละเอียด endpoint ดูที่ [`REPAIR_INTEGRATION_API.md`](REPAIR_INTEGRATION_API.md)

> เอกสารนี้ไม่มี Secret จริง ทุกค่าที่อยู่ใน `<...>` คือ placeholder

---

## 1. ใครทำอะไรได้

| การกระทำ | Role |
|---|---|
| ดู / สร้าง / Reset-Rotate / Revoke API Key | `super_admin` เท่านั้น |
| `admin`, `technician`, `staff`, `viewer`, custom role ทุกตัว | เข้าไม่ได้ (เมนูไม่แสดง, หน้าเว็บ redirect, API ตอบ `403`) |

ใช้การตรวจชื่อ role `super_admin` ฝั่ง server (ทั้ง middleware และ route handler ที่อ่าน role จากฐานข้อมูล) ไม่ได้ใช้ permission เพราะ permission สามารถถูกติ๊กให้ custom role ได้จากหน้าจัดการสิทธิ์

## 2. สร้าง API Key

1. เข้าสู่ระบบด้วยบัญชี `super_admin`
2. เมนู **บุคลากร → Integration API Keys** (`/admin/settings/integration-keys`)
3. กรอก **ชื่อ Key** ให้สื่อความหมาย เช่น `Web POS Production`
4. เลือก **Scope** — Web POS ใช้ครบ 4 ตัว: `repair:read`, `repair:write`, `repair:cancel`, `repair:handover`
5. (ไม่บังคับ) เลือก **วันหมดอายุ** — Key หมดอายุตอน 23:59:59 ของวันนั้นตามเวลาเครื่องที่ใช้งาน, สูงสุด 5 ปี
6. กด **สร้าง API Key**

## 3. คัดลอก Key ครั้งแรก (แสดงครั้งเดียว)

- หลังสร้างจะมีหน้าต่างแสดง Key เต็ม `nvc_live_…` **เพียงครั้งเดียว**
- กด **คัดลอก Key** แล้วนำไปตั้งค่าที่ POS ทันที (ข้อ 4)
- ปิดหน้าต่างแล้ว **ไม่มีทางดู Key เดิมได้อีก** ระบบเก็บไว้แค่ hash — หน้า List แสดงแค่ prefix และ 4 ตัวท้าย
- ห้ามส่ง Key ทางแชต/อีเมล/ภาพหน้าจอ ให้วางลงไฟล์ env ของเซิร์ฟเวอร์ POS โดยตรง

## 4. ตั้งค่า `REPAIR_API_KEY` ที่ POS

บนเซิร์ฟเวอร์ NaravichPOS (`api/.env`):

```
REPAIR_API_URL=https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs
REPAIR_API_KEY=<วาง Key ที่คัดลอกมา>
```

จากนั้นรีสตาร์ต POS API (เช่น `pm2 restart <pos-api>`) แล้วทดสอบด้วยการกด **Sync** งานซ่อมหนึ่งงานใน POS หรือ:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  "https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs?limit=1" \
  -H "Authorization: Bearer $REPAIR_API_KEY"
# ต้องได้ 200
```

## 5. Reset / Rotate Key

ใช้เมื่อ: สงสัยว่า Key รั่ว, พนักงานที่เคยเห็น Key ลาออก, ทำ Key หาย, หรือหมุนเวียนตามรอบ

1. หน้า Integration API Keys → กด **Reset / Rotate** ที่ Key นั้น
2. อ่านคำเตือนแล้วกด **ยืนยัน Rotate**
3. คัดลอก Key ใหม่จากหน้าต่าง (แสดงครั้งเดียว)
4. อัปเดต `REPAIR_API_KEY` ที่ POS แล้วรีสตาร์ต POS API ทันที

ผลของ Rotate:
- Secret เดิม **ใช้ไม่ได้ทันที** (POS จะได้ `401` จนกว่าจะอัปเดต Key) — ควรทำช่วงที่ไม่มีการส่งซ่อม
- prefix (`nvc_live_<publicId>`) คงเดิม, สถานะ/สิทธิ์/วันหมดอายุคงเดิม
- บันทึก `rotatedAt`, ผู้ Rotate, จำนวนครั้ง และ AdminLog `integration_key.rotated`
- Key ที่ Revoke หรือหมดอายุแล้ว Rotate ไม่ได้ — ให้สร้าง Key ใหม่

## 6. Revoke Key

1. กด **Revoke** → ใส่เหตุผล (บังคับ) → **ยืนยัน Revoke**
2. Key ใช้ไม่ได้ทันทีและถาวร record ไม่ถูกลบ (เก็บผู้ Revoke, เวลา, เหตุผล) + AdminLog `integration_key.revoked`
3. ถ้าต้องการเชื่อมต่อต่อ ให้สร้าง Key ใหม่แล้วตั้งค่าที่ POS

## 7. Recovery เมื่อ Key หาย

ไม่สามารถกู้ Key เดิมได้ (ไม่มี plaintext ในระบบ)

- ถ้า Key หายแต่ไม่น่ารั่ว → **Rotate** แล้วตั้ง Key ใหม่ที่ POS
- ถ้าสงสัยว่ารั่ว → **Revoke** ทันที, สร้าง Key ใหม่, ตั้งที่ POS, แล้วตรวจ AdminLog/Last Used ย้อนหลัง (ข้อ 8)
- ถ้าบัญชี `super_admin` เข้าไม่ได้ → กู้บัญชีบนเซิร์ฟเวอร์ก่อนด้วย `ADMIN_USERNAME=<user> ADMIN_PASSWORD=<รหัสใหม่> npx tsx reset-admin-password.ts` หรือสร้างใหม่ด้วย `npm run create-admin`

## 8. ตรวจ Last Used / ร่องรอยการใช้งาน

- หน้า List แสดง **Last used** (เวลา + IP) — อัปเดตอย่างน้อยทุก 60 วินาทีเมื่อมีการใช้งาน หรือทันทีเมื่อ IP เปลี่ยน
- หน้า **บันทึกการใช้งาน (Logs)**: action `integration_key.*` (จัดการ Key) และ `repair_integration.created` / `.cancelled` / `.handed_over` (ผู้ทำ = `integration:<ชื่อ Key>`)
- Log ของ process (pm2 / stdout) มีบรรทัด JSON ต่อ request:
  - `integration.request` — `requestId`, method, path, status, `durationMs`, `client` (publicId), ip, `errorCode`
  - `integration.auth_failed` — เหตุผล (`missing`/`malformed`/`unknown_key`/`bad_secret`/`revoked`/`expired`), ip, publicId (ถ้าอ่านได้) — **ไม่มี secret**
  - Authorization header, API Key, password, base64 และข้อมูลลูกค้าถูก redact เสมอ
  - ปิด log นี้ได้ด้วย `INTEGRATION_API_LOG=off`

```bash
pm2 logs <navarichcare-app> --lines 500 | grep integration.auth_failed
```

## 9. รับมือ Error ที่พบบ่อย

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| `401 INVALID_API_KEY` | Key พิมพ์ผิด/ตกหล่น, ถูก Rotate/Revoke, หมดอายุ, ส่งเป็น `Basic` หรือไม่มี `Bearer` | ตรวจสถานะ Key ในหน้า List, ดู `integration.auth_failed` ใน log หา reason, Rotate แล้วตั้ง Key ใหม่ |
| `403 INSUFFICIENT_SCOPE` | Key ไม่มี scope ของ endpoint | Scope แก้ภายหลังไม่ได้ ให้สร้าง Key ใหม่ที่มี scope ครบ แล้ว Revoke ตัวเก่า |
| `409 EXTERNAL_REFERENCE_CONFLICT` | POS ส่ง `reference` เดิมแต่ข้อมูลเปลี่ยน (เช่นแก้ชื่อรุ่น/อาการหลังส่งครั้งแรก) | งานถูกสร้างไว้แล้ว — ใช้ `GET /repair-jobs?externalRef=<reference>` หา `id` เดิม หากข้อมูลผิดให้แอดมินแก้ในระบบซ่อม |
| `409 IDEMPOTENCY_CONFLICT` | ใช้ `Idempotency-Key` เดิมกับ payload ใหม่ | ใช้ Key ใหม่ต่อ 1 คำขอสร้างงาน |
| `409 REPAIR_CLOSED` / `INVALID_STATUS_TRANSITION` | ยกเลิกงานที่ซ่อมเสร็จแล้ว / handover ก่อนพร้อม | อ่านสถานะล่าสุดก่อน (`GET /repair-jobs/{id}`) |
| `429 RATE_LIMITED` | เรียกถี่เกินโควตา | รอ `Retry-After` วินาที, ลดความถี่ polling (แนะนำ ≥ 60 วินาทีต่องาน หรือใช้ search แบบแบ่งหน้า), หรือเพิ่ม `INTEGRATION_API_RATE_LIMIT` |
| `415` / `413` | ไม่ได้ส่ง `Content-Type: application/json` / body ใหญ่เกิน 64 KB | แก้ client; ห้ามส่งรูปเป็น base64 ให้ส่ง URL |

ทุก error มี `requestId` (= header `X-Request-Id`) ใช้ค้นใน log ฝั่ง NavarichCare ได้

## 10. Deployment checklist

- [ ] Backup ฐานข้อมูลก่อน deploy (ดู `SETUP-VPS.md` หัวข้อ backup — `mongodump ... --archive > backup-$(date +%F).archive`)
- [ ] `git pull` และ `npm ci`
- [ ] ตรวจ/เพิ่ม env ใน `.env.local` ของ production (ดู `.env.example`): `INTEGRATION_API_RATE_LIMIT`, `INTEGRATION_API_IP_RATE_LIMIT`, `INTEGRATION_API_RATE_WINDOW_SECONDS`, `INTEGRATION_API_ALLOW_HTTP=false`, (ไม่บังคับ) `INTEGRATION_POS_ASSET_BASE_URL`
- [ ] `npm test` ผ่าน (ต้องตั้ง `MONGODB_URI_TEST` ให้ชี้ฐาน `*_test` บน localhost — ห้ามชี้ production)
- [ ] `npm run build`
- [ ] `npm run push-schema` เพื่อสร้าง collection `integrationapikeys` และ index ใหม่ของ `repairjobs` (unique `source+externalRef`, unique `source+integration.idempotencyKey`) — หมายเหตุ: สคริปต์นี้ใช้ `syncIndexes()` ซึ่งลบ index ที่ไม่มีใน schema ด้วย ให้ backup ก่อนเสมอ
- [ ] `pm2 restart <navarichcare-app>`
- [ ] Super Admin สร้าง Key → ตั้ง `REPAIR_API_URL` + `REPAIR_API_KEY` ที่ POS → รีสตาร์ต POS API
- [ ] ทดสอบ curl ข้อ 4 ได้ `200` และกด Sync งานทดสอบจาก POS 1 งาน → เห็นงานในหน้า "รายการงานซ่อม" พร้อมป้าย "เครื่องของร้าน / ส่งจาก POS"
- [ ] ถ้ารันหลาย instance: รับทราบว่า rate limit เป็นแบบ in-memory ต่อ instance

## 11. Rollback checklist

- [ ] Revoke Key ทุกตัวในหน้า Integration API Keys (หรือหยุด POS ไม่ให้ Sync) เพื่อไม่ให้ POS ส่งงานระหว่าง rollback
- [ ] ย้อนโค้ดไป commit ก่อนหน้า, `npm ci && npm run build && pm2 restart <navarichcare-app>`
- [ ] ข้อมูลใหม่เป็นแบบ additive (field `ownerType`, `source`, `externalRef`, `integration`, `repairCompletedAt`, `handedOverAt`, `costsVersion`, collection `integrationapikeys`, counter `repair_job:*`, `repair_customer`) — ไม่ต้องลบ โค้ดเก่าอ่านงานได้ตามปกติ
- [ ] งานจาก POS ที่ไม่มีลูกค้า (`ownerType=store`) จะแสดงช่องลูกค้าว่างในหน้าเก่า — ไม่กระทบงานอื่น
- [ ] โค้ดเก่าออกเลขงานด้วย `countDocuments()+1` อาจชนกับเลขที่ counter ออกไปแล้ว (unique index จะปฏิเสธ) — ถ้าต้อง rollback นาน ให้ตรวจการเปิดงานใหม่
- [ ] ถ้าจำเป็นต้อง restore ข้อมูล ใช้ archive ที่ backup ไว้ (`mongorestore --archive`)

## 12. Security checklist

- [ ] Key แสดงครั้งเดียวและไม่ถูกบันทึกที่ใดนอกจาก env ของ POS
- [ ] `INTEGRATION_API_ALLOW_HTTP=false` ใน production
- [ ] แอป NavarichCare ฟังที่ `127.0.0.1` หลัง Cloudflare Tunnel/reverse proxy เท่านั้น (IP สำหรับ rate limit อ่านจาก header ของ proxy)
- [ ] ใช้ HTTPS ระหว่าง POS ↔ NavarichCare เสมอ
- [ ] ตั้งวันหมดอายุ หรือกำหนดรอบ Rotate (เช่น ทุก 90 วัน)
- [ ] ให้ Scope เท่าที่จำเป็นต่อ Key
- [ ] Revoke Key ที่ไม่ใช้แล้ว และตรวจ Last Used เป็นระยะ
- [ ] ตรวจ log `integration.auth_failed` ที่ผิดปกติ (จำนวนมากจาก IP เดียว = มีคนเดา Key)
- [ ] ห้ามใส่ Key ใน URL/query string (ระบบปฏิเสธอยู่แล้ว)
- [ ] งานจาก POS ลบ (hard delete) จากหน้าแอดมินไม่ได้ — ใช้การยกเลิกแทน

## 13. ข้อจำกัดและสิ่งที่ยังไม่ทำใน Phase นี้

- ไม่มี Payment Gateway / Payment API / Payment Webhook
- ไม่มี Webhook แจ้งสถานะกลับ POS — POS ต้อง polling
- โค้ด POS ยังไม่มี: ตัว polling สถานะ/ค่าใช้จ่าย, การเรียก `cancel`/`handover` ไปที่ NavarichCare, การส่ง `Idempotency-Key` (การสร้างงานใช้ได้แล้วโดยไม่ต้องแก้ POS)
- Rate limit เป็น in-memory ต่อ process
- `repairItems` คืน `[]` เสมอ (ยังไม่มีการแยกรายการอะไหล่)
- รูปจาก POS ที่เป็น path แบบ relative จะแสดงในหน้าแอดมินเป็นข้อความ (ไม่ใช่ลิงก์) จนกว่าจะตั้ง `INTEGRATION_POS_ASSET_BASE_URL`
- รูปที่แอดมินอัปโหลดในหน้ารายละเอียดงานยังเก็บเป็น base64 ในเอกสารงาน (พฤติกรรมเดิม) แต่ไม่ถูกส่งออกทาง Integration API
