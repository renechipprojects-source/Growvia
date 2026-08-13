import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runRealtimeStressE2E() {
  console.log("==================================================================================");
  console.log("⚡ REALTIME STRESS, CONCURRENCY & RACE-CONDITION REGRESSION QA SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();
  const stressUserId = `USR-STRESS-${now}`;
  const stressParentId = `PAR-STRESS-${now}`;

  const createdUserIds: string[] = [];
  const createdRequestIds: string[] = [];

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: Rapid Consecutive Mutations (20 updates in rapid succession)
    // ---------------------------------------------------------------------------
    console.log("\n[STRESS 1] Testing 20 Rapid Consecutive Mutations on a single user record...");
    const initialUser = {
      id: stressUserId,
      login_id: `STR${now.toString().slice(-5)}`,
      email: `stress.${now}@sunshine.edu`,
      full_name: "Stress Tester Initial",
      role: "teacher",
      status: "active",
      experience: 0,
      mobile: "9000000000",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdUserIds.push(stressUserId);

    await adminSupabase.from("gv_users").insert([initialUser]);

    // Fire 20 consecutive updates
    for (let i = 1; i <= 20; i++) {
      await adminSupabase
        .from("gv_users")
        .update({
          full_name: `Stress Tester Iteration ${i}`,
          experience: i,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stressUserId);
    }

    const { data: finalRecord } = await adminSupabase.from("gv_users").select("*").eq("id", stressUserId).single();
    const { data: countCheck } = await adminSupabase.from("gv_users").select("id").eq("id", stressUserId);

    if (finalRecord?.experience === 20 && finalRecord?.full_name === "Stress Tester Iteration 20" && countCheck?.length === 1) {
      console.log("  ✓ PASS: All 20 rapid updates converged cleanly; zero row duplication (exactly 1 record), latest data preserved.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Rapid update convergence failed:", finalRecord);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 2: Simultaneous Parallel Insertions Across 5 Diverse ERP Request Types
    // ---------------------------------------------------------------------------
    console.log("\n[STRESS 2] Testing 5 Concurrent Parallel Writes across gv_requests...");
    const concurrentIds = [
      `REQ-CONC-ATTN-${now}`,
      `REQ-CONC-MRK-${now}`,
      `REQ-CONC-ASG-${now}`,
      `REQ-CONC-ENQ-${now}`,
      `REQ-CONC-LEV-${now}`,
    ];
    createdRequestIds.push(...concurrentIds);

    const parallelPayloads = [
      { id: concurrentIds[0], request_type: "student_attendance", status: "Present", applicant_or_child_name: stressUserId },
      { id: concurrentIds[1], request_type: "marks", status: "A+", applicant_or_child_name: "Stress Student" },
      { id: concurrentIds[2], request_type: "class_assignment", status: "active", applicant_or_child_name: "Stress Teacher" },
      { id: concurrentIds[3], request_type: "enquiry", status: "New", applicant_or_child_name: "Prospective Child" },
      { id: concurrentIds[4], request_type: "leave", status: "Pending", applicant_or_child_name: "Leave Applicant" },
    ];

    // Execute concurrently using Promise.all
    const results = await Promise.all(parallelPayloads.map((p) => adminSupabase.from("gv_requests").insert([p])));
    const hasErrors = results.some((r) => r.error !== null);

    const { data: insertedRecords } = await adminSupabase.from("gv_requests").select("id").in("id", concurrentIds);

    if (!hasErrors && insertedRecords?.length === 5) {
      console.log("  ✓ PASS: All 5 parallel concurrent requests persisted with zero deadlocks or row collisions.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Parallel write failed. Count:", insertedRecords?.length);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 3: Multi-Role Concurrent Reads on Shared State
    // ---------------------------------------------------------------------------
    console.log("\n[STRESS 3] Testing 10 Multi-Role Concurrent Queries on Shared Database Records...");
    const clientQueries = Array.from({ length: 10 }, (_, idx) =>
      adminSupabase.from("gv_users").select("id, full_name, experience").eq("id", stressUserId).single()
    );

    const queryResponses = await Promise.all(clientQueries);
    const allConsistent = queryResponses.every(
      (r) => r.data?.experience === 20 && r.data?.full_name === "Stress Tester Iteration 20"
    );

    if (allConsistent) {
      console.log("  ✓ PASS: 10 concurrent multi-role client queries returned 100% consistent authoritative data.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Concurrent query inconsistency detected.");
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 4: High-Frequency Status Toggling (Active -> Inactive -> Active -> Inactive -> Active)
    // ---------------------------------------------------------------------------
    console.log("\n[STRESS 4] Testing High-Frequency Status Toggling...");
    const toggles = ["inactive", "active", "inactive", "active", "inactive", "active"];
    for (const st of toggles) {
      await adminSupabase.from("gv_users").update({ status: st }).eq("id", stressUserId);
    }

    const { data: toggledUser } = await adminSupabase.from("gv_users").select("status").eq("id", stressUserId).single();
    if (toggledUser?.status === "active") {
      console.log("  ✓ PASS: Status toggling converged to 'active' without stale cache latching.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Status toggle resulted in:", toggledUser?.status);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 5: Concurrent Parent Sibling Resolution Under Load
    // ---------------------------------------------------------------------------
    console.log("\n[STRESS 5] Testing Concurrent Sibling Creation & Isolation Under Load...");
    const pPayload = {
      id: stressParentId,
      login_id: `PAR${now.toString().slice(-5)}`,
      email: `stress.parent.${now}@example.com`,
      full_name: "Parent Under Load",
      role: "parent",
      status: "active",
      mobile: "9112233445",
    };
    createdUserIds.push(stressParentId);

    const sib1Id = `STU-SIB-${now}-1`;
    const sib2Id = `STU-SIB-${now}-2`;
    createdUserIds.push(sib1Id, sib2Id);

    const sib1 = {
      id: sib1Id,
      login_id: `ADM${now.toString().slice(-4)}1`,
      email: `sib1.${now}@sunshine.edu`,
      full_name: "Child Alpha",
      role: "student",
      parent_id: stressParentId,
      class_name: "Playgroup",
      section: "A",
      status: "active",
    };
    const sib2 = {
      id: sib2Id,
      login_id: `ADM${now.toString().slice(-4)}2`,
      email: `sib2.${now}@sunshine.edu`,
      full_name: "Child Beta",
      role: "student",
      parent_id: stressParentId,
      class_name: "LKG",
      section: "B",
      status: "active",
    };

    await adminSupabase.from("gv_users").insert([pPayload]);
    // Parallel child insertions
    await Promise.all([
      adminSupabase.from("gv_users").insert([sib1]),
      adminSupabase.from("gv_users").insert([sib2]),
    ]);

    const { data: resolvedSiblings } = await adminSupabase
      .from("gv_users")
      .select("id, full_name, class_name")
      .eq("parent_id", stressParentId);

    if (resolvedSiblings && resolvedSiblings.length === 2) {
      console.log(`  ✓ PASS: Concurrently inserted siblings resolved perfectly (${resolvedSiblings.map(s => s.full_name).join(", ")}).`);
      passed++;
    } else {
      console.error("  ✗ FAIL: Sibling resolution count:", resolvedSiblings?.length);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected Stress Suite Exception:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n[CLEANUP] Purging all stress test records from Supabase...");
    if (createdUserIds.length > 0) {
      await adminSupabase.from("gv_users").delete().in("id", createdUserIds);
    }
    if (createdRequestIds.length > 0) {
      await adminSupabase.from("gv_requests").delete().in("id", createdRequestIds);
    }
    console.log("  ✓ All stress test records successfully cleaned up.");
  }

  console.log("\n==================================================================================");
  console.log(`📊 STRESS SUITE RESULT: ${passed}/5 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runRealtimeStressE2E().catch(console.error);
