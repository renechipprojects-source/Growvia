import { createClient } from "@supabase/supabase-js";
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
} catch {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function runStudentEditAndCertificateE2ETest() {
  console.log("==================================================================================");
  console.log("🧪 STARTING STUDENT DETAILS EDIT & CERTIFICATE SUBMISSION E2E TEST");
  console.log("==================================================================================");

  const testStudentId = `STU-EditTest-${Date.now().toString().slice(-4)}`;
  const testAdmNo = `2026-${Date.now().toString().slice(-4)}`;

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: STUDENT DETAILS EDITING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[TEST 1] Creating initial student record ${testStudentId} (${testAdmNo})...`);
  const initialStudentPayload = {
    id: testStudentId,
    login_id: testStudentId,
    admission_no: testAdmNo,
    full_name: "Master Rohan Verma",
    role: "student",
    class_name: "Grade 1",
    section: "A",
    parent_name: "Suresh Verma",
    mobile: "9876500221",
    email: "rohan.verma@sunshine.edu",
    fee_status: "Pending",
    status: "active",
    created_at: new Date().toISOString(),
  };

  const { error: stuInsertErr } = await supabase.from("gv_users").insert([initialStudentPayload]);
  if (stuInsertErr) {
    console.error("  └─ [FAIL] Error inserting initial student record:", stuInsertErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Initial student record inserted into gv_users.");

  console.log("\n[STEP 1.2] Updating student details (Class -> Grade 2, Section -> B, Parent -> Suresh Kumar Verma, Mobile -> 9876500222, FeeStatus -> Paid)...");
  const updateStudentPayload = {
    full_name: "Master Rohan Verma",
    class_name: "Grade 2",
    section: "B",
    parent_name: "Suresh Kumar Verma",
    mobile: "9876500222",
    fee_status: "Paid",
    updated_at: new Date().toISOString(),
  };

  const { error: stuUpdateErr } = await supabase
    .from("gv_users")
    .update(updateStudentPayload)
    .eq("id", testStudentId);

  if (stuUpdateErr) {
    console.error("  └─ [FAIL] Error updating student record:", stuUpdateErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Student record updated in gv_users.");

  console.log("\n[STEP 1.3] Querying updated student record from Supabase after simulated refresh...");
  const { data: updatedStu, error: stuFetchErr } = await supabase
    .from("gv_users")
    .select("*")
    .eq("id", testStudentId)
    .single();

  if (stuFetchErr || !updatedStu) {
    console.error("  └─ [FAIL] Could not fetch updated student record:", stuFetchErr?.message);
    process.exit(1);
  }

  console.log("  └─ [VERIFIED UPDATED STUDENT]:");
  console.log(`      ID: ${updatedStu.id}`);
  console.log(`      Name: ${updatedStu.full_name}`);
  console.log(`      Class: ${updatedStu.class_name}-${updatedStu.section}`);
  console.log(`      Parent: ${updatedStu.parent_name}`);
  console.log(`      Mobile: ${updatedStu.mobile}`);
  console.log(`      Fee Status: ${updatedStu.fee_status}`);

  if (
    updatedStu.class_name !== "Grade 2" ||
    updatedStu.section !== "B" ||
    updatedStu.parent_name !== "Suresh Kumar Verma" ||
    updatedStu.mobile !== "9876500222" ||
    updatedStu.fee_status !== "Paid"
  ) {
    console.error("  └─ [FAIL] Updated student DB values do not match expected edits!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Student details editing verified perfectly.");

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: CERTIFICATE SUBMISSION EDITING
  // ─────────────────────────────────────────────────────────────────────────────
  const docRequestId = `DOC-${testAdmNo}`;
  console.log(`\n[TEST 2] Creating initial certificate submission record ${docRequestId}...`);

  const initialDocsMeta = {
    admissionNo: testAdmNo,
    studentName: "Master Rohan Verma",
    documents: [
      { name: "Birth Certificate", status: "Submitted", submittedOn: "2026-01-10" },
      { name: "Parent Aadhaar", status: "Pending" },
      { name: "Passport Photo", status: "Submitted", submittedOn: "2026-01-10" },
      { name: "Vaccination Record", status: "Pending" },
      { name: "Transfer Certificate", status: "Pending" },
    ],
  };

  const initialDocPayload = {
    id: docRequestId,
    request_type: "student_docs",
    applicant_or_child_name: "Master Rohan Verma",
    status: "Verified",
    reason_or_notes: JSON.stringify(initialDocsMeta),
    created_at: new Date().toISOString(),
  };

  const { error: docInsertErr } = await supabase.from("gv_requests").insert([initialDocPayload]);
  if (docInsertErr) {
    console.error("  └─ [FAIL] Error inserting certificate submission record:", docInsertErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Initial certificate submission record inserted into gv_requests.");

  console.log("\n[STEP 2.2] Updating certificate submission (Marking Parent Aadhaar & Transfer Cert as Submitted, adding Conduct Cert)...");
  const updatedDocsMeta = {
    admissionNo: testAdmNo,
    studentName: "Master Rohan Verma",
    documents: [
      { name: "Birth Certificate", status: "Submitted", submittedOn: "2026-01-10" },
      { name: "Parent Aadhaar", status: "Submitted", submittedOn: new Date().toISOString().slice(0, 10) },
      { name: "Passport Photo", status: "Submitted", submittedOn: "2026-01-10" },
      { name: "Vaccination Record", status: "Pending" },
      { name: "Transfer Certificate", status: "Submitted", submittedOn: new Date().toISOString().slice(0, 10) },
      { name: "Conduct Certificate", status: "Submitted", submittedOn: new Date().toISOString().slice(0, 10) },
    ],
  };

  const updatedDocPayload = {
    id: docRequestId,
    request_type: "student_docs",
    applicant_or_child_name: "Master Rohan Verma",
    status: "Verified",
    reason_or_notes: JSON.stringify(updatedDocsMeta),
    updated_at: new Date().toISOString(),
  };

  const { error: docUpdateErr } = await supabase
    .from("gv_requests")
    .upsert([updatedDocPayload], { onConflict: "id" });

  if (docUpdateErr) {
    console.error("  └─ [FAIL] Error updating certificate submission:", docUpdateErr.message);
    process.exit(1);
  }
  console.log("  └─ [PASS] Certificate submission record updated in gv_requests.");

  console.log("\n[STEP 2.3] Querying updated certificate submission record from Supabase after simulated refresh...");
  const { data: updatedDocRow, error: docFetchErr } = await supabase
    .from("gv_requests")
    .select("*")
    .eq("id", docRequestId)
    .single();

  if (docFetchErr || !updatedDocRow) {
    console.error("  └─ [FAIL] Could not fetch updated certificate submission record:", docFetchErr?.message);
    process.exit(1);
  }

  const fetchedMeta = JSON.parse(updatedDocRow.reason_or_notes || "{}");
  const submittedDocs = (fetchedMeta.documents || []).filter((d: any) => d.status === "Submitted");

  console.log("  └─ [VERIFIED CERTIFICATE SUBMISSIONS]:");
  console.log(`      Doc Request ID: ${updatedDocRow.id}`);
  console.log(`      Student Name: ${updatedDocRow.applicant_or_child_name}`);
  console.log(`      Total Submitted Certificates: ${submittedDocs.length}`);
  console.log(`      Submitted List: ${submittedDocs.map((d: any) => d.name).join(", ")}`);

  if (submittedDocs.length !== 5) {
    console.error("  └─ [FAIL] Certificate submission count does not match expected updates!");
    process.exit(1);
  }
  console.log("  └─ [PASS] Certificate submission editing verified perfectly.");

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n[STEP 3] Cleaning up test student ${testStudentId} and doc request ${docRequestId}...`);
  await supabase.from("gv_users").delete().eq("id", testStudentId);
  await supabase.from("gv_requests").delete().eq("id", docRequestId);
  console.log("  └─ [PASS] Test records cleaned up successfully.");

  console.log("\n==================================================================================");
  console.log("✅ ALL STUDENT DETAILS & CERTIFICATE EDITING CHECKS PASSED PERFECTLY!");
  console.log("==================================================================================");
}

runStudentEditAndCertificateE2ETest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
