import * as fs from "fs";
import * as path from "path";

async function runAdminParentsFiltersSuite() {
  console.log("=== STARTING ADMIN PARENTS FILTERS CLEANUP REGRESSION SUITE ===");

  const srcDir = path.resolve(process.cwd(), "frontend/src");

  // 1. Verify Admin Parents route code has no Channel filter logic
  console.log("\n[STEP 1] Verifying Admin Parents route has no Channel filter logic...");
  const adminParentsContent = fs.readFileSync(path.join(srcDir, "routes/admin.parents.tsx"), "utf-8");
  if (adminParentsContent.includes('filterValues["Channel"]') || adminParentsContent.includes("preferredChannel")) {
    throw new Error("FAIL: Admin Parents route still contains Channel filter logic.");
  }
  console.log("  [PASS] Admin Parents route is cleanly free of Channel filter logic.");

  // 2. Verify Principal Parents route code has no Channel filter logic
  console.log("\n[STEP 2] Verifying Principal Parents route has no Channel filter logic...");
  const principalParentsContent = fs.readFileSync(path.join(srcDir, "routes/principal.parents.tsx"), "utf-8");
  if (principalParentsContent.includes('filterValues["Channel"]') || principalParentsContent.includes("preferredChannel")) {
    throw new Error("FAIL: Principal Parents route still contains Channel filter logic.");
  }
  console.log("  [PASS] Principal Parents route is cleanly free of Channel filter logic.");

  // 3. Verify FilterBar filters configuration in both pages
  console.log("\n[STEP 3] Verifying FilterBar filters parameter in Admin & Principal Parents pages...");
  if (!adminParentsContent.includes("filters={[]}") || !principalParentsContent.includes("filters={[]}")) {
    throw new Error("FAIL: FilterBar filters prop should be empty array in Parents pages.");
  }
  console.log("  [PASS] Both Admin & Principal Parents pages use clean empty filters array.");

  console.log("\n=== ALL ADMIN PARENTS FILTERS TESTS PASSED ===");
}

runAdminParentsFiltersSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
