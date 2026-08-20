import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  toCanonicalAdmissionNo,
  getNextAdmissionNo,
  generateParentCredential,
} from "../../frontend/src/lib/credentials";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMultiChildParentDataModelSuite() {
  console.log("=== STARTING MULTI-CHILD PARENT DATA MODEL REGRESSION SUITE ===");

  const timestamp = Date.now().toString().slice(-4);
  const testParentName = `Ramesh Sharma ${timestamp}`;
  const testParentPhone = `98765${timestamp.padStart(5, "0")}`; // Unique 10-digit Indian phone
  const testChildAName = `Aarav Sharma ${timestamp}`;
  const testChildBName = `Ananya Sharma ${timestamp}`;

  const cleanPhone = testParentPhone.replace(/\D/g, "");
  const expectedParentId = `PAR-${cleanPhone.slice(-10)}`;

  // 1. Admit Child A
  console.log("\n[STEP 1] Admitting Child A with Parent ID resolution...");
  const childAId = `STU-A-${timestamp}`;
  const childAPayload = {
    id: childAId,
    login_id: childAId,
    email: `${childAId.toLowerCase()}@sunshine.edu`,
    admission_no: `26${timestamp}`,
    full_name: testChildAName,
    role: "student",
    class_name: "Nursery",
    section: "A",
    parent_name: testParentName,
    parent_id: expectedParentId,
    mobile: testParentPhone,
    gender: "Boy",
    fee_status: "Pending",
    status: "active",
  };

  const { data: childAData, error: childAErr } = await adminSupabase
    .from("gv_users")
    .insert([childAPayload])
    .select()
    .single();

  if (childAErr || !childAData) {
    throw new Error(`FAIL: Inserting Child A failed: ${childAErr?.message}`);
  }
  console.log(`  [PASS] Child A created. ID: ${childAData.id}, Parent ID: ${childAData.parent_id}`);

  // 2. Query existing parent when admitting Child B
  console.log("\n[STEP 2] Querying existing parent identity when admitting Child B...");
  const { data: existingParentMatches } = await adminSupabase
    .from("gv_users")
    .select("parent_id, parent_name, mobile")
    .ilike("mobile", `%${cleanPhone.slice(-10)}%`)
    .limit(1);

  if (!existingParentMatches || existingParentMatches.length === 0) {
    throw new Error("FAIL: Existing parent not found by phone lookup!");
  }

  const reusedParentId = existingParentMatches[0].parent_id;
  console.log(`  [PASS] Existing parent phone match found. Reused Parent ID: "${reusedParentId}"`);

  // 3. Admit Child B using reused Parent ID
  console.log("\n[STEP 3] Admitting Child B using reused Parent ID...");
  const childBId = `STU-B-${timestamp}`;
  const childBPayload = {
    id: childBId,
    login_id: childBId,
    email: `${childBId.toLowerCase()}@sunshine.edu`,
    admission_no: `26${Number(timestamp) + 1}`,
    full_name: testChildBName,
    role: "student",
    class_name: "LKG",
    section: "B",
    parent_name: testParentName,
    parent_id: reusedParentId,
    mobile: testParentPhone,
    gender: "Girl",
    fee_status: "Pending",
    status: "active",
  };

  const { data: childBData, error: childBErr } = await adminSupabase
    .from("gv_users")
    .insert([childBPayload])
    .select()
    .single();

  if (childBErr || !childBData) {
    throw new Error(`FAIL: Inserting Child B failed: ${childBErr?.message}`);
  }
  console.log(`  [PASS] Child B created. ID: ${childBData.id}, Parent ID: ${childBData.parent_id}`);

  // 4. Prove Child A and Child B share the exact same Parent ID
  console.log("\n[STEP 4] Proving Child A & Child B share identical Parent ID...");
  if (childAData.parent_id !== childBData.parent_id) {
    throw new Error(`FAIL: Parent ID mismatch! Child A Parent ID = "${childAData.parent_id}", Child B Parent ID = "${childBData.parent_id}"`);
  }
  console.log(`  [PASS] Single Parent ID verified across both children: "${childAData.parent_id}"`);

  // 5. Verify Parent Directory aggregation (1 parent record, 2 children)
  console.log("\n[STEP 5] Fetching all students from Supabase & verifying Parent Directory aggregation...");
  const { data: allStudents } = await adminSupabase
    .from("gv_users")
    .select("*")
    .or("role.eq.student,role.eq.Student,role.ilike.*student*");

  const parentMap = new Map<string, { id: string; name: string; phone: string; children: string[] }>();

  (allStudents || []).forEach((s: any) => {
    const pName = s.parent_name || "Parent";
    const pPhone = (s.mobile || "").replace(/\D/g, "");
    const pKey = s.parent_id || (pPhone.length >= 10 ? `PAR-${pPhone.slice(-10)}` : pName.toLowerCase());

    if (!parentMap.has(pKey)) {
      parentMap.set(pKey, {
        id: pKey,
        name: pName,
        phone: s.mobile || "",
        children: [s.full_name],
      });
    } else {
      const existing = parentMap.get(pKey)!;
      if (!existing.children.includes(s.full_name)) {
        existing.children.push(s.full_name);
      }
    }
  });

  const parentRecord = parentMap.get(childAData.parent_id);
  if (!parentRecord) {
    throw new Error(`FAIL: Aggregated parent record for "${childAData.parent_id}" not found in parent directory.`);
  }

  if (!parentRecord.children.includes(testChildAName) || !parentRecord.children.includes(testChildBName)) {
    throw new Error(`FAIL: Parent record does not contain both children. Found: ${JSON.stringify(parentRecord.children)}`);
  }
  console.log("  [PASS] Parent directory cleanly shows ONE parent record with both children:", parentRecord);

  // 6. Cleanup test records from Supabase
  console.log("\n[STEP 6] Cleaning up test records from Supabase...");
  await adminSupabase.from("gv_users").delete().in("id", [childAId, childBId]);
  await adminSupabase.from("gv_users").delete().eq("id", childAData.parent_id);
  console.log("  [PASS] Test records cleaned up successfully.");

  console.log("\n=== ALL MULTI-CHILD PARENT DATA MODEL TESTS PASSED ===");
}

runMultiChildParentDataModelSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
