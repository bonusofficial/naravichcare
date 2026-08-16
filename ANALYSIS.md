# การวิเคราะห์ระบบสำหรับงานเพิ่มเติม

## วันที่: 2026-08-16

---

## งานที่ 1: ปรับสิทธิ์แอดมินให้เหมือนเว็บขายหนี้ทั้งหมดการเข้าถึง

### สถานะปัจจุบัน:
✅ **มีอยู่แล้ว:**
- AdminUser model มี 5 roles: `super_admin`, `admin`, `viewer`, `technician`, `staff`
- Middleware JWT authentication ครอบคลุม `/admin/*` routes
- AdminLog system บันทึกการกระทำของแอดมิน

❌ **ยังไม่มี:**
- **ไม่มีการตรวจสอบ role-based permissions ในแต่ละหน้า**
- UI ไม่มีการซ่อน/แสดงเมนูตาม role
- API routes ไม่มีการตรวจสอบสิทธิ์ตาม role (ใครก็เข้าได้หมดถ้า login แล้ว)
- ไม่มีหน้า permission management

### สิ่งที่ต้องทำ:

1. **สร้าง Permission Helper/Middleware**
   - สร้าง `src/lib/permissions.ts` - กำหนดสิทธิ์แต่ละ role
   - สร้าง middleware สำหรับ API routes ตรวจสอบสิทธิ์

2. **ปรับ API Routes ทั้งหมด**
   - เพิ่มการตรวจสอบ role ใน API routes
   - ตัวอย่าง: `viewer` ดูอย่างเดียว, `staff` จัดการลูกค้า, `technician` จัดการซ่อม

3. **ปรับ Admin Layout**
   - แสดง/ซ่อนเมนูตาม role
   - เพิ่มตัวบ่งชี้ role ใน navbar

4. **เพิ่ม Permission Management Page** (optional)
   - หน้าจัดการสิทธิ์แต่ละ role (สำหรับ super_admin)

---

## งานที่ 2: ทำหน้าระบบกำไรสุทธิ

### สถานะปัจจุบัน:

✅ **มีอยู่แล้ว:**
- `Registration` model - มีข้อมูลการขายประกัน
  - วันที่: `createdAt`, `approvedAt`
  - ลูกค้า: `firstName`, `lastName`, `phone`, `idCard`
  - แพ็ก: `packageType` (เชื่อมกับ Package/CoveragePlan)
  - เอเจนต์: `agentCode` (เชื่อมกับ Agent)
  - สถานะ: `pending`, `paid`, `approved`, `rejected`
  
- `Package` model - แพ็กประกัน
  - ราคา: `monthlyPrice`, `yearlyPrice`
  
- `Agent` model - เอเจนต์
  - `commissionRate` - อัตราค่าคอมมิชชั่น (%)

- `Branch` model - สาขา

- `accounting` page มีอยู่แล้ว - แต่เน้น claims และ parts cost

❌ **ขาดข้อมูลสำคัญ:**

### **ขาดใน Registration model:**
1. ❌ **ราคาขายให้ลูกค้า** (ตอนนี้มีแค่ `devicePrice`)
2. ❌ **ต้นทุนของแพ็กประกัน** 
3. ❌ **ค่าคอมมิชชั่นเอเจนต์จริง** (มีแค่ rate ใน Agent model)
4. ❌ **ค่าใช้จ่ายอื่น**
5. ❌ **เลขที่รายการ/เลขกรมธรรม์** - มี `policyNumber` แล้ว ✅
6. ❌ **สาขาที่ขาย** (branchId)

### **ขาดใน Package model:**
1. ❌ **ต้นทุนของแพ็ก** (ตอนนี้มีแค่ราคาขาย)

### สิ่งที่ต้องทำ:

#### Phase 1: เพิ่ม/แก้ไข Models

