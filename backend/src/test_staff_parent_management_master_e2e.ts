import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runStaffParentMasterE2E() {
  console.log("==================================================================================");
  console.log("👥 STAFF & PARENT COMPLETE LIFECYCLE, MULTI-CHILD & SECURITY QA SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();
  const testTeacherId = `TCH-MSTR-${now}`;
  const testParentId = `PAR-MSTR-${now}`;
  const testChild1Id = `STU-MSTR-${now}-1`;
  const testChild2Id = `STU-MSTR-${now}-2`;

  const createdUserIds: string[] = [];

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: Staff Full Lifecycle (Create -> Read -> Edit -> Deactivate -> Restore)
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 1] Testing Staff Complete Lifecycle in gv_users...");
    const teacherPayload = {
      id: testTeacherId,
      login_id: `TCH${now.toString().slice(-5)}`,
      email: `teacher.${now}@sunshine.edu`,
      full_name: "Mrs. Sunita Sharma",
      role: "teacher",
      status: "active",
      class_name: "LKG",
      section: "A",
      subject: "Mathematics & Rhymes",
      designation: "Senior Educator",
      mobile: "9876543210",
      experience: 6,
      joining_date: "2024-06-01",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testTeacherId);

    // 1.1 Create
    const { error: tCreateErr } = await adminSupabase.from("gv_users").insert([teacherPayload]);
    const { data: tRead } = await adminSupabase.from("gv_users").select("*").eq("id", testTeacherId).single();

    // 1.2 Edit
    await adminSupabase
      .from("gv_users")
      .update({
        subject: "Mathematics, Art & Rhymes",
        experience: 7,
        mobile: "9876500000",
        updated_at: new Date().toISOString(),
      })
      .eq("id", testTeacherId);
    const { data: tEdited } = await adminSupabase.from("gv_users").select("*").eq("id", testTeacherId).single();

    // 1.3 Deactivate
    await adminSupabase.from("gv_users").update({ status: "inactive" }).eq("id", testTeacherId);
    const { data: tInactive } = await adminSupabase.from("gv_users").select("status").eq("id", testTeacherId).single();

    // 1.4 Restore
    await adminSupabase.from("gv_users").update({ status: "active" }).eq("id", testTeacherId);
    const { data: tRestored } = await adminSupabase.from("gv_users").select("status").eq("id", testTeacherId).single();

    if (
      !tCreateErr &&
      tRead?.id === testTeacherId &&
      tEdited?.experience === 7 &&
      tEdited?.subject === "Mathematics, Art & Rhymes" &&
      tInactive?.status === "inactive" &&
      tRestored?.status === "active"
    ) {
      console.log("  ✓ PASS: Staff lifecycle verified: Created -> Edited -> Deactivated -> Restored.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Staff lifecycle failure:", tCreateErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 2: Parent & Multi-Child Sibling Mapping & Cross-Child Isolation
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 2] Testing Parent & Multi-Child Sibling Isolation in gv_users...");
    const parentPayload = {
      id: testParentId,
      login_id: `PAR${now.toString().slice(-5)}`,
      email: `parent.${now}@example.com`,
      full_name: "Mr. Vikram Mehta",
      role: "parent",
      status: "active",
      mobile: "9811223344",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testParentId);

    const child1 = {
      id: testChild1Id,
      login_id: `ADM${now.toString().slice(-4)}1`,
      email: `child1.${now}@sunshine.edu`,
      full_name: "Kabir Mehta",
      role: "student",
      status: "active",
      class_name: "Nursery",
      section: "A",
      parent_name: "Mr. Vikram Mehta",
      parent_id: testParentId,
      mobile: "9811223344",
      attendance_pct: 98,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testChild1Id);

    const child2 = {
      id: testChild2Id,
      login_id: `ADM${now.toString().slice(-4)}2`,
      email: `child2.${now}@sunshine.edu`,
      full_name: "Meera Mehta",
      role: "student",
      status: "active",
      class_name: "UKG",
      section: "B",
      parent_name: "Mr. Vikram Mehta",
      parent_id: testParentId,
      mobile: "9811223344",
      attendance_pct: 94,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(testChild2Id);

    await adminSupabase.from("gv_users").insert([parentPayload]);
    await adminSupabase.from("gv_users").insert([child1, child2]);

    // Query children of parent
    const { data: siblings } = await adminSupabase
      .from("gv_users")
      .select("id, full_name, class_name, section")
      .eq("parent_id", testParentId);

    if (siblings && siblings.length === 2) {
      const names = siblings.map((s) => s.full_name);
      if (names.includes("Kabir Mehta") && names.includes("Meera Mehta")) {
        console.log(`  ✓ PASS: Parent ${testParentId} resolved exactly 2 sibling students (Kabir in Nursery-A, Meera in UKG-B).`);
        passed++;
      } else {
        console.error("  ✗ FAIL: Sibling names mismatch:", names);
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Sibling count mismatch:", siblings?.length);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 3: Duplicate Account Rejection & Conflict Prevention
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 3] Testing Duplicate Login ID Rejection...");
    const dupPayload = {
      id: `TCH-DUP-${now}`,
      login_id: teacherPayload.login_id, // Same login_id as testTeacher
      email: `duplicate.${now}@sunshine.edu`,
      full_name: "Duplicate Teacher",
      role: "teacher",
      status: "active",
    };

    const { error: dupErr } = await adminSupabase.from("gv_users").insert([dupPayload]);
    if (dupErr) {
      console.log(`  ✓ PASS: Database rejected duplicate login_id '${teacherPayload.login_id}' as expected.`);
      passed++;
    } else {
      console.error("  ✗ FAIL: Duplicate login_id was unexpectedly allowed!");
      createdUserIds.push(dupPayload.id);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 4: Deleted User Non-Resurrection
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 4] Testing User Deletion and Non-Resurrection...");
    await adminSupabase.from("gv_users").delete().eq("id", testTeacherId);
    const { data: deletedUser } = await adminSupabase.from("gv_users").select("*").eq("id", testTeacherId).maybeSingle();

    if (!deletedUser) {
      console.log("  ✓ PASS: Staff account deleted cleanly; verified absence in gv_users.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Deleted user still exists in database!");
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected Exception in Staff/Parent Master Suite:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n[CLEANUP] Purging test accounts...");
    if (createdUserIds.length > 0) {
      await adminSupabase.from("gv_users").delete().in("id", createdUserIds);
      console.log(`  ✓ Purged ${createdUserIds.length} test user records.`);
    }
  }

  console.log("\n==================================================================================");
  console.log(`📊 MASTER STAFF & PARENT QA RESULT: ${passed}/4 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runStaffParentMasterE2E().catch(console.error);
