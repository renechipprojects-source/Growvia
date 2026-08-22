import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), "backend/.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function executeOperationalReset() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🧹 EXECUTING OPERATIONAL DATA RESET & PRESERVING PERMANENT SYSTEM ACCOUNTS");
  console.log("==================================================================================");

  // ─── STAGE 1: BEFORE COUNTS ──────────────────────────────────────────────────
  console.log("\n[STAGE 1] Record counts BEFORE deletion:");

  const { data: beforeGvUsers } = await admin.from("gv_users").select("login_id, role");
  const { data: beforeGvRequests } = await admin.from("gv_requests").select("id, request_type");
  const { data: beforeAuth } = await admin.auth.admin.listUsers();

  const countsBefore = {
    gv_users_total: beforeGvUsers?.length || 0,
    students: beforeGvUsers?.filter((u) => u.role === "student").length || 0,
    parents: beforeGvUsers?.filter((u) => u.role === "parent").length || 0,
    teachers: beforeGvUsers?.filter((u) => u.role === "teacher").length || 0,
    system_users: beforeGvUsers?.filter((u) => ["admin", "principal", "office"].includes(u.role)).length || 0,
    gv_requests_total: beforeGvRequests?.length || 0,
    auth_users_total: beforeAuth?.users?.length || 0,
  };

  console.log(JSON.stringify(countsBefore, null, 2));

  // ─── STAGE 2: CLEANING gv_requests OPERATIONAL TYPES ────────────────────────
  console.log("\n[STAGE 2] Cleaning operational gv_requests...");

  const operationalRequestTypes = [
    "generated_credential",
    "staff_attendance",
    "attendance",
    "student_attendance",
    "enquiry",
    "otp_reset",
    "password_reset",
    "student_docs",
    "app_notification",
    "deleted_notification",
    "fee_payment",
    "fee_ledger",
    "expense",
    "inventory",
  ];

  for (const reqType of operationalRequestTypes) {
    const { error } = await admin.from("gv_requests").delete().eq("request_type", reqType);
    if (!error) console.log(`  ✓ Cleared gv_requests type '${reqType}'`);
  }

  // Also clear legacy requests table if present
  try {
    await admin.from("requests").delete().neq("request_type", "system_meta");
  } catch {}

  // ─── STAGE 3: CLEANING gv_users OPERATIONAL ROLES ───────────────────────────
  console.log("\n[STAGE 3] Cleaning operational gv_users (students, parents, teachers)...");

  const operationalRoles = ["student", "parent", "teacher"];
  for (const r of operationalRoles) {
    const { error } = await admin.from("gv_users").delete().eq("role", r);
    if (!error) console.log(`  ✓ Cleared gv_users role '${r}'`);
  }

  // Also clear legacy users table if present
  try {
    await admin.from("users").delete().in("role", ["student", "parent", "teacher"]);
  } catch {}

  // ─── STAGE 4: CLEANING OPERATIONAL Supabase Auth USERS ──────────────────────
  console.log("\n[STAGE 4] Cleaning operational auth.users (preserving Admin, Principal, Office)...");

  const systemLoginIds = ["ADMIN001", "PRINCIPAL001", "OFFICE001"];
  const systemEmails = ["admin@sunshineschool.edu", "principal@sunshineschool.edu", "office@sunshineschool.edu"];

  const { data: currentAuth } = await admin.auth.admin.listUsers();
  let deletedAuthCount = 0;

  for (const u of currentAuth?.users || []) {
    const isSystem =
      systemEmails.includes(u.email?.toLowerCase() || "") ||
      systemLoginIds.includes(String(u.user_metadata?.login_id).toUpperCase()) ||
      ["admin", "principal", "office"].includes(String(u.user_metadata?.role).toLowerCase());

    if (!isSystem) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (!error) deletedAuthCount++;
    } else {
      console.log(`  🛡️ PRESERVED System Auth Account: email '${u.email}', ID '${u.id}'`);
    }
  }

  console.log(`  ✓ Deleted ${deletedAuthCount} operational auth.users records.`);

  // ─── STAGE 5: AFTER COUNTS VERIFICATION ────────────────────────────────────
  console.log("\n[STAGE 5] Record counts AFTER deletion:");

  const { data: afterGvUsers } = await admin.from("gv_users").select("login_id, role");
  const { data: afterGvRequests } = await admin.from("gv_requests").select("id, request_type");
  const { data: afterAuth } = await admin.auth.admin.listUsers();

  const countsAfter = {
    gv_users_total: afterGvUsers?.length || 0,
    students: afterGvUsers?.filter((u) => u.role === "student").length || 0,
    parents: afterGvUsers?.filter((u) => u.role === "parent").length || 0,
    teachers: afterGvUsers?.filter((u) => u.role === "teacher").length || 0,
    system_users: afterGvUsers?.filter((u) => ["admin", "principal", "office"].includes(u.role)).length || 0,
    gv_requests_total: afterGvRequests?.length || 0,
    auth_users_total: afterAuth?.users?.length || 0,
  };

  console.log(JSON.stringify(countsAfter, null, 2));

  // ─── STAGE 6: ASSERTIONS ────────────────────────────────────────────────────
  console.log("\n[STAGE 6] Verifying reset assertions...");

  if (countsAfter.students !== 0) throw new Error(`FAIL: Students count is ${countsAfter.students} (Expected 0)`);
  if (countsAfter.parents !== 0) throw new Error(`FAIL: Parents count is ${countsAfter.parents} (Expected 0)`);
  if (countsAfter.teachers !== 0) throw new Error(`FAIL: Teachers count is ${countsAfter.teachers} (Expected 0)`);
  if (countsAfter.system_users !== 3) throw new Error(`FAIL: System users count is ${countsAfter.system_users} (Expected 3)`);

  console.log("  ✓ ALL RESET ASSERTIONS PASSED!");
  console.log("==================================================================================");
}

executeOperationalReset().catch((err) => {
  console.error("Operational reset error:", err);
  process.exit(1);
});
