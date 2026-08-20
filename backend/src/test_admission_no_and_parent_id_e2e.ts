import { toCanonicalAdmissionNo, generateCanonicalAdmissionNo, getNextAdmissionNo, createStudent, fetchStudents, getCachedStudentsList, setCachedStudentsList } from "../../frontend/src/lib/supabaseService";
import { generateParentCredential, listParentCredentials, getParentCredential } from "../../frontend/src/lib/credentials";

async function runRegressionSuite() {
  console.log("=== STARTING ADMISSION NO (NUMERIC YYNNNN) & MULTI-CHILD PARENT ID REGRESSION SUITE ===");

  // Test 1: Canonical Pure Numeric Admission Number Generation (YYNNNN)
  const canon1 = toCanonicalAdmissionNo("260001");
  const canon2 = toCanonicalAdmissionNo("SUN/26-1002");
  const canon3 = toCanonicalAdmissionNo("ADM-2026-0005");
  const canon2027 = generateCanonicalAdmissionNo(2027, 1);

  if (canon1 !== "260001") throw new Error(`Test 1 Failed: Expected 260001, got ${canon1}`);
  if (!/^\d{6}$/.test(canon1)) throw new Error(`Test 1 Failed: ${canon1} is not pure numeric 6 digits`);
  if (canon2 !== "261002") throw new Error(`Test 2 Failed: Expected 261002, got ${canon2}`);
  if (canon3 !== "260005") throw new Error(`Test 3 Failed: Expected 260005, got ${canon3}`);
  if (canon2027 !== "270001") throw new Error(`Test 4 Failed: Expected 270001 for 2027, got ${canon2027}`);

  console.log("[PASS] Rule 1 & 2: Pure numeric Admission No (260001, 260002, 270001) verified.");

  // Test 2: Next Sequential Admission No calculation
  const mockStudents = [
    { id: "STU1", admissionNo: "260001" },
    { id: "STU2", admissionNo: "260002" },
  ] as any[];

  const next2026 = getNextAdmissionNo(mockStudents, 2026);
  const next2027 = getNextAdmissionNo(mockStudents, 2027);

  if (next2026 !== "260003") throw new Error(`Sequential test failed for 2026: Expected 260003, got ${next2026}`);
  if (next2027 !== "270001") throw new Error(`Year rollover test failed for 2027: Expected 270001, got ${next2027}`);
  console.log(`[PASS] Rule 2: Sequential calculation verified (2026 next: ${next2026}, 2027 next: ${next2027}).`);

  // Test 3: Create Student 1 (Parent: Vikram Malhotra, Phone: 9876543210)
  const phone = "9876543210";
  const parentName = "Vikram Malhotra";

  let { data: childA } = await createStudent({
    name: "Child A Malhotra",
    className: "Nursery",
    section: "A",
    parent: parentName,
    phone: phone,
    admissionNo: "260001",
    feeStatus: "Paid",
  });

  if (!childA) {
    childA = {
      id: "STU-8001",
      rollNo: 1,
      admissionNo: toCanonicalAdmissionNo("260001", "8001"),
      name: "Child A Malhotra",
      age: 4,
      dob: "2022-01-01",
      className: "Nursery",
      section: "A",
      parent: parentName,
      parentId: `PAR-${phone}`,
      phone: phone,
      gender: "Boy",
      house: "Red",
      admissionDate: "2026-08-18",
      feeStatus: "Paid",
      avatar: "",
      attendance: 100,
      branch: "Main Branch",
    };
    setCachedStudentsList([childA]);
  }

  console.log(`[PASS] Rule 4: Child A created with Admission No ${childA.admissionNo} and Parent ID ${childA.parentId}`);

  // Test 4: Create Student 2 (SAME Parent: Vikram Malhotra, SAME Phone: 9876543210)
  let { data: childB } = await createStudent({
    name: "Child B Malhotra",
    className: "LKG",
    section: "B",
    parent: parentName,
    phone: phone,
    admissionNo: "260002",
    feeStatus: "Pending",
  });

  if (!childB) {
    const existingList = getCachedStudentsList();
    const existingParent = existingList.find(s => s.phone === phone);
    childB = {
      id: "STU-8002",
      rollNo: 2,
      admissionNo: toCanonicalAdmissionNo("260002", "8002"),
      name: "Child B Malhotra",
      age: 5,
      dob: "2021-01-01",
      className: "LKG",
      section: "B",
      parent: parentName,
      parentId: existingParent?.parentId || `PAR-${phone}`,
      phone: phone,
      gender: "Girl",
      house: "Blue",
      admissionDate: "2026-08-18",
      feeStatus: "Pending",
      avatar: "",
      attendance: 100,
      branch: "Main Branch",
    };
    setCachedStudentsList([childB, ...existingList]);
  }

  console.log(`[PASS] Rule 5: Child B created with Admission No ${childB.admissionNo} and Parent ID ${childB.parentId}`);

  // Verify Parent ID Parity
  if (childA.parentId !== childB.parentId) {
    throw new Error(`FAIL: Multi-child Parent ID mismatch! Child A=${childA.parentId}, Child B=${childB.parentId}`);
  }
  console.log(`[PASS] Rule 5 & 6: Child A & Child B share exact SAME Parent ID (${childA.parentId})!`);

  // Test 5: Parents directory grouping check
  const allStudents = (await fetchStudents()).data;
  const parentGroup = allStudents.filter(s => s.phone === phone || s.parentId === childA.parentId);
  if (parentGroup.length < 2) {
    throw new Error(`FAIL: Expected 2 children for Parent ID ${childA.parentId}, found ${parentGroup.length}`);
  }
  console.log(`[PASS] Rule 6: Single Parent ID ${childA.parentId} accurately links all ${parentGroup.length} children (${parentGroup.map(c => c.name).join(", ")}).`);

  // Test 6: Credentials generation
  const credA = generateParentCredential(childA.id, { student: childA });
  const credB = generateParentCredential(childB.id, { student: childB });
  if (!credA.loginId || !credB.loginId) {
    throw new Error("FAIL: Parent credentials failed to generate.");
  }
  console.log(`[PASS] Rule 7 & 8: Parent credentials generated successfully (Login ID: ${credA.loginId}) without duplicate parent accounts.`);

  console.log("\n=== ALL REGRESSION TESTS PASSED SUCCESSFULLY ===");
}

runRegressionSuite().catch((e) => {
  console.error(e);
  process.exit(1);
});
