// Polyfill localStorage in Node test environment if window is undefined
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
  (globalThis as any).window = globalThis;
}

import { fetchStudents, updateStudent, setCachedStudentsList } from "../../frontend/src/lib/supabaseService";
import type { Student } from "../../frontend/src/lib/mockData";

async function runStudentProfileDataBindingRegressionSuite() {
  console.log("=== STARTING STUDENT PROFILE DATA BINDING REGRESSION SUITE ===");

  // Test 1: Create student record with explicit real data and missing optional fields
  const sampleStudent: Student = {
    id: "STU-PROF-1001",
    rollNo: 15,
    admissionNo: "260015",
    name: "Devansh Varma",
    age: 5,
    dob: "2021-05-12",
    className: "Grade 1" as any,
    section: "B" as any,
    parent: "Rakesh Varma",
    parentId: "PAR-998877",
    phone: "9876543210",
    gender: "Boy",
    house: "Blue",
    admissionDate: "2026-01-15",
    feeStatus: "Paid",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Devansh",
    attendance: 88,
    branch: "Main Branch",
    email: "rakesh.varma@example.com",
    address: "MG Road, Indiranagar",
    bloodGroup: "B+",
    documents: [{ name: "Aadhaar Card.pdf", status: "Verified" }],
  };

  setCachedStudentsList([sampleStudent]);
  const { data: students } = await fetchStudents();
  const fetched = students.find((s) => s.id === sampleStudent.id);

  if (!fetched) {
    throw new Error("FAIL: Created student profile record not found in fetchStudents.");
  }

  // Verify real field binding
  if (fetched.name !== "Devansh Varma" || fetched.rollNo !== 15 || fetched.admissionNo !== "260015") {
    throw new Error(`FAIL: Core student identity mismatched. Got name=${fetched.name}, roll=${fetched.rollNo}, adm=${fetched.admissionNo}`);
  }
  if (fetched.dob !== "2021-05-12" || fetched.gender !== "Boy" || fetched.house !== "Blue") {
    throw new Error("FAIL: Demographic details (dob/gender/house) mismatched.");
  }
  if (fetched.email !== "rakesh.varma@example.com" || fetched.address !== "MG Road, Indiranagar" || fetched.bloodGroup !== "B+") {
    throw new Error("FAIL: Extended contact/medical fields mismatched.");
  }
  if (fetched.attendance !== 88) {
    throw new Error(`FAIL: Expected attendance 88%, got ${fetched.attendance}`);
  }
  console.log("[PASS] Requirement 1: Profile fields correctly bound to authoritative database record.");

  // Test 2: Test empty optional fields (should be undefined, NOT silent fake data like '2022-01-01' or 'O+' or 'Bengaluru')
  const emptyOptionalStudent: Student = {
    id: "STU-PROF-1002",
    rollNo: undefined as any,
    admissionNo: "260016",
    name: "Ananya Gupta",
    age: 4,
    dob: undefined as any,
    className: "Nursery" as any,
    section: "A" as any,
    parent: "Suresh Gupta",
    parentId: "PAR-998878",
    phone: undefined as any,
    gender: undefined as any,
    house: undefined as any,
    admissionDate: undefined as any,
    feeStatus: "Pending",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Ananya",
    attendance: undefined as any,
    branch: "Main Branch",
    email: undefined,
    address: undefined,
    bloodGroup: undefined,
    documents: [],
  };

  setCachedStudentsList([emptyOptionalStudent, sampleStudent]);
  const { data: studentsEmpty } = await fetchStudents();
  const fetchedEmpty = studentsEmpty.find((s) => s.id === emptyOptionalStudent.id);

  if (!fetchedEmpty) {
    throw new Error("FAIL: Empty optional student record not found.");
  }

  if (fetchedEmpty.dob === "2022-01-01") {
    throw new Error("FAIL: Silent fake DOB ('2022-01-01') was assigned to missing DOB.");
  }
  if (fetchedEmpty.attendance === 95 || fetchedEmpty.attendance === 100) {
    throw new Error(`FAIL: Silent fake attendance (${fetchedEmpty.attendance}%) was assigned to missing attendance.`);
  }
  if (fetchedEmpty.address === "Bengaluru") {
    throw new Error("FAIL: Silent fake address ('Bengaluru') was assigned to missing address.");
  }
  if (fetchedEmpty.bloodGroup === "O+") {
    throw new Error("FAIL: Silent fake blood group ('O+') was assigned to missing blood group.");
  }
  console.log("[PASS] Requirement 2: Missing database fields correctly produce safe empty states without inventing fake values.");

  // Test 3: Profile update persistence across re-fetch
  await updateStudent("STU-PROF-1001", {
    address: "Koramangala 4th Block",
    bloodGroup: "AB+",
    attendance: 92,
  });

  const { data: updatedList } = await fetchStudents();
  const reFetchedUpdated = updatedList.find((s) => s.id === "STU-PROF-1001");

  if (!reFetchedUpdated) {
    throw new Error("FAIL: Updated student profile record not found.");
  }
  if (reFetchedUpdated.address !== "Koramangala 4th Block" || reFetchedUpdated.bloodGroup !== "AB+" || reFetchedUpdated.attendance !== 92) {
    throw new Error(`FAIL: Profile updates failed to persist across re-fetch. Address=${reFetchedUpdated.address}, Blood=${reFetchedUpdated.bloodGroup}, Att=${reFetchedUpdated.attendance}`);
  }
  console.log("[PASS] Requirement 3: Profile updates persist and accurately reflect upon refresh/re-fetch.");

  console.log("\n=== ALL STUDENT PROFILE DATA BINDING REGRESSION TESTS PASSED SUCCESSFULLY ===");
}

runStudentProfileDataBindingRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
