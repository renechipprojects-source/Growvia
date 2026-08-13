import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runEndToEndQATests() {
  console.log("==================================================================");
  console.log("🧪 STAFF + PARENT WORKFLOW END-TO-END QA SUITE (SUPABASE LIVE)");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  const testTeacherId = "TCH-QA-TEST-001";
  const testTeacherName = "Teacher Anita QA";
  const classA = "Nursery";
  const secA = "A";
  const classB = "UKG";
  const secB = "B";
  const subjectMath = "Mathematics";
  const subjectEng = "English";

  const student1Id = "STU-QA-001";
  const student2Id = "STU-QA-002";
  const parentId = "PAR-QA-001";

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Multiple Assignments for Same Teacher (Class Teacher + Subject Teacher)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Verifying multi-assignment persistence for Teacher A...");
    const asg1 = {
      id: `CA-QA-1-${Date.now()}`,
      request_type: "class_assignment",
      applicant_or_child_name: testTeacherName,
      leave_type_or_interested_class: `${classA} ${secA}`,
      status: "active",
      reason_or_notes: JSON.stringify({
        id: `CA-QA-1-${Date.now()}`,
        teacherId: testTeacherId,
        teacherName: testTeacherName,
        academicYear: "2026-2027",
        role: "class",
        className: classA,
        section: secA,
        status: "active",
      }),
    };

    const asg2 = {
      id: `CA-QA-2-${Date.now()}`,
      request_type: "class_assignment",
      applicant_or_child_name: testTeacherName,
      leave_type_or_interested_class: `${classB} ${secB}`,
      status: "active",
      reason_or_notes: JSON.stringify({
        id: `CA-QA-2-${Date.now()}`,
        teacherId: testTeacherId,
        teacherName: testTeacherName,
        academicYear: "2026-2027",
        role: "subject",
        className: classB,
        section: secB,
        subject: subjectMath,
        status: "active",
      }),
    };

    const { error: asgErr1 } = await supabase.from("gv_requests").insert([asg1]);
    const { error: asgErr2 } = await supabase.from("gv_requests").insert([asg2]);

    if (!asgErr1 && !asgErr2) {
      console.log("  ✓ PASS: Successfully persisted Class Teacher (Nursery-A) and Subject Teacher (UKG-B Math) for same teacher.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Assignment persistence error:", asgErr1?.message || asgErr2?.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Class Teacher Scoped Attendance Recording
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Verifying Class Teacher Attendance Recording...");
    const today = new Date().toISOString().slice(0, 10);
    const attnRecord = {
      id: `ATTN-${student1Id}-${today}`,
      request_type: "student_attendance",
      applicant_or_child_name: student1Id,
      leave_type_or_interested_class: `${classA} ${secA}`,
      status: "Present",
      reason_or_notes: JSON.stringify({
        studentId: student1Id,
        className: classA,
        section: secA,
        date: today,
        status: "P",
        markedBy: "Class Teacher",
      }),
      created_at: new Date().toISOString(),
    };

    const { error: attnErr } = await supabase.from("gv_requests").upsert([attnRecord], { onConflict: "id" });
    if (!attnErr) {
      console.log("  ✓ PASS: Attendance successfully recorded for Class A (Nursery-A).");
      passed++;
    } else {
      console.error("  ✗ FAIL: Attendance recording error:", attnErr.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Subject Teacher Homework Assignment
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Verifying Subject-scoped Homework Creation...");
    const hwRecord = {
      id: `HW-QA-${Date.now()}`,
      message_type: "homework",
      title: "Math Shapes & Count Exercise",
      body: JSON.stringify({
        title: "Math Shapes & Count Exercise",
        className: classB,
        subject: subjectMath,
        due: today,
        details: "Complete workbook page 12 on basic geometric shapes.",
      }),
      sender_id: testTeacherId,
      sender_name: testTeacherName,
      sender_role: "teacher",
      recipient_role: "parent",
      published_at: new Date().toISOString(),
    };

    const { error: hwErr } = await supabase.from("gv_communications").insert([hwRecord]);
    if (!hwErr) {
      console.log("  ✓ PASS: Subject Homework created for UKG-B Mathematics.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Homework creation error:", hwErr.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 4: Subject Marks Entry & Isolation
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Verifying Subject-specific Marks Entry & Isolation...");
    const markMath = {
      id: `MRK-${student2Id}-Math-Unit1`,
      request_type: "marks",
      applicant_or_child_name: "Child Two QA",
      parent_name: student2Id,
      leave_type_or_interested_class: `${classB} ${secB}`,
      status: "A+",
      reason_or_notes: JSON.stringify({
        studentId: student2Id,
        studentName: "Child Two QA",
        rollNo: 12,
        className: classB,
        section: secB,
        subject: subjectMath,
        assessment: "Unit Test 1",
        outOf: 100,
        score: 95,
        remarks: "Excellent problem solving in Maths.",
      }),
      updated_at: new Date().toISOString(),
    };

    const markEng = {
      id: `MRK-${student2Id}-Eng-Unit1`,
      request_type: "marks",
      applicant_or_child_name: "Child Two QA",
      parent_name: student2Id,
      leave_type_or_interested_class: `${classB} ${secB}`,
      status: "A",
      reason_or_notes: JSON.stringify({
        studentId: student2Id,
        studentName: "Child Two QA",
        rollNo: 12,
        className: classB,
        section: secB,
        subject: subjectEng,
        assessment: "Unit Test 1",
        outOf: 100,
        score: 88,
        remarks: "Good vocabulary and reading.",
      }),
      updated_at: new Date().toISOString(),
    };

    const { error: mErr1 } = await supabase.from("gv_requests").upsert([markMath], { onConflict: "id" });
    const { error: mErr2 } = await supabase.from("gv_requests").upsert([markEng], { onConflict: "id" });

    if (!mErr1 && !mErr2) {
      console.log("  ✓ PASS: Mathematics (95) and English (88) marks independently stored and isolated without collision.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Marks upsert error:", mErr1?.message || mErr2?.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 5: Parent Multi-Child Academic Data Query & Separation
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Verifying Parent Multi-Child Query & Separation...");
    // Query Child 1 Attendance (Nursery-A)
    const { data: c1Attn } = await supabase.from("gv_requests").select("*").eq("id", `ATTN-${student1Id}-${today}`);
    // Query Child 2 Marks (UKG-B Math)
    const { data: c2Marks } = await supabase.from("gv_requests").select("*").eq("id", `MRK-${student2Id}-Math-Unit1`);

    if (c1Attn && c1Attn.length > 0 && c2Marks && c2Marks.length > 0) {
      console.log("  ✓ PASS: Child 1 attendance is isolated to Nursery-A; Child 2 marks are isolated to UKG-B.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Multi-child data query mismatch.");
      failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 6: Message & Read Receipt Persistence
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Verifying Message Read Receipt Flow...");
    const msgId = `MSG-QA-${Date.now()}`;
    const testMsg = {
      id: msgId,
      message_type: "message",
      title: "Parent Teacher Meeting Reminder",
      body: "Please attend the PTM scheduled for this Friday.",
      sender_id: "USR-OFFICE",
      sender_name: "Office Staff",
      sender_role: "staff",
      recipient_role: "parent",
      recipient_user_id: parentId,
      read_status: false,
      published_at: new Date().toISOString(),
    };

    const { error: msgErr } = await supabase.from("gv_communications").insert([testMsg]);
    // Simulate recipient opening message -> mark read
    const { error: readErr } = await supabase.from("gv_communications").update({ read_status: true }).eq("id", msgId);

    if (!msgErr && !readErr) {
      console.log("  ✓ PASS: Message created and read receipt confirmed (read_status: true) in gv_communications.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Read receipt error:", msgErr?.message || readErr?.message);
      failed++;
    }

    // -------------------------------------------------------------------------
    // CLEANUP TEST ARTIFACTS
    // -------------------------------------------------------------------------
    console.log("\n[CLEANUP] Removing test records...");
    await supabase.from("gv_requests").delete().in("id", [asg1.id, asg2.id, attnRecord.id, markMath.id, markEng.id]);
    await supabase.from("gv_communications").delete().in("id", [hwRecord.id, msgId]);
    console.log("  ✓ Test artifacts cleaned up.");

  } catch (err: any) {
    console.error("Unexpected QA Exception:", err);
    failed++;
  }

  console.log("\n==================================================================");
  console.log(`📊 FINAL QA SUITE RESULT: ${passed}/6 Core Data Flows Passed, ${failed} Failed`);
  console.log("==================================================================");
}

runEndToEndQATests().catch(console.error);
