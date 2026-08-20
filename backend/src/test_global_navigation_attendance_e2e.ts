import * as fs from "fs";
import * as path from "path";

async function runGlobalNavigationAttendanceSuite() {
  console.log("=== STARTING GLOBAL NAVIGATION ATTENDANCE REGRESSION SUITE ===");

  const srcDir = path.resolve(process.cwd(), "frontend/src");

  // 1. Check Admin Sidebar configuration
  const adminSidebarPath = path.join(srcDir, "components/admin/app-sidebar.tsx");
  const adminSidebarContent = fs.readFileSync(adminSidebarPath, "utf-8");

  if (!adminSidebarContent.includes('title: "Attendance", icon: CalendarCheck')) {
    throw new Error("FAIL: Admin sidebar is missing dedicated 'Attendance' module group.");
  }
  if (!adminSidebarContent.includes('{ title: "Student Attendance", url: "/admin/attendance/students"')) {
    throw new Error("FAIL: Admin sidebar missing Student Attendance link.");
  }
  if (!adminSidebarContent.includes('{ title: "Staff Attendance", url: "/admin/attendance/staff"')) {
    throw new Error("FAIL: Admin sidebar missing Staff Attendance link.");
  }

  // Ensure operations in admin does not have Attendance
  const adminOpsMatch = adminSidebarContent.match(/const operations: OperationEntry\[\] = \[([\s\S]*?)\];/);
  if (adminOpsMatch && adminOpsMatch[1].includes("Attendance")) {
    throw new Error("FAIL: Admin operations array still contains Attendance entry.");
  }
  console.log("  [PASS] Admin sidebar: Attendance cleanly placed under Modules with Student & Staff Attendance.");

  // 2. Check Office Sidebar configuration
  const officeSidebarPath = path.join(srcDir, "components/office/app-sidebar.tsx");
  const officeSidebarContent = fs.readFileSync(officeSidebarPath, "utf-8");

  if (!officeSidebarContent.includes('const attendance: Group = {')) {
    throw new Error("FAIL: Office sidebar missing dedicated attendance Group.");
  }
  if (!officeSidebarContent.includes('<NavGroup group={attendance} pathname={pathname} />')) {
    throw new Error("FAIL: Office sidebar missing <NavGroup group={attendance} /> in Modules section.");
  }
  const officeOpsMatch = officeSidebarContent.match(/const operations: Item\[\] = \[([\s\S]*?)\];/);
  if (officeOpsMatch && officeOpsMatch[1].includes("Attendance")) {
    throw new Error("FAIL: Office operations array still contains Attendance entry.");
  }
  console.log("  [PASS] Office sidebar: Attendance cleanly placed under Modules.");

  // 3. Check Principal Sidebar configuration
  const principalSidebarPath = path.join(srcDir, "components/principal/Sidebar.tsx");
  const principalSidebarContent = fs.readFileSync(principalSidebarPath, "utf-8");

  if (!principalSidebarContent.includes('label: "Attendance"')) {
    throw new Error("FAIL: Principal sidebar missing Attendance navigation item.");
  }
  if (!principalSidebarContent.includes('{ label: "Student Attendance", to: "/principal/attendance/students" }')) {
    throw new Error("FAIL: Principal sidebar missing Student Attendance link.");
  }
  if (!principalSidebarContent.includes('{ label: "Staff Attendance", to: "/principal/attendance/staff" }')) {
    throw new Error("FAIL: Principal sidebar missing Staff Attendance link.");
  }
  console.log("  [PASS] Principal sidebar: Attendance cleanly configured with Student & Staff Attendance.");

  // 4. Verify route files exist
  const requiredRouteFiles = [
    "routes/admin.attendance.students.tsx",
    "routes/admin.attendance.staff.tsx",
    "routes/office.staff-attendance.tsx",
    "routes/principal.attendance.students.tsx",
    "routes/principal.attendance.staff.tsx",
  ];

  for (const routeFile of requiredRouteFiles) {
    const fullPath = path.join(srcDir, routeFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`FAIL: Required route file does not exist: ${routeFile}`);
    }
    console.log(`  [PASS] Route file confirmed: ${routeFile}`);
  }

  console.log("\n=== ALL GLOBAL NAVIGATION ATTENDANCE TESTS PASSED ===");
}

runGlobalNavigationAttendanceSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
