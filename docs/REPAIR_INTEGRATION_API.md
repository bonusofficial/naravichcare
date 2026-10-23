# Repair Integration API v1

API สำหรับให้ **Web POS (NaravichPOS)** สร้างและติดตามงานซ่อมใน NavarichCare แบบ machine-to-machine
แยกจาก Admin API เดิม (`/api/admin/*`) โดยสิ้นเชิง และไม่ใช้ cookie ของแอดมิน

- OpenAPI: [`docs/openapi/repair-integration-v1.yaml`](openapi/repair-integration-v1.yaml)
- คู่มือการใช้งาน/ดูแลระบบ: [`docs/REPAIR_INTEGRATION_RUNBOOK.md`](REPAIR_INTEGRATION_RUNBOOK.md)
- โค้ดหลัก: `src/app/api/integration/v1/**`, `src/lib/integration/**`, `src/lib/repair/**`

ขอบเขต Phase นี้: ยังไม่มี Payment Gateway, Payment API, Payment Webhook และยังไม่มี Webhook ส่งสถานะกลับ POS — POS ต้อง **polling** สถานะเอง

---

## 1. Base URL และเวอร์ชัน

| รายการ | ค่า |
|---|---|
| Base URL | `https://<NAVARICHCARE_HOST>/api/integration/v1` |
| API Version | `v1` (อยู่ใน path) |
| Content-Type | `application/json` (UTF-8) |
| เวลา | ISO 8601 UTC เช่น `2026-10-24T03:15:00.000Z` |
| สกุลเงิน | THB, ทศนิยมไม่เกิน 2 ตำแหน่ง |

ฝั่ง POS ตั้ง `REPAIR_API_URL` เป็น URL เต็มของ endpoint สร้างงาน:

```
REPAIR_API_URL=https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs
```

## 2. Authentication

ทุก request ต้องส่ง API Key ใน header เท่านั้น:

```
Authorization: Bearer <REPAIR_API_KEY>
```

- รูปแบบ Key: `nvc_live_<publicId 16 hex>_<secret 43 ตัวอักษร base64url>` (secret 256 bits)
- ระบบเก็บเฉพาะ SHA-256 ของ secret — ไม่มีใครดู Key เดิมย้อนหลังได้ (รวมถึง Super Admin)
- **ห้ามส่ง Key ใน query string** — ถ้าพบพารามิเตอร์ `api_key`, `apikey`, `apiKey`, `key`, `access_token` หรือ `token` ระบบตอบ `400 VALIDATION_ERROR`
- Key ผิด, รูปแบบผิด, หมดอายุ หรือถูก Revoke → `401 INVALID_API_KEY` ด้วยข้อความเดียวกันทุกกรณี (ไม่บอกว่า Key ID มีอยู่จริงหรือไม่)
- สร้าง/Rotate/Revoke Key ได้เฉพาะ **Super Admin** ที่หน้า `/admin/settings/integration-keys` (ดู Runbook)

## 3. Scopes

| Scope | ใช้กับ |
|---|---|
| `repair:read` | `GET /repair-jobs`, `GET /repair-jobs/{id}`, `GET /repair-jobs/{id}/costs` |
| `repair:write` | `POST /repair-jobs` |
| `repair:cancel` | `POST /repair-jobs/{id}/cancel` |
| `repair:handover` | `POST /repair-jobs/{id}/handover` |

Scope ไม่พอ → `403 INSUFFICIENT_SCOPE` (ตรวจฝั่ง server ทุก endpoint)
Key สำหรับ Web POS ปกติให้เลือกครบทั้ง 4 scope

## 4. Headers

**Request**

| Header | จำเป็น | คำอธิบาย |
|---|---|---|
| `Authorization` | ✔ | `Bearer <API_KEY>` |
| `Content-Type` | เมื่อมี body | ต้องเป็น `application/json` มิฉะนั้นได้ `415 UNSUPPORTED_MEDIA_TYPE` |
| `Idempotency-Key` | – | เฉพาะ `POST /repair-jobs` รูปแบบ `^[A-Za-z0-9._:-]{8,128}$` |

**Response**

| Header | คำอธิบาย |
|---|---|
| `X-Request-Id` | UUID ของ request นี้ ใช้อ้างอิงเวลาแจ้งปัญหา (ตรงกับ `error.requestId`) |
| `X-RateLimit-Limit` / `X-RateLimit-Remaining` | โควตาของ window ปัจจุบัน |
| `Retry-After` | วินาทีที่ต้องรอ (เฉพาะ `429`) |
| `Idempotent-Replayed: true` | การสร้างงานซ้ำที่คืนงานเดิม (status `200`) |
| `Cache-Control: no-store` | ทุก response |

