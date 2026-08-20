import * as fs from "fs";
import * as path from "path";

async function runGlobalToastSingletonRegressionSuite() {
  console.log("=== STARTING GLOBAL TOAST SINGLETON REGRESSION SUITE ===");

  const srcDir = path.resolve(process.cwd(), "frontend/src");
  const routesDir = path.join(srcDir, "routes");

  // Test 1: Verify __root.tsx contains the single authoritative Toaster
  const rootPath = path.join(routesDir, "__root.tsx");
  const rootContent = fs.readFileSync(rootPath, "utf-8");

  const sonnerMatches = (rootContent.match(/<SonnerToaster|<Toaster/g) || []).length;
  if (sonnerMatches !== 1) {
    throw new Error(`FAIL: __root.tsx should contain exactly 1 Toaster mount, found ${sonnerMatches}`);
  }
  console.log("[PASS] Requirement 1: Exactly 1 authoritative global Toaster mounted in __root.tsx.");

  // Test 2: Verify no sub-layouts (office.tsx, admin.tsx, principal.tsx, teacher.tsx, parent.tsx) mount a duplicate Toaster
  const layoutFiles = ["office.tsx", "admin.tsx", "principal.tsx", "teacher.tsx", "parent.tsx"];

  for (const layout of layoutFiles) {
    const layoutPath = path.join(routesDir, layout);
    if (fs.existsSync(layoutPath)) {
      const content = fs.readFileSync(layoutPath, "utf-8");
      if (content.includes("<Toaster") || content.includes("<SonnerToaster") || content.includes("<Sonner")) {
        throw new Error(`FAIL: Duplicate Toaster mount found in layout ${layout}`);
      }
      console.log(`[PASS] ${layout}: Verified 0 duplicate Toaster mounts.`);
    }
  }

  // Test 3: Scan all route files in routes/ to ensure no page component contains an embedded <Toaster />
  const allRouteFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith(".tsx") && f !== "__root.tsx");

  for (const file of allRouteFiles) {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("<Toaster") || content.includes("<SonnerToaster") || content.includes("<Sonner")) {
      throw new Error(`FAIL: Embedded duplicate Toaster found in route ${file}`);
    }
  }
  console.log(`[PASS] Requirement 3: Verified all ${allRouteFiles.length} child route components have zero duplicate Toaster instances.`);

  console.log("\n=== ALL GLOBAL TOAST SINGLETON TESTS PASSED SUCCESSFULLY ===");
}

runGlobalToastSingletonRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
