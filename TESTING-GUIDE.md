# 🧪 Testing Guide - Profit Report System

## Pre-requisites

1. ✅ MongoDB running: `docker compose ps`
2. ✅ Database schema synced: `npm run push-schema`
3. ✅ Data migrated: `npm run migrate-profit`
4. ✅ Admin user created: `npm run create-admin admin Pass1234`

---

## 🎯 Test Scenarios

### 1. **Role-Based Access Control (RBAC)**

#### Test 1.1: Login with different roles
```bash
# Create test users with different roles
npm run create-admin superadmin Pass1234 "Super Admin" super@test.com super_admin
npm run create-admin regularadmin Pass1234 "Regular Admin" admin@test.com admin
npm run create-admin viewonly Pass1234 "View Only" view@test.com viewer
npm run create-admin techuser Pass1234 "Technician" tech@test.com technician
```

**Expected Results:**
- ✅ `super_admin` - Sees ALL menu items including "กำไรสุทธิ", "ผู้ใช้งาน"
- ✅ `admin` - Sees "กำไรสุทธิ" but NOT "ผู้ใช้งาน"
- ✅ `viewer` - Does NOT see "กำไรสุทธิ" or "ผู้ใช้งาน"
- ✅ `technician` - Only sees repair-related menus

#### Test 1.2: Permission checking
1. Login as `viewer`
2. Try to access: `http://localhost:3000/admin/profit-report`
3. **Expected:** 403 Forbidden or redirect

#### Test 1.3: API permission
```bash
# Get token from browser cookies after login
curl -H "Cookie: admin_token=<token>" \
  http://localhost:3000/api/admin/profit-report?groupBy=package
```

**Expected:**
- ✅ `super_admin` / `admin` → 200 OK with data
- ✅ `viewer` / `technician` / `staff` → 403 Forbidden

---

### 2. **Profit Calculation**

#### Test 2.1: Create test data
```javascript
// Run in MongoDB shell or create via API
db.packages.insertOne({
    name: "แพ็กเกจ A",
    yearlyPrice: 10000,
    costPrice: 6000,  // 60% cost
    isActive: true
});

db.agents.insertOne({
    name: "Agent A",
    phone: "0812345678",
    email: "agentA@test.com"
});

db.registrations.insertOne({
    fullName: "ทดสอบ ระบบ",
    phone: "0899999999",
    packageId: ObjectId("<package-id>"),
    agentId: ObjectId("<agent-id>"),
    salePrice: 10000,      // ราคาขาย
    packageCost: 6000,     // ต้นทุนแพ็ก
    agentCommission: 1000, // คอมมิชชั่น 10%
    otherExpenses: 500,    // ค่าใช้จ่ายอื่น
    status: "completed",
    isCancelled: false,
    isRefunded: false
});
```

**Expected auto-calculated fields:**
```javascript
totalCost = 6000 + 1000 + 500 = 7500
netProfit = 10000 - 7500 = 2500
profitMargin = (2500 / 10000) × 100 = 25%
```

#### Test 2.2: Verify calculation
```bash
# Check in database
npm run list-admins  # Just to test connection
# Then query registrations to see calculated fields
```

---

### 3. **Profit Report - Group by Package**

#### Test 3.1: View report
1. Login as `admin` or `super_admin`
2. Go to: `/admin/profit-report`
3. Select: **"จัดกลุ่มตาม: แพ็กเกจ"**
4. Click: **"ค้นหา"**

**Expected Display:**
```
Summary Cards:
├─ ยอดขายทั้งหมด: 1 รายการ
├─ รายได้รวม: ฿10,000
├─ กำไรสุทธิ: ฿2,500 (25.0%)  ← Green badge
└─ ค่าคอมมิชชั่น: ฿1,000

Data Table:
┌────────────┬─────────┬──────────┬─────────┬────────────┬─────────┬──────────┐
│ แพ็กเกจ    │ ยอดขาย │ รายได้    │ ต้นทุน  │ คอมมิชชั่น │ กำไร    │ % Margin │
├────────────┼─────────┼──────────┼─────────┼────────────┼─────────┼──────────┤
│ แพ็กเกจ A  │ 1       │ ฿10,000  │ ฿7,500  │ ฿1,000     │ ฿2,500  │ 25.0%    │
└────────────┴─────────┴──────────┴─────────┴────────────┴─────────┴──────────┘
```

---

### 4. **Profit Report - Group by Agent**

#### Test 4.1: Create more test data
```javascript
// Add another registration for different agent
db.registrations.insertOne({
    fullName: "ลูกค้า 2",
    phone: "0888888888",
    packageId: ObjectId("<package-id>"),
    agentId: ObjectId("<agent-B-id>"),
    salePrice: 15000,
    packageCost: 9000,
    agentCommission: 1500,
    otherExpenses: 200,
    status: "completed"
});
```

#### Test 4.2: View report
1. Select: **"จัดกลุ่มตาม: เอเจนต์"**
2. Click: **"ค้นหา"**

**Expected:**
```
┌──────────┬─────────┬──────────┬─────────┬────────────┬─────────┬──────────┐
│ เอเจนต์  │ ยอดขาย │ รายได้    │ ต้นทุน  │ คอมมิชชั่น │ กำไร    │ % Margin │
├──────────┼─────────┼──────────┼─────────┼────────────┼─────────┼──────────┤
│ Agent A  │ 1       │ ฿10,000  │ ฿7,500  │ ฿1,000     │ ฿2,500  │ 25.0%    │
│ Agent B  │ 1       │ ฿15,000  │ ฿10,700 │ ฿1,500     │ ฿4,300  │ 28.7%    │
└──────────┴─────────┴──────────┴─────────┴────────────┴─────────┴──────────┘
```

