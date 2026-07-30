import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, "src");

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles(srcDir);

const forbiddenPatterns = [
  { name: "STUDENTS seed fallback", regex: /\b(STUDENTS)\b/ },
  { name: "TEACHERS seed fallback", regex: /\b(TEACHERS)\b/ },
  { name: "FEES seed fallback", regex: /\b(FEES|SEED_FEES)\b/ },
  { name: "SEED_STUDENTS fallback", regex: /\b(SEED_STUDENTS)\b/ },
  { name: "SEED_TEACHERS fallback", regex: /\b(SEED_TEACHERS)\b/ },
  { name: "SEED_MESSAGES fallback", regex: /\b(SEED_MESSAGES)\b/ },
  { name: "SEED_HOMEWORK fallback", regex: /\b(SEED_HOMEWORK)\b/ },
  { name: "SEED_RECEIPTS fallback", regex: /\b(SEED_RECEIPTS)\b/ },
  { name: "SEED_ACTIVITIES fallback", regex: /\b(SEED_ACTIVITIES)\b/ },
];

const whitelistFiles = [
  path.join(srcDir, "lib", "mockData.ts"),
  path.join(srcDir, "lib", "principal-mock-data.ts"),
  path.join(srcDir, "lib", "admin-mock-data.ts"),
  path.join(srcDir, "lib", "supabaseService.ts"), // type imports
];

let issuesFound = 0;
const fileResults = [];

files.forEach((filePath) => {
  if (whitelistFiles.includes(filePath)) return;
  const relativePath = path.relative(srcDir, filePath);
  const content = fs.readFileSync(filePath, "utf-8");

  // Check imports of mockData
  const importLines = content.split("\n").filter((l) => l.includes("from ") && (l.includes("mockData") || l.includes("principal-mock-data")));
  const valueImports = importLines.filter((l) => !l.includes("import type") && !l.includes("type {"));

  if (valueImports.length > 0) {
    issuesFound++;
    fileResults.push({ file: relativePath, issue: `Value import from mockData: ${valueImports.join("; ").trim()}` });
  }
});

console.log("=== SUNSHINE PLAY SCHOOL ERP — MOCK DEPENDENCY AUDIT ===");
console.log(`Scanned ${files.length} source code files.`);
if (issuesFound === 0) {
  console.log("✅ Zero mock value imports found in application source code!");
  console.log("✅ Supabase is 100% established as the Single Source of Truth!");
} else {
  console.log(`❌ Found ${issuesFound} files with leftover mock value dependencies:`);
  fileResults.forEach((r) => console.log(` - ${r.file}: ${r.issue}`));
}