Body ของ request จำกัดไม่เกิน **64 KB** (`413 PAYLOAD_TOO_LARGE`)

## 5. Idempotency (กันงานซ้ำ)

`POST /repair-jobs` ปลอดภัยต่อการ retry:

1. ถ้าส่ง `Idempotency-Key` และ Key นี้เคยใช้แล้ว
   - payload เหมือนเดิม → คืนงานเดิม `200` + `Idempotent-Replayed: true`
   - payload ต่างกัน → `409 IDEMPOTENCY_CONFLICT`
2. ถ้าไม่ส่ง (POS ปัจจุบันไม่ส่ง) ระบบใช้ `reference` เป็นตัวกันซ้ำ
   - `reference` เดิม + payload เหมือนเดิม → คืนงานเดิม `200`
   - `reference` เดิม + payload ต่าง → `409 EXTERNAL_REFERENCE_CONFLICT`
3. Request พร้อมกันหลายตัวที่ reference/key เดียวกันได้งานเดียวเสมอ (unique index ใน MongoDB + ระบบคืนงานของผู้ชนะให้ request อื่น)

"payload เหมือนเดิม" เทียบจาก SHA-256 ของ payload หลัง normalize (trim ช่องว่าง, ค่าว่างถือเป็น `null`, เรียง key)
`reference` และ `Idempotency-Key` ไม่ซ้ำกันในระดับระบบ POS (`source = pos`) ไม่ผูกกับ API Key ตัวใดตัวหนึ่ง จึงยังกันซ้ำได้หลัง Rotate Key

## 6. Rate Limit

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `INTEGRATION_API_RATE_LIMIT` | `120` | จำนวน request ต่อ API Key ต่อ window |
| `INTEGRATION_API_IP_RATE_LIMIT` | เท่ากับข้างบน | จำนวน request ต่อ IP ต่อ window (นับก่อนตรวจ Key เพื่อกันการเดา Key) |
| `INTEGRATION_API_RATE_WINDOW_SECONDS` | `60` | ความยาว window (วินาที) |

เกินโควตา → `429 RATE_LIMITED` พร้อม `Retry-After`

> ตัวนับเก็บในหน่วยความจำของ process (in-memory) — ถ้ารันหลาย instance โควตาจริงจะเป็น `limit × จำนวน instance` และค่าจะรีเซ็ตเมื่อรีสตาร์ต ถ้าจะ scale หลายเครื่องให้ย้ายไปใช้ store กลาง (เช่น Redis)
> IP อ่านจาก `CF-Connecting-IP` → `X-Real-IP` → `X-Forwarded-For` ตัวแรก ซึ่งเชื่อถือได้เพราะแอปฟังที่ `127.0.0.1` หลัง Cloudflare Tunnel/reverse proxy เท่านั้น

## 7. Endpoints

ทุก endpoint เข้าถึงได้เฉพาะงานที่ **สร้างผ่าน Integration API** (`source = pos`) งานที่แอดมินเปิดเองจะได้ `404`
`{id}` คือ `id` ที่ได้จากตอนสร้าง (MongoDB ObjectId 24 hex) — id รูปแบบอื่นได้ `404`

### 7.1 `POST /repair-jobs` — สร้างงานซ่อม (scope `repair:write`)

Payload ปัจจุบันของ POS (ใช้ได้ทันทีโดยไม่ต้องแก้ POS):

```json
{
  "reference": "REP-20261024-MH3K2Z1A-1F2E3D",
  "productCode": "NV-00001",
  "imei": "356938035643809",
  "model": "Apple iPhone 13 128GB",
  "branchId": "6f1c2a52-6a1e-4bd4-9c39-1f0f6f0b9a11",
  "symptom": "หน้าจอมีปัญหา",
  "imageUrls": null
}
```

Field ทั้งหมดที่รับ (field อื่นถูกปฏิเสธด้วย `400 VALIDATION_ERROR`):

