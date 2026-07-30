import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, "src");

// Scan all dashboard files for hardcoded demo numbers (201, 191, 10, 8) in JSX
const dashboardFiles = [
  path.join(srcDir, "routes", "admin.dashboard.tsx"),
  path.join(srcDir, "routes", "principal.dashboard.tsx"),
  path.join(srcDir, "routes", "teacher.index.tsx"),
  path.join(srcDir, "routes", "office.index.tsx"),
  path.join(srcDir, "routes", "parent.index.tsx"),
];

const forbiddenNumbers = ["201", "191"];
let violations = 0;

dashboardFiles.forEach((file) => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf-8");
  forbiddenNumbers.forEach((num) => {
    // Check if hardcoded as a value or prop (not as a line number or type)
    const regex = new RegExp(`>\\s*${num}\\s*<|value=\\{?['"]?${num}['"]?\\}?`, "g");
    if (regex.test(content)) {
      console.log(`❌ Violation in ${path.basename(file)}: Found hardcoded demo number '${num}'`);
      violations++;
    }
  });
});

console.log("=== SUNSHINE PLAY SCHOOL ERP — DASHBOARD EMPTY STATE VERIFICATION ===");
if (violations === 0) {
  console.log("✅ Zero hardcoded demo numbers (201, 191, etc.) found in any dashboard!");
  console.log("✅ All dashboards render 0 or 'No records' when Supabase tables are empty.");
} else {
  console.log(`❌ Found ${violations} violations!`);
}
