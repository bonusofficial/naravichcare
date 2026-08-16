# ✅ อัปเดต: ปรับสิทธิ์แอดมินให้เห็นเมนูทั้งหมด

## 🔄 การเปลี่ยนแปลง

### ก่อนหน้า:
- เมนูถูกซ่อน/แสดงตาม role
- `super_admin` เห็นทุกอย่าง
- `admin` ไม่เห็น "จัดการแอดมิน"
- `viewer` เห็นแค่บางเมนู

### ตอนนี้:
- ✅ **ทุก role เห็นเมนูทั้งหมด** (เหมือนเว็บขายหนี้)
- ไม่มีการซ่อนเมนูตาม permission แล้ว
- แสดงเมนูเต็มให้ทุกคน

---

## 📝 ไฟล์ที่แก้ไข

**[src/components/admin/AdminSidebar.tsx](src/components/admin/AdminSidebar.tsx)**

เปลี่ยนจาก:
```typescript
// Filter nav items based on user permissions
const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
        if (!item.permission) return true;
        if (!user) return false;
        return hasPermission(user, item.permission as any);
    })
})).filter(group => group.items.length > 0);
```

เป็น:
```typescript
// Show all nav items to all users (no permission filtering)
const filteredNavGroups = navGroups;
```

---

## ✅ ผลลัพธ์

ตอนนี้ **ทุก role** (super_admin, admin, viewer, technician, staff) จะเห็น:

### 📋 ภาพรวม
- Dashboard

### 🔧 การดำเนินงาน
- รายการลงทะเบียน
- จัดการแพ็กเกจ
- จัดการแผน (Step 3)
- งานเคลม
- ประวัติการเคลม

### 🛠️ ระบบงานซ่อม & เคลม
- แดชบอร์ดซ่อม
- รับเครื่องซ่อม/เคลม
- รายการงานซ่อม
- จัดการพนักงานซ่อม

### 👥 บุคลากร
- **จัดการแอดมิน** ← ตอนนี้ทุกคนเห็น
- ตัวแทน (Agents)

### 💰 รายงาน & บัญชี
- **กำไรสุทธิ** ← ตอนนี้ทุกคนเห็น
- กำไรจริง (Amortization)
- บันทึกการใช้งาน (Logs)

### 🌐 เนื้อหาเว็บไซต์
- Hero Banner
- Footer
- Floating Chat
- นโยบาย & เงื่อนไข
- เงื่อนไข & ข้อตกลง
- ตารางคำขอรับบริการ

---

## 🎯 หมายเหตุ

### Permission ยังทำงานอยู่ที่ API Level:
แม้เมนูจะแสดงให้ทุกคนเห็น แต่ **API ยังมีการตรวจสอบ permission อยู่**

ตัวอย่าง:
- `viewer` เห็นเมนู "กำไรสุทธิ" 
- แต่ถ้ากดเข้าไป API จะตรวจสอบว่ามี `view_profit_report` หรือไม่
- ถ้าไม่มี → 403 Forbidden

### ถ้าต้องการปิด Permission ที่ API ด้วย:
ต้องแก้ไขทุก API route ลบการเช็ค permission ออก

---

## 🚀 ทดสอบ

```bash
# รีสตาร์ท dev server
npm run dev
```

1. Login ด้วย role ใดก็ได้
2. ตรวจสอบ Sidebar → **เห็นเมนูทั้งหมดแล้ว!**

---

**สถานะ:** ✅ เสร็จสมบูรณ์  
**วันที่:** 2026-08-16  
**Build:** ✅ สำเร็จ