**1. แก้ไข `Registration` model:**
```typescript
// เพิ่มฟิลด์:
salePrice: Number,           // ราคาขายจริงให้ลูกค้า
packageCost: Number,         // ต้นทุนแพ็ก (คัดลอกมาจาก Package)
agentCommission: Number,     // ค่าคอมเอเจนต์จริง (คำนวณจาก salePrice * rate)
otherExpenses: Number,       // ค่าใช้จ่ายอื่นๆ
branchId: ObjectId,          // สาขาที่ขาย
totalCost: Number,           // ต้นทุนรวม (auto calculate)
netProfit: Number,           // กำไรสุทธิ (auto calculate)
```

**2. แก้ไข `Package` model:**
```typescript
// เพิ่มฟิลด์:
costPrice: Number,           // ต้นทุนของแพ็กประกัน
```

**3. แก้ไข `Agent` model:**
```typescript
// มีอยู่แล้ว: commissionRate
// อาจเพิ่ม:
totalSales: Number,          // ยอดขายรวม (aggregate)
totalCommission: Number,     // ค่าคอมรวม (aggregate)
```

#### Phase 2: สร้าง Profit Report System

**1. สร้าง Model สำหรับ Aggregated Report (Optional - หรือคำนวณ real-time)**
```typescript
ProfitReport {
  period: { start: Date, end: Date },
  type: 'by_package' | 'by_agent' | 'by_package_agent',
  packageId: ObjectId,
  agentId: ObjectId,
  totalSales: Number,
  totalRevenue: Number,
  totalCost: Number,
  totalProfit: Number,
  salesCount: Number,
  avgProfitPerSale: Number,
}
```

**2. สร้าง API Endpoints:**
- `GET /api/admin/profit-report` - รายงานหลัก
  - Query params: `startDate`, `endDate`, `groupBy` (package|agent|both), `packageId`, `agentId`, `branchId`, `status`
  
- `GET /api/admin/profit-report/by-package` - แยกตามแพ็ก
- `GET /api/admin/profit-report/by-agent` - แยกตามเอเจนต์
- `GET /api/admin/profit-report/by-package-agent` - แยกทั้งสองแบบ
- `GET /api/admin/profit-report/details` - รายละเอียดแต่ละรายการ

**3. สร้าง Admin Page:**
- `/admin/profit-report` - หน้ารายงานกำไรสุทธิ
  - Filters: วันที่, แพ็ก, เอเจนต์, สาขา, สถานะ
  - 3 Tabs: ตามแพ็ก | ตามเอเจนต์ | แพ็ก + เอเจนต์
  - Summary cards: รายได้รวม, ต้นทุนรวม, กำไรสุทธิ
  - Drill-down: คลิกแพ็ก → ดูเอเจนต์, คลิกเอเจนต์ → ดูแพ็ก
  - Export to Excel/PDF

#### Phase 3: Migration Script

**สร้างสคริปต์อัปเดตข้อมูลเก่า:**
- อัปเดต Package เพิ่ม `costPrice`
- อัปเดต Registration เพิ่มฟิลด์ใหม่ทั้งหมด
- Backfill ข้อมูล `salePrice`, `packageCost`, `agentCommission` จากข้อมูลที่มี

---

## สรุปความพร้อมของระบบ:

### งานที่ 1: Role-Based Access Control
- **ความพร้อม:** 40%
- **ระยะเวลาประมาณ:** 2-3 วัน
- **ความซับซ้อน:** ปานกลาง

### งานที่ 2: Profit Report System
- **ความพร้อม:** 30%
- **ระยะเวลาประมาณ:** 4-5 วัน
- **ความซับซ้อน:** สูง (ต้องแก้ model + migration + UI ใหม่ทั้งหมด)

### ข้อมูลที่ยังขาดเรื่องกำไร:
1. ❌ ต้นทุนแพ็กประกัน (Package.costPrice)
2. ❌ ราคาขายจริง (Registration.salePrice)
3. ❌ ค่าคอมเอเจนต์จริง (Registration.agentCommission)
4. ❌ ค่าใช้จ่ายอื่น (Registration.otherExpenses)
5. ❌ สาขาในการขาย (Registration.branchId)
6. ⚠️  สถานะ "ยกเลิก/คืนเงิน" - ตอนนี้มี "rejected" แต่อาจต้องแยกเป็น "cancelled" และ "refunded"

