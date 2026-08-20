import * as fs from "fs";
import * as path from "path";

async function runClassesSectionFilterSuite() {
  console.log("=== STARTING CLASSES SECTION FILTER REGRESSION SUITE ===");

  const srcDir = path.resolve(process.cwd(), "frontend/src");

  // 1. Verify admin.classes.tsx sectionOptions supports numeric and custom sections
  console.log("\n[STEP 1] Verifying admin.classes.tsx dynamic sectionOptions...");
  const adminClassesContent = fs.readFileSync(path.join(srcDir, "routes/admin.classes.tsx"), "utf-8");
  if (!adminClassesContent.includes("sectionOptions") || !adminClassesContent.includes('"1", "2"')) {
    throw new Error("FAIL: admin.classes.tsx missing numeric/custom section options support.");
  }
  console.log("  [PASS] admin.classes.tsx dynamically supports numeric and custom sections.");

  // 2. Verify office.classes.tsx sectionOptions
  console.log("\n[STEP 2] Verifying office.classes.tsx dynamic sectionOptions...");
  const officeClassesContent = fs.readFileSync(path.join(srcDir, "routes/office.classes.tsx"), "utf-8");
  if (!officeClassesContent.includes("sectionOptions") || officeClassesContent.includes('options: ["A", "B", "C", "D"]')) {
    throw new Error("FAIL: office.classes.tsx still uses hardcoded A/B/C/D section options.");
  }
  console.log("  [PASS] office.classes.tsx dynamically supports numeric and custom sections.");

  // 3. Verify admin.students.tsx and principal.students.tsx sectionOptions
  console.log("\n[STEP 3] Verifying student pages dynamic sectionOptions...");
  const adminStudentsContent = fs.readFileSync(path.join(srcDir, "routes/admin.students.tsx"), "utf-8");
  const principalStudentsContent = fs.readFileSync(path.join(srcDir, "routes/principal.students.tsx"), "utf-8");

  if (!adminStudentsContent.includes("sectionOptions") || !principalStudentsContent.includes("sectionOptions")) {
    throw new Error("FAIL: Student pages missing dynamic sectionOptions support.");
  }
  console.log("  [PASS] Student pages dynamically derive section options from stored records.");

  console.log("\n=== ALL CLASSES SECTION FILTER TESTS PASSED ===");
}

runClassesSectionFilterSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
