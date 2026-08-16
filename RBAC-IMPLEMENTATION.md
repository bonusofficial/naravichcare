# 🎯 Role-Based Access Control (RBAC) - Dynamic Roles System

## ✅ สรุประบบที่สร้างเสร็จแล้ว

### 1. **Role Model** (Database Schema)
ไฟล์: [src/models/Role.ts](src/models/Role.ts)

```typescript
{
  name: "sales_staff",           // ชื่อ role (unique, ใช้ในระบบ)
  displayName: "พนักงานขาย",     // ชื่อแสดง (ภาษาไทย)
  description: "พนักงานขาย",     // คำอธิบาย
  permissions: [                 // Array ของ permissions
    "view_registrations",
    "create_registrations",
    "view_packages"
  ],
  color: "#3B82F6",             // สีแสดงใน UI (hex)
  isSystem: false                // true = role พื้นฐาน, false = สร้างเอง
}
```

### 2. **API Routes**

#### 📋 GET `/api/admin/roles`
ดึงรายการ roles ทั้งหมด
- Permission: `view_roles`
- Response: `{ roles: Role[] }`

#### ➕ POST `/api/admin/roles`
สร้าง role ใหม่
- Permission: `create_roles`
- Body: `{ name, displayName, description?, permissions, color? }`
- ❌ ห้ามสร้าง role ที่มี `name` ซ้ำ
- Response: `{ role: Role }`

#### 🔍 GET `/api/admin/roles/[id]`
ดึงข้อมูล role หนึ่งตัว
- Permission: `view_roles`
- Response: `{ role: Role }`

#### ✏️ PUT `/api/admin/roles/[id]`
แก้ไข role
- Permission: `edit_roles`
- Body: `{ displayName?, description?, permissions?, color? }`
- ❌ **ห้ามแก้ไข System Roles** (`isSystem: true`)
- Response: `{ role: Role }`

#### 🗑️ DELETE `/api/admin/roles/[id]`
ลบ role
- Permission: `delete_roles`
- ❌ **ห้ามลบ System Roles** (`isSystem: true`)
- Response: `{ message: "Role deleted successfully" }`

---

### 3. **Frontend Page** - `/admin/roles`

ไฟล์: [src/app/admin/roles/page.tsx](src/app/admin/roles/page.tsx)

**Features:**
- ✅ แสดงตาราง roles ทั้งหมด
- ✅ แสดง badge สี + จำนวน permissions
- ✅ ปุ่ม "สร้าง Role ใหม่"
- ✅ ปุ่มแก้ไข/ลบ แต่ละ role
- ✅ System roles แสดง badge "ระบบพื้นฐาน" + ปิดปุ่มลบ
- ✅ Loading states
- ✅ Error handling

---

### 4. **Create/Edit Role Dialog**

ไฟล์: [src/components/admin/roles/RoleFormDialog.tsx](src/components/admin/roles/RoleFormDialog.tsx)

**Features:**
- ✅ Form สร้าง/แก้ไข role
- ✅ Input: ชื่อ role (name)
- ✅ Input: ชื่อแสดง (displayName)
- ✅ Input: คำอธิบาย (description)
- ✅ Color picker (เลือกสี)
- ✅ **Permissions Checklist** - แสดงทุก permission แบบ checkbox
  - จัดกลุ่มตามหมวดหมู่ (Dashboard, บุคลากร, รายงาน, ฯลฯ)
  - เลือกได้หลาย permission
- ✅ Validation
- ✅ Submit → API

---

### 5. **Permissions List**

ไฟล์: [src/lib/permissions.ts](src/lib/permissions.ts)

**Permissions ที่เพิ่มใหม่:**
```typescript
| "view_roles"      // ดู roles
| "create_roles"    // สร้าง role ใหม่
| "edit_roles"      // แก้ไข role
| "delete_roles"    // ลบ role
```