| Field | ชนิด | จำเป็น | กติกา |
|---|---|---|---|
| `reference` | string | ✔ | เลขงานซ่อมฝั่ง POS, unique, `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$` |
| `model` | string | ✔ | ≤ 200 ตัวอักษร รูปแบบ `"<ยี่ห้อ> <รุ่น>"` (คำแรกถือเป็นยี่ห้อ) |
| `symptom` | string | ✔ | ≤ 4000 ตัวอักษร (ขึ้นบรรทัดใหม่ได้) |
| `imei` | string \| null | * | ตัวเลข 14–17 หลัก (กติกาเดียวกับ POS) |
| `serialNumber` | string \| null | * | `^[A-Za-z0-9./-]{1,64}$` |
| `productCode` | string \| null | * | ≤ 64 ตัวอักษร |
| `inventoryItemId` | string \| null | – | `^[A-Za-z0-9-]{1,64}$` (UUID ของ POS) |
| `branchId` | string \| null | – | `^[A-Za-z0-9-]{1,64}$` (UUID สาขา POS) |
| `branchCode` | string \| null | – | `^[A-Za-z0-9_-]{1,32}$` |
| `ownerType` | `"store"` \| `"customer"` | – | ค่าเริ่มต้น `"store"` |
| `customer` | object | เมื่อ `ownerType=customer` | ห้ามส่งเมื่อ `ownerType=store` |
| `imageUrls` | string[] \| null | – | ไม่เกิน 10 รายการ, แต่ละรายการ ≤ 2048 ตัวอักษร |

\* ต้องมีอย่างน้อยหนึ่งใน `imei`, `serialNumber`, `productCode`
ค่า string ว่าง (`""`) ถือเป็น `null`

`customer` (เฉพาะ `ownerType=customer`): `firstName` (≤100), `lastName` (≤100), `phone` (`^0\d{8,9}$`), `lineId` (≤100, ไม่บังคับ) — ใช้กติกาเดิมของระบบ: ถ้ามีลูกค้าเบอร์นี้อยู่แล้วจะผูกกับลูกค้าเดิม ถ้าไม่มีจะสร้างใหม่

`imageUrls` รับได้ 2 แบบ:
- URL แบบ `https://` (รับ `http://` เฉพาะเมื่อ `INTEGRATION_API_ALLOW_HTTP=true`)
- path แบบ root-relative ของ POS เช่น `/api/product-images/files/abc.jpg` (รูปแบบที่ POS เก็บอยู่ปัจจุบัน) ถ้าตั้ง `INTEGRATION_POS_ASSET_BASE_URL` ระบบจะแปลงเป็น URL เต็มตอนบันทึก

ไม่รับ: `data:image/...;base64`, `javascript:`, `//host/...`, path ที่มี `..` หรือ `\`, URL ที่มี username/password

**งานของร้าน (`ownerType=store`)** สร้างได้โดยไม่ต้องมีลูกค้า และระบบจะไม่สร้างลูกค้าปลอมแทน หน้าแอดมินแสดงป้าย "เครื่องของร้าน / ส่งจาก POS" พร้อม External Reference, Product Code และสาขาต้นทาง

Response `201 Created` (สร้างใหม่) หรือ `200 OK` (คืนงานเดิม) — body คือ [Repair Job DTO](#8-repair-job-dto)
POS ปัจจุบันอ่าน `body.id ?? body.reference` ดังนั้นจะได้ `id` ไปเก็บเป็น `externalReference` ฝั่ง POS และใช้ `id` นี้ polling ต่อ

```bash
curl -sS -X POST "https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs" \
  -H "Authorization: Bearer $REPAIR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: rep-20261024-0001-try1" \
  -d '{"reference":"REP-20261024-0001","productCode":"NV-00001","imei":"356938035643809","model":"Apple iPhone 13 128GB","branchId":"<POS_BRANCH_UUID>","symptom":"หน้าจอมีปัญหา","imageUrls":[]}'
```

### 7.2 `GET /repair-jobs/{id}` — อ่านงาน (scope `repair:read`)

```bash
curl -sS "https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs/<ID>" \
  -H "Authorization: Bearer $REPAIR_API_KEY"
```

`200` → Repair Job DTO, `404 NOT_FOUND` ถ้าไม่มีหรือไม่ใช่งานจาก POS

### 7.3 `GET /repair-jobs?externalRef=&imei=&page=&limit=` — ค้นหา (scope `repair:read`)

- `externalRef`, `imei` — **exact match** เท่านั้น (ไม่ใช้ regex) ส่งคู่กันได้ (AND) หรือไม่ส่งเลยเพื่อดูทั้งหมด
- `page` ≥ 1 (ค่าเริ่มต้น 1), `limit` 1–100 (ค่าเริ่มต้น 20) — เกิน 100 ได้ `400`
- query parameter อื่น หรือส่งซ้ำ → `400 VALIDATION_ERROR`
- เรียงจากงานใหม่ไปเก่า

```bash
curl -sS "https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs?externalRef=REP-20261024-0001" \
  -H "Authorization: Bearer $REPAIR_API_KEY"
