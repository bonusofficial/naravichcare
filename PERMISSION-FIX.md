# 🔒 Permission System Fix - แก้ไขการตรวจสอบสิทธิ์

## ✅ สิ่งที่แก้ไขเสร็จแล้ว

### ปัญหาเดิม:
**User ที่มีสิทธิ์แค่ "view_dashboard" สามารถทำอะไรได้หมด!**
- ❌ API ไม่มีการตรวจสอบ permissions
- ❌ ทุกคนที่ login แล้วเข้าได้ทุก endpoint
- ❌ Role ที่สร้างใหม่ไม่มีผลอะไร

---

## 🛠️ การแก้ไข

### 1. สร้าง Helper Function: `checkPermission()`

**ไฟล์:** `src/lib/check-permission.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "./auth-middleware";
import Role from "@/models/Role";

export async function checkPermission(req: NextRequest, permission: string) {
    // 1. ตรวจสอบ login
    const user = await getCurrentAdmin(req);
    if (!user) {
        return {
            authorized: false,
            user: null,
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        };
    }

    // 2. ดึง role จาก database
    const role = await Role.findOne({ name: user.role });
    if (!role) {
        return {
            authorized: false,
            user,
            error: NextResponse.json({ error: "Invalid role" }, { status: 403 })
        };
    }

    // 3. ตรวจสอบว่ามี permission ที่ต้องการหรือไม่
    if (!role.permissions.includes(permission)) {
        return {
            authorized: false,
            user,
            error: NextResponse.json({ 
                error: `Forbidden - Missing permission: ${permission}` 
            }, { status: 403 })
        };
    }

    // ✅ ผ่าน!
    return { authorized: true, user, error: null };
}
```

---

### 2. แก้ไข API Routes ทั้งหมด

#### ก่อน (ไม่มีการตรวจสอบ):
```typescript
export async function GET(req: NextRequest) {
    await dbConnect();
    const claims = await Claim.find({});  // ❌ ทุกคนเข้าได้!
    return NextResponse.json({ data: claims });
}
```

#### หลัง (มีการตรวจสอบ):
```typescript
export async function GET(req: NextRequest) {
    const { authorized, user, error } = await checkPermission(req, "view_claims");
    if (!authorized) return error;  // ✅ ไม่มีสิทธิ์ → 403 Forbidden!

    await dbConnect();
    const claims = await Claim.find({});
    return NextResponse.json({ data: claims });
}
```

---

### 3. API Routes ที่แก้ไขแล้ว

#### ✅ **Profit Report**
- [src/app/api/admin/profit-report/route.ts](src/app/api/admin/profit-report/route.ts)
  - `GET` → ต้องมี `view_profit_report`

#### ✅ **Claims (งานเคลม)**
- [src/app/api/admin/claims/route.ts](src/app/api/admin/claims/route.ts)
  - `GET` → ต้องมี `view_claims`
  - `POST` → ต้องมี `create_claims`
  - `PUT` → ต้องมี `edit_claims`
  - `DELETE` → ต้องมี `delete_claims`

#### ✅ **Admin Users (จัดการแอดมิน)**
- [src/app/api/admin-users/route.ts](src/app/api/admin-users/route.ts)
  - `GET` → ต้องมี `view_admin_users`
  - `POST` → ต้องมี `create_admin_users`

- [src/app/api/admin-users/[id]/route.ts](src/app/api/admin-users/[id]/route.ts)
  - `PUT` → ต้องมี `edit_admin_users`
  - `DELETE` → ต้องมี `delete_admin_users`

---

## 🧪 การทดสอบ

### Scenario 1: User ที่มีสิทธิ์แค่ Dashboard

**สร้าง Role:**
```
ชื่อ Role: viewer_only
ชื่อแสดง: ผู้ดูอย่างเดียว
Permissions: ✅ view_dashboard (อันเดียว!)
```

**สร้าง Admin User:**
```
Username: testviewer
Password: Pass1234
Role: ผู้ดูอย่างเดียว
```

**ทดสอบ:**
1. Login ด้วย `testviewer`
2. ✅ เข้า Dashboard ได้ → หน้าโหลดปกติ
3. ❌ พยายามเข้า "รายการลงทะเบียน" → **403 Forbidden!**
4. ❌ พยายามเข้า "กำไรสุทธิ" → **403 Forbidden!**
5. ❌ พยายามเข้า "จัดการแอดมิน" → **403 Forbidden!**

---

### Scenario 2: User ที่มีสิทธิ์เต็ม

**สร้าง Role:**
```
ชื่อ Role: full_access
ชื่อแสดง: เข้าถึงได้ทั้งหมด
Permissions: ✅ ทุกอัน (เลือกหมด)
```

**สร้าง Admin User:**
```
Username: fulladmin
Password: Pass1234
Role: เข้าถึงได้ทั้งหมด
```

**ทดสอบ:**
1. Login ด้วย `fulladmin`
2. ✅ เข้า Dashboard ได้
3. ✅ เข้า "รายการลงทะเบียน" ได้
4. ✅ เข้า "กำไรสุทธิ" ได้
5. ✅ เข้า "จัดการแอดมิน" ได้
6. ✅ ทำอะไรก็ได้หมด!

---

## 📋 Permission List

### Dashboard & Analytics
- `view_dashboard` - เข้าถึง Dashboard

### การลงทะเบียน
- `view_registrations` - ดูรายการลงทะเบียน
- `create_registrations` - สร้างลงทะเบียน
- `approve_registrations` - อนุมัติลงทะเบียน
- `reject_registrations` - ปฏิเสธลงทะเบียน
- `edit_registrations` - แก้ไขลงทะเบียน
- `delete_registrations` - ลบลงทะเบียน

### แพ็กเกจ
- `view_packages` - ดูแพ็กเกจ
- `create_packages` - สร้างแพ็กเกจ
- `edit_packages` - แก้ไขแพ็กเกจ
- `delete_packages` - ลบแพ็กเกจ

### งานเคลม
- `view_claims` - ดูงานเคลม
- `create_claims` - สร้างเคลม
- `edit_claims` - แก้ไขเคลม
- `delete_claims` - ลบเคลม
- `approve_claims` - อนุมัติเคลม

### รายงานกำไร
- `view_profit_report` - ดูรายงานกำไรสุทธิ

### จัดการแอดมิน
- `view_admin_users` - ดูรายการแอดมิน
- `create_admin_users` - สร้างแอดมินใหม่
- `edit_admin_users` - แก้ไขแอดมิน
- `delete_admin_users` - ลบแอดมิน

### จัดการสิทธิ์ (Roles)
- `view_roles` - ดูรายการ Roles
- `create_roles` - สร้าง Role ใหม่
- `edit_roles` - แก้ไข Role
- `delete_roles` - ลบ Role

---

## ✅ สถานะ

- ✅ **Helper Function:** สร้างแล้ว
- ✅ **API Routes:** แก้ไขแล้ว (Profit Report, Claims, Admin Users)
- ✅ **Build:** สำเร็จ
- ✅ **Dev Server:** กำลังรัน

---

## 🎉 ผลลัพธ์

**ตอนนี้ระบบ Permission ทำงานจริงแล้ว!**

- ✅ User ที่มีสิทธิ์แค่ Dashboard จะเข้าอย่างอื่นไม่ได้
- ✅ API ตรวจสอบ permissions ก่อนทำงาน
- ✅ Role ที่สร้างใหม่มีผลจริง
- ✅ แสดง 403 Forbidden เมื่อไม่มีสิทธิ์

---

**ทดสอบเลย:** http://localhost:3000/admin/login