**System Roles Permissions:**
- `super_admin`: มีสิทธิ์ทั้งหมด (รวม `create_roles`, `edit_roles`, `delete_roles`)
- `admin`: มีสิทธิ์ `view_roles` อย่างเดียว
- `viewer`: มีสิทธิ์ `view_roles` อย่างเดียว

---

### 6. **Sidebar เมนูใหม่**

ไฟล์: [src/components/admin/AdminSidebar.tsx](src/components/admin/AdminSidebar.tsx:46)

```
บุคลากร
├── จัดการแอดมิน
├── จัดการสิทธิ์ (Roles) ← เพิ่มใหม่
└── ตัวแทน (Agents)
```

---

## 🎯 System Roles (Default)

ใช้คำสั่ง seed: `npm run seed-roles`

### Roles ที่สร้างอัตโนมัติ:

1. **Super Admin** (`super_admin`)
   - มีสิทธิ์ทั้งหมด 100%
   - สามารถจัดการ roles ได้ (สร้าง/แก้/ลบ)

2. **Admin** (`admin`)
   - มีสิทธิ์เกือบทั้งหมด
   - ดู roles ได้ แต่สร้าง/แก้/ลบ roles ไม่ได้

3. **Viewer** (`viewer`)
   - ดูข้อมูลอย่างเดียว
   - ดู roles ได้

4. **Technician** (`technician`)
   - ช่างเทคนิค
   - จัดการงาน Claims & Repairs

5. **Staff** (`staff`)
   - พนักงานทั่วไป
   - อนุมัติลงทะเบียน, ดูข้อมูล

---

## 🧪 วิธีทดสอบระบบ

### ขั้นตอนที่ 1: Seed System Roles
```bash
npm run seed-roles
```

### ขั้นตอนที่ 2: Start Dev Server
```bash
npm run dev
```

### ขั้นตอนที่ 3: Login เป็น Super Admin
```
URL: http://localhost:3000/admin/login
Username: (super_admin account)
Password: (รหัสผ่าน)
```

### ขั้นตอนที่ 4: เข้าหน้า "จัดการสิทธิ์"
```
Sidebar → บุคลากร → จัดการสิทธิ์ (Roles)
หรือ: http://localhost:3000/admin/roles
```

### ขั้นตอนที่ 5: สร้าง Role ใหม่
1. คลิก **"+ เพิ่มสิทธิ์ใหม่"**
2. กรอกข้อมูล:
   - **ชื่อ Role**: `sales_staff`
   - **ชื่อแสดง**: `พนักงานขาย`
   - **คำอธิบาย**: `พนักงานที่ทำหน้าที่ขาย`
   - **เลือกสี**: (เลือกสีที่ต้องการ)
3. **เลือก Permissions**:
   - ☑ ดูรายการลงทะเบียน
   - ☑ สร้างลงทะเบียน
   - ☑ ดูแพ็กเกจ
4. คลิก **"บันทึก"**

### ขั้นตอนที่ 6: แก้ไข Role
1. คลิกปุ่ม "แก้ไข" ที่ role ที่สร้าง
2. เปลี่ยนชื่อหรือ permissions
3. บันทึก

### ขั้นตอนที่ 7: ลบ Role
1. คลิกปุ่ม "ลบ" ที่ role ที่สร้าง (ไม่ใช่ System Role)
2. ยืนยัน

---

## 📁 ไฟล์ที่สร้าง/แก้ไข

### ✅ สร้างใหม่:
1. `src/models/Role.ts` - Role schema
2. `src/app/api/admin/roles/route.ts` - GET all, POST create
3. `src/app/api/admin/roles/[id]/route.ts` - GET one, PUT update, DELETE
4. `src/app/admin/roles/page.tsx` - หน้าจัดการ roles
5. `src/components/admin/roles/RoleFormDialog.tsx` - Form สร้าง/แก้ไข role
6. `seed-roles.ts` - Script seed system roles

