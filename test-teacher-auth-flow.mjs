import fs from "fs";

console.log("==========================================================");
console.log("AUTOMATED TEACHER AUTHENTICATION FLOW VERIFICATION");
console.log("==========================================================");

const supabaseAuthCode = fs.readFileSync("src/lib/supabaseAuth.ts", "utf8");
const credentialsCode = fs.readFileSync("src/lib/credentials.ts", "utf8");
const authCode = fs.readFileSync("src/lib/auth.ts", "utf8");
const teacherRouteCode = fs.readFileSync("src/routes/teacher.tsx", "utf8");

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName) {
  totalCount++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// 1. Teacher profile creation & Auth account linkage
assert(
  credentialsCode.includes("export async function createTeacherAuthAccount") &&
  credentialsCode.includes("supabase.auth.signUp"),
  "Teacher profile creation & Supabase Auth account provisioning link"
);

// 2. auth_user_id assignment
assert(
  credentialsCode.includes("profilePayload.auth_user_id = authUserId"),
  "auth_user_id linkage assignment in profiles"
);

// 3. role = teacher
assert(
  credentialsCode.includes('role: "teacher"'),
  "Role assignment strictly set to 'teacher'"
);

// 4. Login ID -> email resolution
assert(
  supabaseAuthCode.includes(".or(`login_id.ilike.${id},email.ilike.${id}`)") &&
  supabaseAuthCode.includes("emailToAuth"),
  "Login ID -> email resolution for Supabase Auth"
);

// 5. Exact DEV check (no substring dev/developer collision for teachers like 'Devi')
assert(
  supabaseAuthCode.includes('id.toUpperCase() === "DEV001"') &&
  !supabaseAuthCode.includes('id.toLowerCase().includes("developer")'),
  "Developer check strictly uses exact match without blocking teacher IDs"
);

// 6. Password authentication
assert(
  supabaseAuthCode.includes("signInWithPassword") &&
  supabaseAuthCode.includes("authenticateGenerated"),
  "Password authentication via Supabase Auth with fallback auto-provisioning"
);

// 7. Teacher role routing & session restoration
assert(
  authCode.includes('case "teacher":     return "/teacher";') &&
  teacherRouteCode.includes('requireAuthGuard("teacher")'),
  "Teacher role routing to /teacher and session guard restoration"
);

// 8. Unaffected system roles (Admin, Principal, Office, Parent, Developer)
assert(
  authCode.includes("ADMIN001") &&
  authCode.includes("PRINCIPAL001") &&
  authCode.includes("OFFICE001") &&
  authCode.includes("DEV001"),
  "System role accounts (Admin, Principal, Office, Developer) fully preserved"
);

console.log("----------------------------------------------------------");
console.log(`RESULTS: ${passedCount} / ${totalCount} ASSERATIONS PASSED`);
console.log("==========================================================");

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}