---

### 5. **Profit Report - Group by Both (Package + Agent)**

#### Test 5.1: View combined report
1. Select: **"จัดกลุ่มตาม: แพ็กเกจ + เอเจนต์"**
2. Click: **"ค้นหา"**

**Expected:**
```
┌────────────┬──────────┬─────────┬──────────┬─────────┬────────────┬─────────┐
│ แพ็กเกจ    │ เอเจนต์  │ ยอดขาย │ รายได้    │ ต้นทุน  │ คอมมิชชั่น │ กำไร    │
├────────────┼──────────┼─────────┼──────────┼─────────┼────────────┼─────────┤
│ แพ็กเกจ A  │ Agent A  │ 1       │ ฿10,000  │ ฿7,500  │ ฿1,000     │ ฿2,500  │
│ แพ็กเกจ A  │ Agent B  │ 1       │ ฿15,000  │ ฿10,700 │ ฿1,500     │ ฿4,300  │
└────────────┴──────────┴─────────┴──────────┴─────────┴────────────┴─────────┘
```

---

### 6. **Date Range Filter**

#### Test 6.1: Filter by date
1. Set **"จากวันที่"**: `2026-01-01`
2. Set **"ถึงวันที่"**: `2026-12-31`
3. Click: **"ค้นหา"**

**Expected:**
- Only shows registrations within that date range
- Summary cards update accordingly

---

### 7. **Cancelled / Refunded Status**

#### Test 7.1: Create cancelled registration
```javascript
db.registrations.insertOne({
    fullName: "ลูกค้ายกเลิก",
    phone: "0877777777",
    packageId: ObjectId("<package-id>"),
    agentId: ObjectId("<agent-id>"),
    salePrice: 10000,
    packageCost: 6000,
    agentCommission: 1000,
    otherExpenses: 0,
    status: "cancelled",
    isCancelled: true,
    cancellationReason: "ลูกค้าขอยกเลิก"
});
```

#### Test 7.2: Verify exclusion
1. View profit report
2. **Expected:** Cancelled registration should NOT appear in:
   - Summary cards (total sales, revenue, profit)
   - Data table

---

### 8. **Negative Profit (Loss)**

#### Test 8.1: Create loss scenario
```javascript
db.registrations.insertOne({
    fullName: "ขายขาดทุน",
    phone: "0866666666",
    packageId: ObjectId("<package-id>"),
    agentId: ObjectId("<agent-id>"),
    salePrice: 8000,       // ขายถูก
    packageCost: 6000,
    agentCommission: 2500, // คอมมิชชั่นสูง
    otherExpenses: 500,
    status: "completed"
});
```

**Expected calculation:**
```javascript
totalCost = 6000 + 2500 + 500 = 9000
netProfit = 8000 - 9000 = -1000  ← Negative!
profitMargin = (-1000 / 8000) × 100 = -12.5%
```

#### Test 8.2: Verify display
**Expected:**
- Profit shows: `-฿1,000` in RED color
- Margin shows: `-12.5%` in RED color

---

## 🐛 Common Issues & Solutions

### Issue 1: "Authentication failed" when connecting to MongoDB
**Solution:**
```bash
docker compose down -v
docker compose up -d
npm run push-schema
npm run create-admin admin Pass1234
```

### Issue 2: Profit report shows empty data
**Check:**
1. Any registrations in database? `db.registrations.find()`
2. Registrations have `salePrice` and `packageCost`?
3. Status is not `cancelled` or `refunded`?
4. Run migration: `npm run migrate-profit`

### Issue 3: Permission denied (403) on profit report
**Check:**
1. Current user role: `GET /api/auth/me`
2. User has `view_profit_report` permission?
3. Only `super_admin` and `admin` can access

### Issue 4: Auto-calculation not working
**Check:**
1. Schema synced? `npm run push-schema`
2. Pre-save hook in `Registration.ts` exists?
3. Save registration again to trigger calculation

---

## ✅ Final Checklist

- [ ] MongoDB running and accessible
- [ ] Schema synced with new fields
- [ ] Migration completed
- [ ] Admin users created with different roles
- [ ] Test data created (packages, agents, registrations)
- [ ] RBAC tested (menu visibility, API access)
- [ ] Profit calculation verified (auto-calc fields)
- [ ] All 3 report modes tested (package, agent, both)
- [ ] Date range filter works
- [ ] Cancelled/refunded exclusion works
- [ ] Negative profit displays correctly
- [ ] Production build succeeds

---

## 📊 Performance Notes

- **Aggregation Pipeline**: Uses MongoDB aggregation for efficient grouping
- **Index Recommendations** (add if slow):
  ```javascript
  db.registrations.createIndex({ createdAt: 1 })
  db.registrations.createIndex({ packageId: 1 })
  db.registrations.createIndex({ agentId: 1 })
  db.registrations.createIndex({ status: 1 })
  db.registrations.createIndex({ isCancelled: 1, isRefunded: 1 })
  ```

- **Expected Response Time**:
  - < 100ms for < 1,000 registrations
  - < 500ms for < 10,000 registrations
  - > 1s for > 100,000 registrations (consider pagination)

---

## 🚀 Ready for Production

After all tests pass, the system is ready for production deployment!

**Final steps:**
1. Backup database: `docker exec navarichcare-mongo mongodump`
2. Set production env vars in `.env.local`
3. Build: `npm run build`
4. Deploy: Follow [SETUP-VPS.md](SETUP-VPS.md)