### ✏️ แก้ไข:
1. `src/lib/permissions.ts` - เพิ่ม permissions: `view_roles`, `create_roles`, `edit_roles`, `delete_roles`
2. `src/lib/auth-middleware.ts` - ปรับ `getCurrentAdmin()` รองรับ optional `req`
3. `src/components/admin/AdminSidebar.tsx` - เพิ่มเมนู "จัดการสิทธิ์ (Roles)"
4. `package.json` - เพิ่ม script `"seed-roles": "tsx seed-roles.ts"`

---

## 🎨 UI/UX Features

### Permission Checklist
```
📊 Dashboard & Analytics
☑ เข้าถึง Dashboard

👥 บุคลากร
☑ ดูรายการแอดมิน
☐ สร้างแอดมิน
☐ แก้ไขแอดมิน
☐ ลบแอดมิน
☐ ดูสิทธิ์ (Roles)
☐ จัดการสิทธิ์

📋 การลงทะเบียน
☑ ดูรายการลงทะเบียน
☑ อนุมัติลงทะเบียน
☐ ปฏิเสธลงทะเบียน
☐ ลบลงทะเบียน
...
```

### Role Badge
```typescript
// แสดงสีตาม role
<Badge style={{ backgroundColor: role.color }}>
  {role.displayName}
</Badge>

// System role badge
{role.isSystem && (
  <Badge variant="outline">ระบบพื้นฐาน</Badge>
)}
```

---

## 🔐 Security Features

### 1. Permission Checks
- ทุก API route ตรวจสอบ permission ก่อนทำงาน
- ใช้ `hasPermission(user, "view_roles")`

### 2. System Role Protection
- **ห้ามแก้ไข** system roles (`isSystem: true`)
- **ห้ามลบ** system roles
- API จะ return error 400

### 3. Unique Role Names
- Role `name` ต้อง unique
- ถ้าซ้ำจะ return error 400

---

## 🚀 การใช้งานต่อ

### 1. ใช้ Dynamic Roles กับ Admin Users
แก้ไข `src/models/AdminUser.ts`:
```typescript
// เดิม
role: { type: String, enum: ['super_admin', 'admin', 'viewer', 'technician', 'staff'] }

// ใหม่
role: { type: String, required: true }  // ไม่ enum, ให้เป็น dynamic
roleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }  // reference ไปที่ Role
```

### 2. ดึง Permissions แบบ Dynamic
```typescript
// แทนที่จะใช้ ROLE_PERMISSIONS static
const user = await AdminUser.findById(id).populate('roleRef');
const permissions = user.roleRef?.permissions || [];
```

### 3. UI สร้าง Admin User
เปลี่ยน dropdown จาก:
```typescript
<option value="super_admin">Super Admin</option>
<option value="admin">Admin</option>
```

เป็น:
```typescript
{roles.map(role => (
  <option key={role._id} value={role.name}>
    {role.displayName}
  </option>
))}
```

---

## 📊 สถานะ

✅ **เสร็จสมบูรณ์:**
- ✅ Role Model + Database Schema
- ✅ API Routes (CRUD)
- ✅ Frontend UI (List, Create, Edit, Delete)
- ✅ Permissions System
- ✅ System Roles Seed
- ✅ Security & Validation
- ✅ Build สำเร็จ

🚧 **ยังไม่ได้ทำ (Future Enhancement):**
- Dynamic role assignment ใน AdminUser (ตอนนี้ยังใช้ enum)
- Audit logs สำหรับการเปลี่ยนแปลง roles
- Bulk operations (ลบหลาย roles พร้อมกัน)

---

## 🎉 สรุป

**ตอนนี้มีระบบ RBAC แบบ Dynamic แล้ว!**

Super Admin สามารถ:
- ✅ สร้าง role ใหม่ (เช่น "พนักงานขาย", "หัวหน้าฝ่าย")
- ✅ ตั้งชื่อ role เอง
- ✅ เลือก permissions แบบ checkbox
- ✅ แก้ไข/ลบ role ที่สร้างเอง
- ✅ ดู roles ทั้งหมด

**พร้อมใช้งาน:** http://localhost:3000/admin/roles 🚀
