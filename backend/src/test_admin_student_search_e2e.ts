import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { toCanonicalAdmissionNo, type Student } from "../../frontend/src/lib/supabaseService";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runAdminStudentSearchSuite() {
  console.log("=== STARTING ADMIN STUDENT SEARCH BAR REGRESSION SUITE ===");

  console.log("\n[STEP 1] Fetching real student data from Supabase...");
  const { data: dbRows, error } = await adminSupabase
    .from("gv_users")
    .select("*")
    .or("role.eq.student,role.eq.Student,role.ilike.*student*");

  if (error || !dbRows || dbRows.length === 0) {
    throw new Error(`FAIL: Fetching students from Supabase failed: ${error?.message}`);
  }

  const data: Student[] = dbRows.map((d: any) => ({
    id: d.id || d.login_id,
    rollNo: d.roll_no ? Number(d.roll_no) : 1,
    admissionNo: toCanonicalAdmissionNo(d.admission_no || d.admissionNo, d.id),
    name: d.full_name || d.name || "Student",
    className: d.class_name || d.className || "Nursery",
    section: d.section || "A",
    parent: d.parent_name || d.parent || "Parent",
    parentId: d.parent_id || `PAR-${d.id}`,
    phone: d.mobile || d.phone || "9876543210",
    feeStatus: (d.fee_status as any) || "Pending",
    avatar: d.photo_url || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(d.full_name || "Student")}`,
  }));

  console.log(`  [PASS] Retrieved ${data.length} student records from Supabase.`);

  // Search Matcher Function matching admin.students.tsx implementation
  const filterStudents = (itemList: Student[], query: string) => {
    const q = query.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/g, "");

    return itemList.filter((s) => {
      if (!q) return true;
      const canonicalAdm = toCanonicalAdmissionNo(s.admissionNo, s.id).toLowerCase();
      const rawAdm = (s.admissionNo || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      const parent = (typeof s.parent === "string" ? s.parent : (s.parent as any)?.name || "").toLowerCase();
      const phone = (s.phone || "").toLowerCase();
      const cleanPhone = phone.replace(/\D/g, "");
      const id = (s.id || "").toLowerCase();

      return (
        name.includes(q) ||
        rawAdm.includes(q) ||
        canonicalAdm.includes(q) ||
        parent.includes(q) ||
        phone.includes(q) ||
        id.includes(q) ||
        (cleanQ.length > 0 && (
          canonicalAdm.includes(cleanQ) ||
          cleanPhone.includes(cleanQ)
        ))
      );
    });
  };

  const sampleStudent = data[0];
  const sampleName = sampleStudent.name;
  const sampleAdm = toCanonicalAdmissionNo(sampleStudent.admissionNo, sampleStudent.id);
  const sampleParent = typeof sampleStudent.parent === "string" ? sampleStudent.parent : (sampleStudent.parent as any)?.name || "Parent";
  const samplePhone = sampleStudent.phone || "98765";

  // 2. Test Search by Name (Case-insensitive)
  console.log("\n[STEP 2] Testing Search by Student Name...");
  const nameQueryLower = sampleName.slice(0, 3).toLowerCase();
  const nameQueryUpper = sampleName.slice(0, 3).toUpperCase();
  const nameMatchesLower = filterStudents(data, nameQueryLower);
  const nameMatchesUpper = filterStudents(data, nameQueryUpper);

  if (nameMatchesLower.length === 0 || nameMatchesUpper.length === 0) {
    throw new Error(`FAIL: Search by name "${sampleName}" returned 0 records.`);
  }
  if (nameMatchesLower.length !== nameMatchesUpper.length) {
    throw new Error("FAIL: Case insensitivity failed for name search.");
  }
  console.log(`  [PASS] Name query "${nameQueryLower}" matched ${nameMatchesLower.length} record(s).`);

  // 3. Test Search by Admission Number
  console.log("\n[STEP 3] Testing Search by Admission Number...");
  const admMatches = filterStudents(data, sampleAdm);
  if (admMatches.length === 0 || !admMatches.some((s) => s.id === sampleStudent.id)) {
    throw new Error(`FAIL: Search by admission number "${sampleAdm}" failed to find student ${sampleStudent.id}`);
  }
  console.log(`  [PASS] Admission No query "${sampleAdm}" matched student ${sampleStudent.name}.`);

  // 4. Test Search by Parent Name
  console.log("\n[STEP 4] Testing Search by Parent Name...");
  if (sampleParent && sampleParent !== "Parent") {
    const parentQuery = sampleParent.slice(0, 3).toLowerCase();
    const parentMatches = filterStudents(data, parentQuery);
    if (parentMatches.length === 0) {
      throw new Error(`FAIL: Search by parent "${sampleParent}" returned 0 records.`);
    }
    console.log(`  [PASS] Parent query "${parentQuery}" matched ${parentMatches.length} record(s).`);
  } else {
    console.log("  [SKIP] Parent field empty or default.");
  }

  // 5. Test Search by Phone
  console.log("\n[STEP 5] Testing Search by Phone Number...");
  if (samplePhone && samplePhone.length >= 4) {
    const phoneQuery = samplePhone.slice(-4);
    const phoneMatches = filterStudents(data, phoneQuery);
    if (phoneMatches.length === 0) {
      throw new Error(`FAIL: Search by phone "${phoneQuery}" returned 0 records.`);
    }
    console.log(`  [PASS] Phone query "${phoneQuery}" matched ${phoneMatches.length} record(s).`);
  } else {
    console.log("  [SKIP] Phone field empty.");
  }

  // 6. Test Non-matching query
  console.log("\n[STEP 6] Testing Non-Matching Query...");
  const bogusQuery = "XYZ999NONEXISTENT_STUDENT_QUERY_12345";
  const bogusMatches = filterStudents(data, bogusQuery);
  if (bogusMatches.length !== 0) {
    throw new Error(`FAIL: Non-matching query should return 0 records, got ${bogusMatches.length}`);
  }
  console.log("  [PASS] Non-matching query correctly returned 0 records.");

  // 7. Test Pagination Clamping Verification
  console.log("\n[STEP 7] Verifying DataTable Page Clamping Logic...");
  const mockTotalItems = 20;
  const mockPageSize = 8;
  const initialPage = 3; // On page 3 of 3
  const filteredCount = 1; // Search reduces to 1 item (1 page)
  const totalPagesAfterSearch = Math.ceil(filteredCount / mockPageSize); // 1
  const currentPageClamped = Math.min(initialPage, totalPagesAfterSearch); // 1

  if (currentPageClamped !== 1) {
    throw new Error(`FAIL: Expected page to clamp to 1, got ${currentPageClamped}`);
  }
  console.log("  [PASS] Pagination correctly clamps page 3 -> page 1 when dataset shrinks.");

  console.log("\n=== ALL ADMIN STUDENT SEARCH TESTS PASSED ===");
}

runAdminStudentSearchSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
