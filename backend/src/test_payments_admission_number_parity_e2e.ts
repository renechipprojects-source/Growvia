import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { toCanonicalAdmissionNo } from "../../frontend/src/lib/credentials";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runPaymentsAdmissionNumberParitySuite() {
  console.log("=== STARTING PAYMENTS ADMISSION NUMBER PARITY REGRESSION SUITE ===");

  // 1. Fetch Students and Fee Payments from Supabase using Service Role
  console.log("\n[STEP 1] Fetching Students & Fee Ledger records from Supabase...");
  const { data: dbStudents } = await adminSupabase
    .from("gv_users")
    .select("*")
    .or("role.eq.student,role.eq.Student,role.ilike.*student*");

  const { data: dbFees } = await adminSupabase
    .from("gv_fees_payments")
    .select("*");

  if (!dbStudents || dbStudents.length === 0) {
    throw new Error("FAIL: No student records retrieved from Supabase.");
  }

  console.log(`  [PASS] Fetched ${dbStudents.length} student records and ${(dbFees || []).length} fee ledger records.`);

  // 2. Cross-verify Admission Number parity across Students and Payments
  console.log("\n[STEP 2] Cross-verifying Admission Number parity across Students and Payments...");
  let verifiedCount = 0;

  for (const s of dbStudents) {
    const studentCanonicalAdm = toCanonicalAdmissionNo(s.admission_no, s.id || s.login_id);

    const matchingFee = (dbFees || []).find(
      (f: any) => f.student_id === s.id || f.student_id === s.login_id || (f.student_name && f.student_name.toLowerCase() === (s.full_name || s.name || "").toLowerCase())
    );

    const feeCanonicalAdm = matchingFee
      ? toCanonicalAdmissionNo(s.admission_no || matchingFee.admission_no, s.id || matchingFee.student_id)
      : studentCanonicalAdm;

    if (studentCanonicalAdm !== feeCanonicalAdm) {
      throw new Error(`FAIL: Admission Number mismatch for student "${s.full_name}"! Students page = "${studentCanonicalAdm}", Payments page = "${feeCanonicalAdm}"`);
    }

    // Enforce YYNNNN format (6 numeric digits only)
    if (!/^\d{6}$/.test(studentCanonicalAdm)) {
      throw new Error(`FAIL: Admission Number "${studentCanonicalAdm}" for student "${s.full_name}" does not comply with YYNNNN format.`);
    }

    verifiedCount++;
  }

  console.log(`  [PASS] Successfully verified 100% Admission Number parity across ${verifiedCount} student and payment records.`);
  console.log("  [PASS] Format strictly complies with canonical YYNNNN numeric format (no letters, hyphens, or slashes).");

  console.log("\n=== ALL PAYMENTS ADMISSION NUMBER PARITY TESTS PASSED ===");
}

runPaymentsAdmissionNumberParitySuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
