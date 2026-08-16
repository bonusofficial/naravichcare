import mongoose from "mongoose";
import dotenv from "dotenv";
import Role from "./src/models/Role";
import { ROLE_PERMISSIONS } from "./src/lib/permissions";

dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Seed system roles with default permissions.
 *
 * Permissions come from ROLE_PERMISSIONS in src/lib/permissions.ts so the
 * seeded roles can never drift from the permissions the API guards check.
 * Only the presentation metadata lives here.
 */
const ROLE_META: Record<
  string,
  { displayName: string; description: string; color: string }
> = {
  super_admin: {
    displayName: "Super Admin",
    description: "เข้าถึงได้ทุกอย่าง รวมถึงการจัดการ Role และ Admin Users",
    color: "purple",
  },
  admin: {
    displayName: "Admin",
    description: "สิทธิ์ Admin ปกติ เข้าถึงได้เกือบทุกอย่าง ยกเว้นการจัดการ Admin Users และ Roles",
    color: "blue",
  },
  viewer: {
    displayName: "Viewer",
    description: "ดูข้อมูลอย่างเดียว ไม่สามารถแก้ไขหรือลบได้",
    color: "gray",
  },
  technician: {
    displayName: "Technician",
    description: "พนักงานซ่อม สามารถจัดการงานซ่อมและเคลมได้",
    color: "orange",
  },
  staff: {
    displayName: "Staff",
    description: "พนักงานทั่วไป จัดการลงทะเบียนและดูข้อมูลพื้นฐาน",
    color: "green",
  },
};

async function seedRoles() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(`Connected: ${mongoose.connection.name}\n`);

  const systemRoles = Object.entries(ROLE_META).map(([name, meta]) => ({
    name,
    displayName: meta.displayName,
    description: meta.description,
    color: meta.color,
    permissions: ROLE_PERMISSIONS[name],
    isSystem: true,
  }));

  for (const roleData of systemRoles) {
    const existing = await Role.findOne({ name: roleData.name });
    if (existing) {
      // Update permissions if role exists
      await Role.updateOne({ name: roleData.name }, { $set: roleData });
      console.log(
        `✅ Updated role: ${roleData.displayName} (${roleData.permissions.length} permissions)`
      );
    } else {
      // Create new role
      await Role.create(roleData);
      console.log(
        `✅ Created role: ${roleData.displayName} (${roleData.permissions.length} permissions)`
      );
    }
  }

  console.log(`\n🎉 System roles seeded successfully!`);
  console.log(`Total roles: ${await Role.countDocuments()}`);

  process.exit(0);
}

seedRoles().catch((err) => {
  console.error("❌ Error seeding roles:", err);
  process.exit(1);
});