---

## แนวทางดำเนินการที่แนะนำ:

### ขั้นตอนที่ 1: วางแผนข้อมูล
1. ตกลงกับ stakeholder ว่าต้นทุนและราคาเป็นเท่าไร
2. กำหนดสูตรคำนวณค่าคอมชัดเจน
3. กำหนด business rules สำหรับ cancelled/refunded

### ขั้นตอนที่ 2: Database Schema Update
1. เพิ่มฟิลด์ใน Package model
2. เพิ่มฟิลด์ใน Registration model
3. สร้าง migration script
4. รัน `npm run push-schema` หลังแก้ model

### ขั้นตอนที่ 3: Backend Development
1. สร้าง profit calculation utilities
2. สร้าง API endpoints สำหรับ reports
3. เพิ่ม aggregation queries (MongoDB aggregation pipeline)

### ขั้นตอนที่ 4: Frontend Development
1. สร้างหน้า `/admin/profit-report`
2. สร้าง filter components
3. สร้าง report tables และ charts
4. เพิ่ม drill-down navigation

### ขั้นตอนที่ 5: Testing
1. ทดสอบการคำนวณกำไรทุกกรณี
2. ทดสอบ filters และ date ranges
3. ทดสอบ drill-down navigation
4. ทดสอบ export functions

---

## ตัวอย่าง Schema ที่แนะนำ:

```typescript
// Package model (เพิ่ม)
{
  costPrice: { type: Number, required: true, default: 0 }, // ต้นทุน
  profitMargin: { type: Number, default: 0 }, // % กำไรต่อแพ็ก (calculated)
}

// Registration model (เพิ่ม)
{
  // ข้อมูลการขาย
  salePrice: { type: Number, required: true },
  packageCost: { type: Number, required: true },
  agentCommission: { type: Number, default: 0 },
  otherExpenses: { type: Number, default: 0 },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  
  // คำนวณอัตโนมัติ
  totalCost: { type: Number, default: 0 }, // = packageCost + agentCommission + otherExpenses
  netProfit: { type: Number, default: 0 }, // = salePrice - totalCost
  profitMargin: { type: Number, default: 0 }, // = (netProfit / salePrice) * 100
  
  // สถานะเพิ่มเติม
  isCancelled: { type: Boolean, default: false },
  isRefunded: { type: Boolean, default: false },
  refundedAt: { type: Date },
  cancellationReason: { type: String },
}
```

## สูตรคำนวณ:

```
รายได้ = salePrice

ต้นทุนรวม (totalCost) = packageCost + agentCommission + otherExpenses

กำไรสุทธิ (netProfit) = salePrice - totalCost

% กำไร (profitMargin) = (netProfit / salePrice) × 100

ค่าคอมเอเจนต์ (agentCommission) = salePrice × (agent.commissionRate / 100)
```

## Business Rules ที่ต้องกำหนด:

1. **Cancelled/Refunded:**
   - ถ้า cancelled → ไม่นับเป็นยอดขาย
   - ถ้า refunded → หักรายได้ + คืนค่าคอม (หรือไม่คืน?)
   
2. **Commission:**
   - คำนวณจาก salePrice หรือ netProfit?
   - ถ้า refund แล้วเอเจนต์ต้องคืนค่าคอมไหม?

3. **Package Cost:**
   - ต้นทุนคงที่ หรือขึ้นกับราคาขาย?
   - มี bulk discount ไหม?

---

**สรุป:** ระบบมีโครงสร้างพื้นฐานดีอยู่แล้ว แต่ขาดข้อมูลสำคัญสำหรับระบบกำไร ต้องเพิ่มฟิลด์ใน models และสร้าง UI ใหม่ทั้งหมด
