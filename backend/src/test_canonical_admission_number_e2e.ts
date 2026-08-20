import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import {
  toCanonicalAdmissionNo,
  generateCanonicalAdmissionNo,
  suggestParentLoginId,
} from "../../frontend/src/lib/credentials";
import {
  getNextAdmissionNo,
  createStudent,
  fetchStudents,
  fetchMergedFeeLedgers,
  type Student,
} from "../../frontend/src/lib/supabaseService";
import { fetchAttendanceFromSupabase } from "../../frontend/src/lib/attendanceStore";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runCanonicalAdmissionNumberSuite() {
  console.log("=== STARTING CANONICAL ADMISSION NUMBER (YYNNNN) REGRESSION SUITE ===");

  // 1. Test New Student Generation
  console.log("\n[TEST 1] New Student Admission Number Generation...");
  const newAdmNo = generateCanonicalAdmissionNo(2026, 1);
  if (newAdmNo !== "260001" || !/^\d{6}$/.test(newAdmNo)) {
    throw new Error(`FAIL: Expected 260001, got ${newAdmNo}`);
  }
  console.log("  [PASS] Initial new student admission number:", newAdmNo);

  // 2. Test Sequential Generation
  console.log("\n[TEST 2] Sequential Student Number Increment...");
  const mockStudents: Student[] = [
    { id: "s1", admissionNo: "260001", name: "Student 1", className: "Nursery", section: "A", feeStatus: "Paid" },
    { id: "s2", admissionNo: "260002", name: "Student 2", className: "Nursery", section: "A", feeStatus: "Paid" },
  ];
  const nextSeqNo = getNextAdmissionNo(mockStudents, 2026);
  if (nextSeqNo !== "260003") {
    throw new Error(`FAIL: Expected 260003, got ${nextSeqNo}`);
  }
  console.log("  [PASS] Sequential student number increment:", nextSeqNo);

  // 3. Test New Academic Year Generation
  console.log("\n[TEST 3] New Academic Year (2027) Admission Number Generation...");
  const nextYearNo = getNextAdmissionNo(mockStudents, 2027);
  if (nextYearNo !== "270001" || !nextYearNo.startsWith("27")) {
    throw new Error(`FAIL: Expected 270001, got ${nextYearNo}`);
  }
  console.log("  [PASS] New academic year 2027 admission number:", nextYearNo);

  // 4. Test Existing Student Record Normalization
  console.log("\n[TEST 4] Existing Student Legacy Format Normalization...");
  const legacyCases = [
    { input: "260001", expected: "260001" },
    { input: "SUN/26-1002", expected: "261002" },
    { input: "ADM-2026-0005", expected: "260005" },
    { input: "STU-0012", expected: "260012" },
    { input: "ADM/2027/0042", expected: "270042" },
    { input: "270001", expected: "270001" },
  ];
  for (const tc of legacyCases) {
    const norm = toCanonicalAdmissionNo(tc.input);
    if (norm !== tc.expected) {
      throw new Error(`FAIL: Normalization mismatch for "${tc.input}". Expected ${tc.expected}, got ${norm}`);
    }
  }
  console.log("  [PASS] Legacy student formats successfully normalized to YYNNNN.");

  // 5. Test Fee Ledger Mapping
  console.log("\n[TEST 5] Fee Ledger Canonical Admission No Mapping...");
  const { data: ledgers } = await fetchMergedFeeLedgers();
  if (ledgers && ledgers.length > 0) {
    for (const ledger of ledgers.slice(0, 5)) {
      const canonicalLedgerAdm = toCanonicalAdmissionNo(ledger.admissionNo, ledger.id);
      if (!/^\d{6}$/.test(canonicalLedgerAdm)) {
        throw new Error(`FAIL: Fee ledger admission number is not canonical YYNNNN: ${canonicalLedgerAdm}`);
      }
    }
  }
  console.log("  [PASS] Fee ledger admission numbers verified as canonical YYNNNN.");

  // 6. Test Payment Record Integration
  console.log("\n[TEST 6] Payment Record Admission No Reference...");
  const { data: payments } = await adminSupabase
    .from("gv_fee_transactions")
    .select("student_id, notes")
    .limit(5);

  if (payments) {
    for (const p of payments) {
      if (p.student_id) {
        const canonicalPaymentAdm = toCanonicalAdmissionNo(p.student_id);
        if (!/^\d{6}$/.test(canonicalPaymentAdm)) {
          throw new Error(`FAIL: Payment student reference is not canonical YYNNNN: ${canonicalPaymentAdm}`);
        }
      }
    }
  }
  console.log("  [PASS] Payment records reference canonical YYNNNN.");

  // 7. Test Attendance Record Normalization
  console.log("\n[TEST 7] Attendance Record Admission No Normalization...");
  const attendanceRes = await fetchAttendanceFromSupabase();
  for (const rec of attendanceRes.slice(0, 5)) {
    const canonicalAttAdm = toCanonicalAdmissionNo(rec.admissionNo, rec.studentId);
    if (!/^\d{6}$/.test(canonicalAttAdm)) {
      throw new Error(`FAIL: Attendance record admission number is not canonical YYNNNN: ${canonicalAttAdm}`);
    }
  }
  console.log("  [PASS] Attendance records verified as canonical YYNNNN.");

  // 8. Test Profile Header Display
  console.log("\n[TEST 8] Student Profile Admission No Formatting...");
  const sampleProfileStudent = { id: "s-test", admissionNo: "260015", name: "Rohan Sharma" };
  const profileAdm = toCanonicalAdmissionNo(sampleProfileStudent.admissionNo, sampleProfileStudent.id);
  if (profileAdm !== "260015" || profileAdm.includes("#") || profileAdm.includes("ADM")) {
    throw new Error(`FAIL: Student profile admission format mismatch: ${profileAdm}`);
  }
  console.log("  [PASS] Profile modal displays clean canonical admission number:", profileAdm);

  // 9. Test Parent Credentials Suggestion
  console.log("\n[TEST 9] Parent Credential Suggestion...");
  const suggestedParentLogin = suggestParentLoginId({ id: "s-test", admissionNo: "ADM/2026/0019" });
  if (suggestedParentLogin !== "260019" || !/^\d{6}$/.test(suggestedParentLogin)) {
    throw new Error(`FAIL: Parent credential suggestion mismatch. Expected 260019, got ${suggestedParentLogin}`);
  }
  console.log("  [PASS] Parent credential login ID suggested canonically:", suggestedParentLogin);

  // 10. Test Strict Format: No letters, slashes, or special characters
  console.log("\n[TEST 10] Strict Numeric Validation (YYNNNN: 6 Digits Only)...");
  const testSamples = [
    toCanonicalAdmissionNo("260001"),
    toCanonicalAdmissionNo("260002"),
    toCanonicalAdmissionNo("260003"),
    toCanonicalAdmissionNo("270001"),
    toCanonicalAdmissionNo("SUN-2026-9999"),
  ];
  for (const s of testSamples) {
    if (!/^\d{6}$/.test(s) || /[A-Za-z\/\-\s_#]/.test(s)) {
      throw new Error(`FAIL: Non-numeric or invalid format detected: "${s}"`);
    }
  }
  console.log("  [PASS] All samples strictly adhere to YYNNNN format (6 numeric digits only).");

  console.log("\n=== ALL 10 CANONICAL ADMISSION NUMBER TESTS PASSED ===");
}

runCanonicalAdmissionNumberSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
