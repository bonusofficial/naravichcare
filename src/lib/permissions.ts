/**
 * Single source of truth for permissions.
 *
 * The catalog below drives everything: the `Permission` type, the role matrix,
 * the picker UI (/api/admin/roles/available-permissions) and the seed script
 * (seed-roles.ts). Add a permission here and nowhere else.
 *
 * Keep this file free of runtime imports from @/models so that seed-roles.ts,
 * which runs under tsx outside the Next bundler, can import it.
 */

export const PERMISSION_CATALOG = [
  {
    category: "ภาพรวม",
    items: [
      { value: "view_dashboard", label: "ดู Dashboard" },
    ],
  },
  {
    category: "การลงทะเบียน",
    items: [
      { value: "view_registrations", label: "ดูรายการลงทะเบียน" },
      { value: "create_registrations", label: "สร้างรายการลงทะเบียน" },
      { value: "edit_registrations", label: "แก้ไขรายการลงทะเบียน" },
      { value: "approve_registrations", label: "อนุมัติรายการลงทะเบียน" },
      { value: "reject_registrations", label: "ปฏิเสธรายการลงทะเบียน" },
      { value: "delete_registrations", label: "ลบรายการลงทะเบียน" },
    ],
  },
  {
    category: "แพ็กเกจ",
    items: [
      { value: "view_packages", label: "ดูแพ็กเกจ" },
      { value: "create_packages", label: "สร้างแพ็กเกจ" },
      { value: "edit_packages", label: "แก้ไขแพ็กเกจ" },
      { value: "delete_packages", label: "ลบแพ็กเกจ" },
    ],
  },
  {
    category: "แผนความคุ้มครอง",
    items: [
      { value: "view_coverage_plans", label: "ดูแผนความคุ้มครอง" },
      { value: "edit_coverage_plans", label: "แก้ไขแผนความคุ้มครอง" },
    ],
  },
  {
    category: "งานเคลม",
    items: [
      { value: "view_claims", label: "ดูงานเคลม" },
      { value: "create_claims", label: "สร้างงานเคลม" },
      { value: "edit_claims", label: "แก้ไขงานเคลม" },
      { value: "delete_claims", label: "ลบงานเคลม" },
    ],
  },
  {
    category: "งานซ่อม",
    items: [
      { value: "view_repair_jobs", label: "ดูงานซ่อม" },
      { value: "create_repair_jobs", label: "สร้างงานซ่อม" },
      { value: "edit_repair_jobs", label: "แก้ไขงานซ่อม" },
      { value: "delete_repair_jobs", label: "ลบงานซ่อม" },
    ],
  },
  {
    category: "ตัวแทน (Agents)",
    items: [
      { value: "view_agents", label: "ดูตัวแทน" },
      { value: "create_agents", label: "สร้างตัวแทน" },
      { value: "edit_agents", label: "แก้ไขตัวแทน" },
      { value: "delete_agents", label: "ลบตัวแทน" },
    ],
  },
  {
    category: "จัดการแอดมิน",
    items: [
      { value: "view_admin_users", label: "ดูรายชื่อแอดมิน" },
      { value: "create_admin_users", label: "สร้างแอดมิน" },
      { value: "edit_admin_users", label: "แก้ไขแอดมิน" },
      { value: "delete_admin_users", label: "ลบแอดมิน" },
    ],
  },
  {
    category: "จัดการสิทธิ์ (Roles)",
    items: [
      { value: "view_roles", label: "ดู Roles" },
      { value: "create_roles", label: "สร้าง Roles" },
      { value: "edit_roles", label: "แก้ไข Roles" },
      { value: "delete_roles", label: "ลบ Roles" },
    ],
  },
  {
    category: "สินเชื่อ & การชำระเงิน",
    items: [
      { value: "view_loans", label: "ดูสัญญาสินเชื่อ" },
      { value: "create_loans", label: "สร้างสัญญาสินเชื่อ" },
      { value: "edit_loans", label: "แก้ไขสัญญาสินเชื่อ" },
      { value: "view_payments", label: "ดูการชำระเงิน" },
      { value: "create_payments", label: "บันทึกการชำระเงิน" },
      { value: "view_insurance", label: "ดูกรมธรรม์" },
    ],
  },
  {
    category: "ซื้อคืนแพ็ก (Buyback)",
    items: [
      { value: "view_buybacks", label: "ดูรายการซื้อคืน" },
      { value: "create_buybacks", label: "เปิดรายการซื้อคืน" },
      { value: "approve_buybacks", label: "อนุมัติ/ปฏิเสธการซื้อคืน" },
      { value: "edit_coverage_data", label: "แก้ข้อมูลช่วงคุ้มครอง" },
    ],
  },
  {
    category: "จัดการสาขา",
    items: [
      { value: "view_branches", label: "ดูสาขา" },
      { value: "edit_branches", label: "เพิ่ม/แก้ไข/ลบสาขา" },
    ],
  },
  {
    category: "รายงาน & บัญชี",
    items: [
      { value: "view_profit_report", label: "ดูรายงานกำไรสุทธิ" },
      { value: "edit_profit_data", label: "แก้ไขตัวเลขต้นทุน/กำไร" },
      { value: "view_accounting", label: "ดูกำไรจริง (Amortization)" },
      { value: "export_financial_data", label: "ส่งออกข้อมูลการเงิน" },
      { value: "view_logs", label: "ดูบันทึกการใช้งาน (Logs)" },
    ],
  },
  {
    category: "เนื้อหาเว็บไซต์ (CMS)",
    items: [
      { value: "edit_hero_banner", label: "แก้ไข Hero Banner" },
      { value: "edit_footer", label: "แก้ไข Footer" },
      { value: "edit_terms", label: "แก้ไขเงื่อนไขการใช้งาน" },
      { value: "edit_legal_pages", label: "แก้ไขหน้ากฎหมาย" },
      { value: "edit_service_request", label: "แก้ไขหน้าแจ้งบริการ" },
      { value: "edit_floating_chat", label: "แก้ไข Floating Chat" },
    ],
  },
] as const;

