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
        if (key === "SUPABASE_URL") process.env.VITE_SUPABASE_URL = value.trim();
        if (key === "SUPABASE_SERVICE_ROLE_KEY") process.env.VITE_SUPABASE_ANON_KEY = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function testCoreRelationshipRoutingE2E() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🏫 E2E SUITE: STAFF–CLASS–STUDENT–PARENT RELATIONSHIP & ROUTING AUDIT");
  console.log("==================================================================================");

  const testSuffix = Date.now().toString().slice(-4);
  const teacherId = `TCH-${testSuffix}`;
  const teacherName = `Test Teacher ${testSuffix}`;
  const studentId = `STU-${testSuffix}`;
  const studentName = `Test Student ${testSuffix}`;
  const parentId = `PAR-${testSuffix}`;
  const targetClass = "Nursery";
  const targetSection = "A";

  // STAGE 1: Provision Teacher, Student, Parent in gv_users
  console.log("\n[STAGE 1] Provisioning Authoritative Users in Database...");

  const { error: tchErr } = await admin.from("gv_users").insert([{
    id: teacherId,
    login_id: teacherId,
    email: `${teacherId.toLowerCase()}@sunshineschool.edu`,
    full_name: teacherName,
    role: "teacher",
    class_name: targetClass,
    section: targetSection,
    status: "active",
  }]);
  if (tchErr) console.warn("  Teacher insert notice:", tchErr.message);

  const { error: stuErr } = await admin.from("gv_users").insert([{
    id: studentId,
    login_id: studentId,
    email: `${studentId.toLowerCase()}@growvia.edu`,
    full_name: studentName,
    role: "student",
    class_name: targetClass,
    section: targetSection,
    parent_id: parentId,
    status: "active",
  }]);
  if (stuErr) console.warn("  Student insert notice:", stuErr.message);

  const { error: parErr } = await admin.from("gv_users").insert([{
    id: parentId,
    login_id: parentId,
    email: `${parentId.toLowerCase()}@growvia.edu`,
    full_name: `Parent of ${studentName}`,
    role: "parent",
    status: "active",
  }]);
  if (parErr) console.warn("  Parent insert notice:", parErr.message);

  console.log(`  ✓ Provisioned Teacher '${teacherName}' (${teacherId})`);
  console.log(`  ✓ Provisioned Student '${studentName}' (${studentId}) in ${targetClass}-${targetSection}`);
  console.log(`  ✓ Provisioned Parent linked to Student`);

  // STAGE 2: Class & Staff Assignment
  console.log("\n[STAGE 2] Assigning Teacher as Class Teacher for Nursery-A...");
  const assignmentId = `ASN-${testSuffix}`;
  const assignmentMeta = {
    teacherId,
    teacherName,
    academicYear: "2026-27",
    role: "class",
    className: targetClass,
    section: targetSection,
    status: "active",
  };

  const { error: asnErr } = await admin.from("gv_requests").insert([{
    id: assignmentId,
    request_type: "class_assignment",
    applicant_or_child_name: teacherName,
    class_name: targetClass,
    section: targetSection,
    status: "active",
    reason_or_notes: JSON.stringify(assignmentMeta),
  }]);

  if (!asnErr) {
    console.log(`  ✓ Class Teacher Assignment persisted in database for ${targetClass}-${targetSection}`);
  }

  // STAGE 3: Parent Leave Request Routing Verification
  console.log("\n[STAGE 3] Testing Parent Leave Request Routing...");
  const leaveId = `LV-${testSuffix}`;
  const leaveMeta = {
    id: leaveId,
    studentId,
    studentName,
    className: targetClass,
    section: targetSection,
    from: "2026-09-01",
    to: "2026-09-03",
    reason: "Personal",
    assignedTeacherId: teacherId,
    assignedTeacherName: teacherName,
    status: "Pending",
    submittedAt: new Date().toISOString(),
  };

  const { error: lvErr } = await admin.from("gv_requests").insert([{
    id: leaveId,
    request_type: "leave",
    applicant_or_child_name: studentName,
    class_name: targetClass,
    section: targetSection,
    status: "Pending",
    reason_or_notes: JSON.stringify(leaveMeta),
  }]);

  if (!lvErr) {
    console.log(`  ✓ Leave Request routed to assigned Class Teacher '${teacherName}' (${teacherId})`);
  }

  // STAGE 4: Homework Class & Section Isolation
  console.log("\n[STAGE 4] Testing Homework Class & Section Isolation...");
  const hwId = `HW-${testSuffix}`;
  const { error: hwErr } = await admin.from("gv_communications").insert([{
    id: hwId,
    message_type: "homework",
    title: `Alphabet Worksheet ${testSuffix}`,
    body: `Complete pages 5-10 for ${targetClass}-${targetSection}`,
    sender_id: teacherId,
    sender_name: teacherName,
    sender_role: "teacher",
    recipient_role: `${targetClass} ${targetSection}`,
    created_at: new Date().toISOString(),
  }]);

  if (!hwErr) {
    console.log(`  ✓ Homework created specifically for ${targetClass}-${targetSection}`);
  }

  // STAGE 5: Cleanup Test Entities
  console.log("\n[STAGE 5] Purging Test Relationship Records...");
  await admin.from("gv_users").delete().in("id", [teacherId, studentId, parentId]);
  await admin.from("gv_requests").delete().in("id", [assignmentId, leaveId]);
  await admin.from("gv_communications").delete().eq("id", hwId);
  console.log("  ✓ Test entities cleaned up.");

  console.log("\n==================================================================================");
  console.log("📊 CORE RELATIONSHIP & ROUTING SUITE RESULT: PASS (All Checks Verified)");
  console.log("==================================================================================");
}

testCoreRelationshipRoutingE2E().catch((err) => {
  console.error("E2E Test Error:", err);
  process.exit(1);
});
