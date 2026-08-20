import * as fs from "fs";
import * as path from "path";

async function runOfficePageScrollingAndLayoutRegressionSuite() {
  console.log("=== STARTING OFFICE GLOBAL PAGE SCROLLING & LAYOUT REGRESSION SUITE ===");

  const routesDir = path.resolve(process.cwd(), "frontend/src/routes");

  // Test 1: Verify office.tsx root layout main container
  const officeLayoutPath = path.join(routesDir, "office.tsx");
  const officeLayoutContent = fs.readFileSync(officeLayoutPath, "utf-8");

  if (!officeLayoutContent.includes('main className="flex-1 min-w-0 overflow-y-auto')) {
    throw new Error("FAIL: office.tsx is missing 'flex-1 min-w-0 overflow-y-auto' on <main>");
  }
  if (officeLayoutContent.includes('main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 w-full max-w-none flex flex-col"')) {
    throw new Error("FAIL: office.tsx <main> still has 'flex flex-col' which traps child element heights");
  }
  console.log("[PASS] Requirement 1: office.tsx layout provides a clean single authoritative scroll container.");

  // Test 2: Verify Office routes do not trap height or prevent outer page scrolling
  const officeRoutes = [
    "office.students.tsx",
    "office.classes.tsx",
    "office.admissions.tsx",
    "office.fees.tsx",
    "office.inventory.tsx",
    "office.expenses.tsx",
    "office.receipts.tsx",
    "office.staff-attendance.tsx",
    "office.parent-credentials.tsx",
    "office.teacher-credentials.tsx",
    "office.visits.tsx",
    "office.enquiries.tsx",
  ];

  for (const routeFile of officeRoutes) {
    const filePath = path.join(routesDir, routeFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`FAIL: Office route file not found: ${routeFile}`);
    }
    const content = fs.readFileSync(filePath, "utf-8");

    // Check for root height traps
    if (content.includes('className="flex flex-col h-full min-h-0')) {
      throw new Error(`FAIL: ${routeFile} has height-trapping class 'flex flex-col h-full min-h-0' on root div`);
    }
    if (content.includes('className="flex flex-1 h-full min-h-0 flex-col overflow-hidden')) {
      throw new Error(`FAIL: ${routeFile} has height-trapping class 'flex flex-1 h-full min-h-0 flex-col overflow-hidden' on root div`);
    }

    console.log(`[PASS] ${routeFile}: Verified clean vertical page flow without height trapping.`);
  }

  console.log("\n=== ALL OFFICE GLOBAL PAGE SCROLLING TESTS PASSED SUCCESSFULLY ===");
}

runOfficePageScrollingAndLayoutRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