export type Permission =
  (typeof PERMISSION_CATALOG)[number]["items"][number]["value"];

/** Every permission in the catalog, flattened. */
export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATALOG.flatMap(
  (group) => group.items.map((item) => item.value)
);

/** Thai label for a permission value, for UI and the role picker. */
export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_CATALOG.flatMap((group) =>
    group.items.map((item) => [item.value, item.label])
  )
);

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: ALL_PERMISSIONS,

  admin: [
    "view_dashboard",
    "view_registrations", "create_registrations", "edit_registrations",
    "approve_registrations", "reject_registrations", "delete_registrations",
    "view_packages", "create_packages", "edit_packages", "delete_packages",
    "view_coverage_plans", "edit_coverage_plans",
    "view_claims", "create_claims", "edit_claims", "delete_claims",
    "view_repair_jobs", "create_repair_jobs", "edit_repair_jobs", "delete_repair_jobs",
    "view_agents", "create_agents", "edit_agents", "delete_agents",
    "view_loans", "create_loans", "edit_loans",
    "view_payments", "create_payments", "view_insurance",
    "view_buybacks", "create_buybacks", "approve_buybacks", "edit_coverage_data",
    "view_branches",
    // read-only visibility of people management; no create/edit/delete
    "view_admin_users",
    "view_roles",
    "view_profit_report", "edit_profit_data", "view_accounting",
    "export_financial_data", "view_logs",
    "edit_hero_banner", "edit_footer", "edit_terms", "edit_legal_pages",
    "edit_service_request", "edit_floating_chat",
  ],

  viewer: [
    "view_dashboard",
    "view_registrations",
    "view_packages",
    "view_coverage_plans",
    "view_claims",
    "view_repair_jobs",
    "view_agents",
    "view_loans",
    "view_payments",
    "view_insurance",
    "view_buybacks",
    "view_logs",
  ],

  technician: [
    "view_dashboard",
    "view_registrations",
    "view_claims", "create_claims", "edit_claims",
    "view_repair_jobs", "create_repair_jobs", "edit_repair_jobs",
  ],

  staff: [
    "view_dashboard",
    "view_registrations", "create_registrations", "edit_registrations",
    "view_packages",
    "view_coverage_plans",
    "view_agents",
    "view_claims", "create_claims",
  ],
};

/**
 * Minimal shape needed to resolve permissions. Accepts an AdminUser document
 * or the plain object returned by /api/auth/me.
 */
type UserWithRole = { role: string } | null | undefined;

// Check if a user has a specific permission
export function hasPermission(user: UserWithRole, permission: Permission): boolean {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
}

// Check if a user has any of the specified permissions
export function hasAnyPermission(user: UserWithRole, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some(p => hasPermission(user, p));
}

// Check if a user has all of the specified permissions
export function hasAllPermissions(user: UserWithRole, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every(p => hasPermission(user, p));
}

// Get all permissions for a role
export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Role display names in Thai
export const ROLE_LABELS: Record<string, string> = {
  super_admin: "ผู้ดูแลระบบสูงสุด",
  admin: "ผู้ดูแลระบบ",
  viewer: "ผู้ดูข้อมูล",
  technician: "ช่างเทคนิค",
  staff: "พนักงาน",
};

// Role colors for UI
export const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  super_admin: { bg: "bg-purple-50", text: "text-purple-700", badge: "bg-purple-100 text-purple-700 ring-purple-200" },
  admin: { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700 ring-blue-200" },
  viewer: { bg: "bg-gray-50", text: "text-gray-700", badge: "bg-gray-100 text-gray-700 ring-gray-200" },
  technician: { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700 ring-orange-200" },
  staff: { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-700 ring-green-200" },
};