```

```json
{
  "data": [ { "id": "6718f0c2a1b2c3d4e5f60718", "reference": "JOB2610-0001", "...": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### 7.4 `POST /repair-jobs/{id}/cancel` — ยกเลิก (scope `repair:cancel`)

```json
{ "reason": "ยกเลิกจาก Web POS" }
```

- `reason` จำเป็น ≤ 500 ตัวอักษร, field อื่นถูกปฏิเสธ
- ยกเลิกได้เมื่อยังซ่อมไม่เสร็จ (`pending` … `testing`)
- `ready_pickup` หรือ `completed` → `409 REPAIR_CLOSED`
- ยกเลิกซ้ำ → `200` คืนสถานะเดิม (ไม่เพิ่ม history ซ้ำ)
- บันทึก Status History (ผู้ทำ = `integration:<ชื่อ Key>`) และ AdminLog `repair_integration.cancelled`

```bash
curl -sS -X POST "https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs/<ID>/cancel" \
  -H "Authorization: Bearer $REPAIR_API_KEY" -H "Content-Type: application/json" \
  -d '{"reason":"ยกเลิกจาก Web POS"}'
```

### 7.5 `POST /repair-jobs/{id}/handover` — POS รับเครื่องคืนแล้ว (scope `repair:handover`)

Body ไม่บังคับ: `{ "note": "รับคืนที่สาขา BKK01" }` (≤ 500)

- ทำได้เมื่อสถานะ `ready_pickup` เท่านั้น → เปลี่ยนเป็น `completed`, ตั้ง `handedOverAt`
- ยังไม่พร้อม (`pending` … `testing`) → `409 INVALID_STATUS_TRANSITION`
- ถูกยกเลิกแล้ว → `409 REPAIR_CLOSED`
- เรียกซ้ำหลัง `completed` → `200` ไม่เพิ่ม history ซ้ำ
- บันทึก AdminLog `repair_integration.handed_over`

```bash
curl -sS -X POST "https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs/<ID>/handover" \
  -H "Authorization: Bearer $REPAIR_API_KEY"
```

### 7.6 `GET /repair-jobs/{id}/costs` — ค่าใช้จ่าย (scope `repair:read`)

```json
{
  "id": "6718f0c2a1b2c3d4e5f60718",
  "reference": "JOB2610-0001",
  "externalRef": "REP-20261024-0001",
  "partsPurchaseCost": 900,
  "partsSellingPrice": 1500,
  "laborCost": 500,
  "inventoryCostTotal": 1400,
  "customerChargeTotal": 2000,
  "currency": "THB",
  "version": 2,
  "updatedAt": "2026-10-24T05:10:00.000Z"
}
```

## 8. Repair Job DTO

Response ทุกตัวที่เป็นงานซ่อมใช้โครงสร้างนี้เท่านั้น (สร้างทีละ field — ไม่ส่ง Mongoose document)

```json
{
  "id": "6718f0c2a1b2c3d4e5f60718",
  "reference": "JOB2610-0001",
  "externalRef": "REP-20261024-0001",
  "source": "pos",
  "ownerType": "store",
  "status": "in_progress",
  "posStatus": "repairing",
  "device": {
    "inventoryItemId": "1b8c6d2e-0f7a-4c1e-9a55-2b8f3c0d9e11",
    "productCode": "NV-00001",
    "imei": "356938035643809",
    "serialNumber": null,
    "model": "Apple iPhone 13 128GB",
    "branchId": "6f1c2a52-6a1e-4bd4-9c39-1f0f6f0b9a11",
    "branchCode": "BKK01"
  },
  "symptom": "หน้าจอมีปัญหา",
  "imageUrls": [],
  "repairItems": [],
  "costs": {
    "partsPurchaseCost": 900,
    "partsSellingPrice": 1500,
    "laborCost": 500,
    "inventoryCostTotal": 1400,
    "customerChargeTotal": 2000,
    "currency": "THB",
    "version": 2,
    "updatedAt": "2026-10-24T05:10:00.000Z"
  },
  "cancelReason": null,
  "timestamps": {
    "receivedAt": "2026-10-24T03:15:00.000Z",
    "repairCompletedAt": null,
    "handedOverAt": null,
    "cancelledAt": null,
    "createdAt": "2026-10-24T03:15:00.000Z",
    "updatedAt": "2026-10-24T05:10:00.000Z"
  }
}
```

- `reference` = เลขงานของ NavarichCare (`JOBYYMM-NNNN`, ออกเลขด้วย atomic counter), `externalRef` = `reference` ที่ POS ส่งมา
- `repairItems` สงวนไว้ใน v1 (คืน `[]` เสมอ เพราะระบบซ่อมยังไม่แยกรายการอะไหล่)
- `cancelReason` มีค่าเฉพาะเมื่อ `status = cancelled`
- **ไม่ส่ง** `internalNotes`, `statusHistory`, ข้อมูลลูกค้า, รูป base64, field ภายในของ Mongoose (`_id`, `__v`), ข้อมูล idempotency, API Key/hash ใด ๆ

## 9. Status Mapping และ State Machine

| สถานะระบบซ่อม (`status`) | ความหมาย | `posStatus` |
|---|---|---|
| `pending` | รอตรวจเช็ก | `sent` |
| `checking` | กำลังเช็กอาการ | `repairing` |
| `quoted` | เสนอราคาแล้ว | `repairing` |
| `waiting_approval` | รออนุมัติ | `repairing` |
| `in_progress` | กำลังซ่อม | `repairing` |
| `waiting_parts` | รออะไหล่ | `repairing` |
| `testing` | ตรวจสอบงานซ่อม | `repairing` |
| `ready_pickup` | ซ่อมเสร็จ/รอรับคืน | `completed` |
| `completed` | รับเครื่องคืนแล้ว | `completed` |
| `cancelled` | ยกเลิก | `cancelled` |

ค่า `posStatus` ตรงกับ enum `RepairStatus` ของ NaravichPOS

การเปลี่ยนสถานะที่อนุญาต (ใช้ทั้ง Admin API และ Integration API):

| จาก | ไปได้ |
|---|---|
| `pending` | `checking`, `quoted`, `in_progress`, `cancelled` |
| `checking` | `quoted`, `waiting_approval`, `in_progress`, `waiting_parts`, `cancelled` |
| `quoted` | `checking`, `waiting_approval`, `in_progress`, `waiting_parts`, `cancelled` |
| `waiting_approval` | `quoted`, `in_progress`, `waiting_parts`, `cancelled` |
| `in_progress` | `waiting_parts`, `testing`, `ready_pickup`, `cancelled` |
| `waiting_parts` | `in_progress`, `cancelled` |
| `testing` | `in_progress`, `ready_pickup`, `cancelled` |
| `ready_pickup` | `completed`, `in_progress` (ส่งกลับไปแก้) |
| `completed` | – (ปิดงาน) |
| `cancelled` | – (ปิดงาน) |

เวลา:
- `repairCompletedAt` — ตั้งเมื่อเข้า `ready_pickup` (ล้างค่าถ้าถูกส่งกลับ `in_progress`)
- `handedOverAt` — ตั้งเมื่อเข้า `completed` และตั้ง `completedAt` เดิมพร้อมกันเพื่อ backward-compatibility (งานเก่าที่มีแค่ `completedAt` จะใช้ค่านั้นเป็น `handedOverAt`)
- `cancelledAt` — ตั้งเมื่อเข้า `cancelled`

## 10. Costs semantics

| Field | ที่มา | ความหมาย |
|---|---|---|
| `partsPurchaseCost` | `RepairJob.partsPurchaseCost` | ต้นทุนอะไหล่จริงที่ร้านจ่าย |
| `partsSellingPrice` | `RepairJob.partsCost` | ราคาค่าอะไหล่ที่เรียกเก็บ |
| `laborCost` | `RepairJob.laborCost` | ค่าแรง |
| `inventoryCostTotal` | `partsPurchaseCost + laborCost` | ต้นทุนที่ควรบวกเข้าสินค้าคงคลัง (เครื่องของร้าน) |
| `customerChargeTotal` | `partsSellingPrice + laborCost` | ยอดเรียกเก็บลูกค้า (= `totalPrice`) |
| `version` | `RepairJob.costsVersion` | เริ่มที่ 1 และเพิ่มขึ้นทุกครั้งที่ตัวเลขค่าใช้จ่ายเปลี่ยน |
| `updatedAt` | `costsUpdatedAt` (หรือ `updatedAt` ของงานเก่า) | เวลาแก้ค่าใช้จ่ายล่าสุด |

ทุกยอดรวมคำนวณฝั่ง server (หน่วยสตางค์ ไม่มี floating error) ค่า `totalPrice` ที่ client ส่งมาจะถูกละทิ้ง
POS ควร **ไม่** ใช้ชื่อ `partsCost` อีก — ให้เลือก `partsPurchaseCost` หรือ `partsSellingPrice` ตามวัตถุประสงค์

## 11. Error Codes

รูปแบบเดียวกันทุก endpoint:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "requestId": "4b0b6a8e-5d3f-4b8b-9b8e-0c1d2e3f4a5b",
    "details": [ { "field": "imei", "message": "has an invalid format" } ]
  }
}
```

| HTTP | `code` | เมื่อไร |
|---|---|---|
| 400 | `VALIDATION_ERROR` | field ไม่ถูกต้อง/ไม่อนุญาต, JSON เสีย, query ไม่ถูกต้อง, Key ใน query string, `Idempotency-Key` ผิดรูปแบบ |
| 401 | `INVALID_API_KEY` | ไม่มี/ผิด/รูปแบบผิด/หมดอายุ/ถูก Revoke |
| 403 | `INSUFFICIENT_SCOPE` | Key ไม่มี scope ของ endpoint |
| 404 | `NOT_FOUND` | ไม่พบงาน หรือไม่ใช่งานจาก POS |
| 409 | `IDEMPOTENCY_CONFLICT` | `Idempotency-Key` เดิมแต่ payload ต่าง |
| 409 | `EXTERNAL_REFERENCE_CONFLICT` | `reference` เดิมแต่ข้อมูลต่าง |
| 409 | `INVALID_STATUS_TRANSITION` | เช่น handover ก่อนซ่อมเสร็จ |
| 409 | `REPAIR_CLOSED` | ยกเลิกงานที่ซ่อมเสร็จ/ส่งมอบแล้ว หรือ handover งานที่ยกเลิก |
| 409 | `CONFLICT` | งานถูกแก้ไขพร้อมกันพอดี — ให้อ่านใหม่แล้วลองอีกครั้ง |
| 413 | `PAYLOAD_TOO_LARGE` | body เกิน 64 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | มี body แต่ไม่ใช่ `application/json` |
| 429 | `RATE_LIMITED` | เกินโควตา ดู `Retry-After` |
| 500 | `INTERNAL_ERROR` | ข้อผิดพลาดภายใน (ไม่มี stack trace/query/path ใน response) ให้แจ้ง `requestId` |

## 12. Contract สำหรับ Web POS

POS ปัจจุบัน (`api/src/repairs/repairs.service.ts` → `sync()`) ใช้ได้โดย **ไม่ต้องแก้โค้ด** เพียงตั้งค่า:

```
REPAIR_API_URL=https://<NAVARICHCARE_HOST>/api/integration/v1/repair-jobs
REPAIR_API_KEY=<คัดลอกจากหน้า Integration API Keys>
```

- POS ส่ง payload เดิม + `Authorization: Bearer` อยู่แล้ว
- กด Sync ซ้ำหลังล้มเหลว (เช่น timeout) ปลอดภัย: ได้งานเดิมกลับมา (`200`)
- POS เก็บ `body.id` เป็น `externalReference` แล้วใช้ `GET /repair-jobs/{id}` polling
- สำหรับ polling ให้ map `posStatus` เป็น `RepairStatus` ของ POS ได้ตรง ๆ และอ่านค่าใช้จ่ายจาก `costs` (`inventoryCostTotal` สำหรับต้นทุนเครื่องของร้าน)
- เมื่อรับเครื่องคืนจริงให้เรียก `POST /repair-jobs/{id}/handover`, เมื่อยกเลิกฝั่ง POS ให้เรียก `POST /repair-jobs/{id}/cancel`

> ฝั่ง POS ยังไม่มีตัว polling, การเรียก cancel/handover ไปที่ NavarichCare และการส่ง `Idempotency-Key` — การสร้างงานใช้ได้ทันที ส่วนที่เหลือต้องเพิ่มในโค้ด POS ภายหลัง (ดูหัวข้อ "สิ่งที่ยังไม่ทำ" ใน Runbook)
