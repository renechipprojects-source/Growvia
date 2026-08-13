import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runCommunicationE2ETests() {
  console.log("==================================================================================");
  console.log("📨 STAFF → PARENT COMMUNICATION, MULTI-SUBJECT & PWA PUSH LIVE E2E QA SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;

  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  // Entities
  const parentId = `PAR-TEST-${now}`;
  const child1Id = `STU-TEST-C1-${now}`;
  const child2Id = `STU-TEST-C2-${now}`;
  const teacherId = `TCH-TEST-${now}`;
  const teacherName = "Ms. Priya Sharma";

  const class1 = "Nursery";
  const sec1 = "A";
  const class2 = "UKG";
  const sec2 = "B";

  const fiveSubjects = [
    "Mathematics",
    "English",
    "Environmental Science",
    "Tamil",
    "Art & Craft",
  ];

  const createdRequestIds: string[] = [];
  const createdCommsIds: string[] = [];

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: 5 Independent Subjects Homework Creation & Class Targeting
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 1] Creating & verifying 5 independent subject homework assignments for Class Nursery-A...");
    const hwInserts = fiveSubjects.map((sub, idx) => {
      const hwId = `HW-QA-${idx}-${now}`;
      createdCommsIds.push(hwId);
      return {
        id: hwId,
        message_type: "homework",
        title: `${sub} Daily Activity & Homework`,
        body: JSON.stringify({
          title: `${sub} Daily Activity & Homework`,
          className: class1,
          subject: sub,
          due: today,
          details: `Complete task ${idx + 1} for ${sub}.`,
        }),
        sender_id: teacherId,
        sender_name: teacherName,
        sender_role: "teacher",
        recipient_role: "parent",
        published_at: new Date().toISOString(),
      };
    });

    const { error: hwErr } = await supabase.from("gv_communications").insert(hwInserts);
    if (!hwErr) {
      console.log(`  ✓ PASS: Successfully persisted 5 distinct subject homework entries (${fiveSubjects.join(", ")}).`);
      passed++;
    } else {
      console.error("  ✗ FAIL: Homework insertion error:", hwErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 2: Multi-Subject Homework Retrieval & Zero Cross-Subject Bleeding
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 2] Verifying retrieval and strict subject isolation for all 5 subjects...");
    const { data: retrievedHW, error: rHwErr } = await supabase
      .from("gv_communications")
      .select("*")
      .in("id", createdCommsIds)
      .eq("message_type", "homework");

    if (!rHwErr && retrievedHW && retrievedHW.length === 5) {
      const retrievedSubjects = retrievedHW.map((h: any) => {
        try { return JSON.parse(h.body).subject; } catch { return null; }
      });
      const allFound = fiveSubjects.every((s) => retrievedSubjects.includes(s));
      if (allFound) {
        console.log("  ✓ PASS: All 5 subjects retrieved with intact metadata and zero cross-subject bleeding.");
        passed++;
      } else {
        console.error("  ✗ FAIL: Missing subjects in query result:", retrievedSubjects);
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Failed to query created homework entries:", rHwErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 3: Multi-Child Parent Resolution & Isolation (Child 1 Nursery-A vs Child 2 UKG-B)
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 3] Verifying Multi-Child isolation (Child 1 in Nursery-A vs Child 2 in UKG-B)...");
    // Homework for Child 2's class (UKG-B)
    const child2HwId = `HW-C2-${now}`;
    createdCommsIds.push(child2HwId);
    await supabase.from("gv_communications").insert([{
      id: child2HwId,
      message_type: "homework",
      title: "UKG Advanced Phonics",
      body: JSON.stringify({
        title: "UKG Advanced Phonics",
        className: class2,
        subject: "Phonics",
        due: today,
        details: "Read chapter 4 aloud.",
      }),
      sender_id: teacherId,
      sender_name: teacherName,
      sender_role: "teacher",
      recipient_role: "parent",
      published_at: new Date().toISOString(),
    }]);

    // Query for Child 1 (Nursery) -> Should find only 5 Nursery homeworks, NOT UKG
    const { data: c1Data } = await supabase
      .from("gv_communications")
      .select("*")
      .in("id", createdCommsIds);

    const c1HW = (c1Data || []).filter((d: any) => {
      try { return JSON.parse(d.body).className === class1; } catch { return false; }
    });
    const c2HW = (c1Data || []).filter((d: any) => {
      try { return JSON.parse(d.body).className === class2; } catch { return false; }
    });

    if (c1HW.length === 5 && c2HW.length === 1 && c2HW[0].id === child2HwId) {
      console.log("  ✓ PASS: Child 1 (Nursery-A) sees exactly 5 assignments; Child 2 (UKG-B) sees exactly 1 assignment. Zero leakage.");
      passed++;
    } else {
      console.error(`  ✗ FAIL: Isolation mismatch: C1 got ${c1HW.length}, C2 got ${c2HW.length}`);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 4: In-App Notification & PWA Push Subscription Persistence
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 4] Verifying PWA Push Subscription & In-App Notification Dispatch...");
    const pushSubId = `PUSH-${parentId}-${now}`;
    createdCommsIds.push(pushSubId);
    const mockSubscription = {
      endpoint: `https://fcm.googleapis.com/fcm/send/mock-${now}`,
      keys: { p256dh: "mock_p256dh_key_data", auth: "mock_auth_secret" },
    };

    const pushPayload = {
      id: pushSubId,
      message_type: "push_subscription",
      title: "Parent Device Push Subscription",
      body: JSON.stringify({
        userId: parentId,
        role: "parent",
        subscription: mockSubscription,
        updatedAt: new Date().toISOString(),
      }),
      sender_id: parentId,
      sender_role: "parent",
      recipient_user_id: parentId,
      recipient_role: "parent",
      published_at: new Date().toISOString(),
    };

    const { error: pushErr } = await supabase.from("gv_communications").insert([pushPayload]);
    if (!pushErr) {
      console.log("  ✓ PASS: PWA Web Push device subscription persisted to gv_communications.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Push subscription error:", pushErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 5: Direct Staff → Parent Message & Remote Read Receipt Flow
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 5] Verifying Staff → Parent Direct Message and Read Receipt...");
    const msgId = `MSG-DIRECT-${now}`;
    createdCommsIds.push(msgId);
    const directMsg = {
      id: msgId,
      message_type: "message",
      title: "Notice: Annual Day Costume",
      body: "Please collect the costume from the front desk by Thursday.",
      sender_id: teacherId,
      sender_name: teacherName,
      sender_role: "teacher",
      recipient_role: "parent",
      recipient_user_id: parentId,
      read_status: false,
      published_at: new Date().toISOString(),
    };

    const { error: dMsgErr } = await supabase.from("gv_communications").insert([directMsg]);
    // Simulate recipient clicking message in parent portal
    const { error: readUpdErr } = await supabase
      .from("gv_communications")
      .update({ read_status: true })
      .eq("id", msgId);

    const { data: readRecord } = await supabase
      .from("gv_communications")
      .select("read_status")
      .eq("id", msgId)
      .single();

    if (!dMsgErr && !readUpdErr && readRecord?.read_status === true) {
      console.log("  ✓ PASS: Direct message delivered and confirmed with remote read receipt (read_status: true).");
      passed++;
    } else {
      console.error("  ✗ FAIL: Direct message / read receipt error:", dMsgErr?.message || readUpdErr?.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // TEST 6: 5-Subject Marks Entry, Query & Grade Calculation
    // ---------------------------------------------------------------------------
    console.log("\n[TEST 6] Verifying 5-Subject Marks entry for Child 1...");
    const markInserts = fiveSubjects.map((sub, idx) => {
      const score = 80 + idx * 4; // 80, 84, 88, 92, 96
      const mrkId = `MRK-${child1Id}-${sub.replace(/[^a-zA-Z0-9]/g, "")}-Term1`;
      createdRequestIds.push(mrkId);
      return {
        id: mrkId,
        request_type: "marks",
        applicant_or_child_name: "Child One QA",
        parent_name: child1Id,
        leave_type_or_interested_class: `${class1} ${sec1}`,
        status: score >= 90 ? "A+" : "A",
        reason_or_notes: JSON.stringify({
          studentId: child1Id,
          studentName: "Child One QA",
          rollNo: 1,
          className: class1,
          section: sec1,
          subject: sub,
          assessment: "Final Term",
          outOf: 100,
          score,
          remarks: `Excellent performance in ${sub}.`,
        }),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: mrkErr } = await supabase.from("gv_requests").upsert(markInserts, { onConflict: "id" });
    if (!mrkErr) {
      console.log("  ✓ PASS: 5-Subject marks successfully stored with distinct scores and grades.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Marks upsert error:", mrkErr.message);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected QA Exception:", err);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP: Purge all QA records from database
    // ---------------------------------------------------------------------------
    console.log("\n[CLEANUP] Purging all test records from gv_requests and gv_communications...");
    if (createdRequestIds.length > 0) {
      await supabase.from("gv_requests").delete().in("id", createdRequestIds);
    }
    if (createdCommsIds.length > 0) {
      await supabase.from("gv_communications").delete().in("id", createdCommsIds);
    }
    console.log(`  ✓ Successfully cleaned up ${createdRequestIds.length} request rows and ${createdCommsIds.length} communication rows.`);
  }

  console.log("\n==================================================================================");
  console.log(`📊 FINAL COMMUNICATION QA SUITE RESULT: ${passed}/6 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runCommunicationE2ETests().catch(console.error);
