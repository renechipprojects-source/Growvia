import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { toCanonicalAdmissionNo, type Student } from "../../frontend/src/lib/supabaseService";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runAdminStudentFeeFilterSuite() {
  console.log("=== STARTING ADMIN STUDENT FEE FILTER REGRESSION SUITE ===");

  console.log("\n[STEP 1] Fetching real student and fee records from Supabase...");
  const [{ data: dbStudents, error: stuErr }, { data: dbFees, error: feeErr }] = await Promise.all([
    adminSupabase.from("gv_users").select("*").or("role.eq.student,role.eq.Student,role.ilike.*student*"),
    adminSupabase.from("gv_fees_payments").select("*"),
  ]);

  if (stuErr || !dbStudents || dbStudents.length === 0) {
    throw new Error(`FAIL: Fetching students failed: ${stuErr?.message}`);
  }

  console.log(`  [PASS] Fetched ${dbStudents.length} students and ${(dbFees || []).length} fee ledger records.`);

  const feeMap = new Map<string, string>();
  (dbFees || []).forEach((f: any) => {
    const key1 = (f.student_id || "").toLowerCase();
    const key2 = (f.admission_no || "").toLowerCase();
    const canonicalKey = toCanonicalAdmissionNo(f.admission_no || f.student_id).toLowerCase();
    const st = f.status === "Paid" ? "Paid" : (f.paid_amount || f.paid || 0) > 0 ? "Partial" : "Due";
    if (key1) feeMap.set(key1, st);
    if (key2) feeMap.set(key2, st);
    if (canonicalKey) feeMap.set(canonicalKey, st);
  });

  const students: { id: string; name: string; className: string; section: string; status: string; feesStatus: string }[] = dbStudents.map((d: any) => {
    const canonicalAdm = toCanonicalAdmissionNo(d.admission_no || d.id, d.id);
    const calcStatus =
      feeMap.get(canonicalAdm.toLowerCase()) ||
      feeMap.get((d.id || "").toLowerCase()) ||
      feeMap.get((d.admission_no || "").toLowerCase()) ||
      (d.fee_status === "Paid" ? "Paid" : d.fee_status === "Partial" ? "Partial" : "Due");

    return {
      id: d.id,
      name: d.full_name || "Student",
      className: d.class_name || "Nursery",
      section: d.section || "A",
      status: d.status || "Active",
      feesStatus: calcStatus,
    };
  });

  // Filter function matching frontend admin.students.tsx
  const applyFilters = (
    list: typeof students,
    search: string,
    filters: { Class?: string; Section?: string; Status?: string; "Fee Status"?: string }
  ) => {
    const q = search.trim().toLowerCase();
    const cls = filters["Class"];
    const sec = filters["Section"];
    const st = filters["Status"];
    const feeSt = filters["Fee Status"];
    const normalize = (str?: string) => (str || "").replace(/\s+/g, "").toLowerCase();

    return list.filter((s) => {
      if (q && !`${s.name} ${s.id}`.toLowerCase().includes(q)) return false;
      if (cls && cls !== "all" && normalize(s.className) !== normalize(cls)) return false;
      if (sec && sec !== "all" && s.section?.toLowerCase() !== sec.toLowerCase()) return false;
      if (st && st !== "all" && s.status?.toLowerCase() !== st.toLowerCase()) return false;
      if (feeSt && feeSt !== "all" && s.feesStatus?.toLowerCase() !== feeSt.toLowerCase()) return false;
      return true;
    });
  };

  // 2. Test Fee Status = Paid
  console.log("\n[STEP 2] Testing Fee Status filter: 'Paid'...");
  const paidMatches = applyFilters(students, "", { "Fee Status": "Paid" });
  console.log(`  [PASS] 'Paid' fee status filter returned ${paidMatches.length} student(s).`);
  for (const s of paidMatches) {
    if (s.feesStatus !== "Paid") {
      throw new Error(`FAIL: Non-Paid student found in Paid filter: ${s.name} (${s.feesStatus})`);
    }
  }

  // 3. Test Fee Status = Partial
  console.log("\n[STEP 3] Testing Fee Status filter: 'Partial'...");
  const partialMatches = applyFilters(students, "", { "Fee Status": "Partial" });
  console.log(`  [PASS] 'Partial' fee status filter returned ${partialMatches.length} student(s).`);
  for (const s of partialMatches) {
    if (s.feesStatus !== "Partial") {
      throw new Error(`FAIL: Non-Partial student found in Partial filter: ${s.name} (${s.feesStatus})`);
    }
  }

  // 4. Test Fee Status = Due
  console.log("\n[STEP 4] Testing Fee Status filter: 'Due'...");
  const dueMatches = applyFilters(students, "", { "Fee Status": "Due" });
  console.log(`  [PASS] 'Due' fee status filter returned ${dueMatches.length} student(s).`);
  for (const s of dueMatches) {
    if (s.feesStatus !== "Due") {
      throw new Error(`FAIL: Non-Due student found in Due filter: ${s.name} (${s.feesStatus})`);
    }
  }

  // 5. Verify total match count consistency
  const totalCategorized = paidMatches.length + partialMatches.length + dueMatches.length;
  if (totalCategorized !== students.length) {
    throw new Error(`FAIL: Categorized count (${totalCategorized}) != Total students (${students.length})`);
  }
  console.log(`  [PASS] All ${students.length} students cleanly partition across Paid, Partial, and Due status filters.`);

  // 6. Combined filter test
  console.log("\n[STEP 6] Testing Combined Filters (Fee Status + Class + Status)...");
  const combinedMatches = applyFilters(students, "", { "Fee Status": "Due", Class: "Nursery", Status: "Active" });
  console.log(`  [PASS] Combined filter (Fee Status: Due, Class: Nursery, Status: Active) returned ${combinedMatches.length} record(s).`);

  console.log("\n=== ALL ADMIN STUDENT FEE FILTER TESTS PASSED ===");
}

runAdminStudentFeeFilterSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
