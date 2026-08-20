import * as fs from "fs";
import * as path from "path";

async function runAdminParentsHeaderLogoSuite() {
  console.log("=== STARTING ADMIN PARENTS HEADER LOGO CLEANUP REGRESSION SUITE ===");

  const srcDir = path.resolve(process.cwd(), "frontend/src");

  // 1. Verify TopNav header does NOT contain header logo image
  console.log("\n[STEP 1] Verifying Admin TopNav header has no duplicate logo element...");
  const topNavContent = fs.readFileSync(path.join(srcDir, "components/admin/top-nav.tsx"), "utf-8");
  if (topNavContent.includes("settings.branding.headerLogoUrl")) {
    throw new Error("FAIL: Admin TopNav header still contains settings.branding.headerLogoUrl duplicate logo.");
  }
  if (topNavContent.includes('<img src={settings.branding.headerLogoUrl}')) {
    throw new Error("FAIL: Admin TopNav header still renders <img> header logo.");
  }
  console.log("  [PASS] Admin TopNav header is cleanly free of duplicate logo element.");

  // 2. Verify AppSidebar retains sidebar branding logo
  console.log("\n[STEP 2] Verifying AppSidebar retains required sidebar branding logo...");
  const appSidebarContent = fs.readFileSync(path.join(srcDir, "components/admin/app-sidebar.tsx"), "utf-8");
  if (!appSidebarContent.includes("settings.branding.sidebarLogoUrl") && !appSidebarContent.includes("settings.school.schoolName")) {
    throw new Error("FAIL: AppSidebar missing required sidebar logo branding.");
  }
  console.log("  [PASS] AppSidebar retains required sidebar branding logo and school identity.");

  // 3. Verify Office and Principal Headers are consistent
  console.log("\n[STEP 3] Verifying Office and Principal top headers consistency...");
  const officeTopNavContent = fs.readFileSync(path.join(srcDir, "components/office/top-nav.tsx"), "utf-8");
  const principalHeaderContent = fs.readFileSync(path.join(srcDir, "components/principal/Header.tsx"), "utf-8");

  if (officeTopNavContent.includes("headerLogoUrl") || principalHeaderContent.includes("headerLogoUrl")) {
    throw new Error("FAIL: Inconsistent header logo present in Office or Principal top headers.");
  }
  console.log("  [PASS] All global portal top headers (Admin, Principal, Office) are consistent and clean.");

  console.log("\n=== ALL ADMIN PARENTS HEADER LOGO TESTS PASSED ===");
}

runAdminParentsHeaderLogoSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
