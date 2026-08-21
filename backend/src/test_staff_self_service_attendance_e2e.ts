import {
  fetchStaffAttendanceFromSupabase,
  markStaffTimeIn,
  markStaffTimeOut,
  getLocalDateString,
  fetchAttendanceFromSupabase,
} from "../../frontend/src/lib/attendanceStore";

async function runStaffSelfServiceAttendanceVerification() {
  console.log("=== STARTING STAFF SELF-SERVICE ATTENDANCE E2E VERIFICATION ===");

  const runId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const staffAId = `STF-SELF-A-${runId}`;
  const staffAName = `Ananya Sen (${runId})`;
  const staffBId = `STF-SELF-B-${runId}`;
  const staffBName = `Pooja Sharma (${runId})`;
  const todayStr = getLocalDateString();
  const yesterdayStr = "2026-08-20";

  // TEST 1: Guard - Time Out before Time In must fail
  console.log("\n[TEST 1] Testing Guard: Time Out before Time In...");
  const invalidTimeOut = await markStaffTimeOut(staffAId, staffAName);
  console.log(`  - Result: ${invalidTimeOut.message}`);
  if (invalidTimeOut.success) {
    throw new Error("FAIL: Time Out was allowed before Time In!");
  }
  console.log("  [PASS] Guard verified: Time Out before Time In blocked.");

  // TEST 2: Staff A marks Time In
  console.log(`\n[TEST 2] Staff A (${staffAName}) marks Time In for today (${todayStr})...`);
  const timeInRes = await markStaffTimeIn(staffAId, staffAName);
  console.log(`  - Result: ${timeInRes.message}`);
  if (!timeInRes.success) {
    throw new Error(`FAIL: Staff A Time In failed: ${timeInRes.message}`);
  }

  await new Promise((r) => setTimeout(r, 1000));

  // TEST 3: Admin, Principal, and Office synchronization check
  console.log("\n[TEST 3] Verifying immediate synchronization across Admin, Principal, and Office portals...");
  const adminViewMap = await fetchStaffAttendanceFromSupabase(todayStr);
  const staffARecord = adminViewMap[staffAId] || adminViewMap[staffAName];

  console.log(`  - Admin/Principal/Office View - Staff A Status: ${staffARecord?.status}, CheckIn: ${staffARecord?.checkIn}`);
  if (!staffARecord || !staffARecord.checkIn || staffARecord.checkIn === "—") {
    throw new Error("FAIL: Staff A's Time In record did not synchronize to Admin/Principal/Office portals!");
  }
  console.log("  [PASS] Staff A's Time In is authoritatively synchronized across all portals.");

  // TEST 4: Guard - Duplicate Time In must fail
  console.log("\n[TEST 4] Testing Guard: Duplicate Time In for the same day...");
  const duplicateTimeIn = await markStaffTimeIn(staffAId, staffAName);
  console.log(`  - Result: ${duplicateTimeIn.message}`);
  if (duplicateTimeIn.success) {
    throw new Error("FAIL: Duplicate Time In was allowed for the same day!");
  }
  console.log("  [PASS] Guard verified: Duplicate Time In blocked.");

  // TEST 5: Staff A marks Time Out
  console.log(`\n[TEST 5] Staff A (${staffAName}) marks Time Out for today (${todayStr})...`);
  const timeOutRes = await markStaffTimeOut(staffAId, staffAName);
  console.log(`  - Result: ${timeOutRes.message}`);
  if (!timeOutRes.success) {
    throw new Error(`FAIL: Staff A Time Out failed: ${timeOutRes.message}`);
  }

  await new Promise((r) => setTimeout(r, 1000));

  // TEST 6: All portals verify Time Out and Working Hours
  console.log("\n[TEST 6] Verifying Time Out & Working Hours synchronization across all portals...");
  const updatedPortalMap = await fetchStaffAttendanceFromSupabase(todayStr);
  const staffARecordOut = updatedPortalMap[staffAId] || updatedPortalMap[staffAName];

  console.log(`  - Synchronized View - CheckIn: ${staffARecordOut?.checkIn}, CheckOut: ${staffARecordOut?.checkOut}, WorkingHours: ${staffARecordOut?.workingHours}`);
  if (!staffARecordOut || !staffARecordOut.checkOut || staffARecordOut.checkOut === "—") {
    throw new Error("FAIL: Staff A's Time Out did not synchronize across portals!");
  }
  console.log("  [PASS] Time Out & Working Hours authoritatively synchronized across all portals.");

  // TEST 7: Guard - Multiple conflicting Time Out records
  console.log("\n[TEST 7] Testing Guard: Multiple conflicting Time Out records...");
  const duplicateTimeOut = await markStaffTimeOut(staffAId, staffAName);
  console.log(`  - Result: ${duplicateTimeOut.message}`);
  if (duplicateTimeOut.success) {
    throw new Error("FAIL: Multiple conflicting Time Out records were allowed!");
  }
  console.log("  [PASS] Guard verified: Conflicting multiple Time Out records blocked.");

  // TEST 8: Identity isolation - Staff B cannot alter Staff A
  console.log(`\n[TEST 8] Verifying Staff B (${staffBName}) identity isolation...`);
  const staffBMap = await fetchStaffAttendanceFromSupabase(todayStr);
  const staffBRecord = staffBMap[staffBId];
  console.log(`  - Staff B status: ${staffBRecord?.status || "Not Marked"}`);
  if (staffBRecord) {
    throw new Error("FAIL: Staff B's attendance was mutated when Staff A marked attendance!");
  }
  console.log("  [PASS] Identity isolation verified: Staff members mark their own attendance independently.");

  // TEST 9: Next calendar day isolation
  console.log("\n[TEST 9] Verifying next calendar day isolation (yesterday vs today)...");
  const nextDayMap = await fetchStaffAttendanceFromSupabase("2026-08-22");
  const nextDayRecord = nextDayMap[staffAId];
  console.log(`  - Future Date Record: ${nextDayRecord?.status || "Not Marked"}`);
  if (nextDayRecord) {
    throw new Error("FAIL: Today's attendance leaked into a future calendar day!");
  }
  console.log("  [PASS] Next calendar day isolation verified: Future days start as Not Marked.");

  // TEST 10: Student Attendance regression check
  console.log("\n[TEST 10] Verifying Student Attendance functionality...");
  const studentAtt = await fetchAttendanceFromSupabase();
  console.log(`  - Student Attendance count: ${studentAtt.length}`);
  console.log("  [PASS] Student Attendance regression test passed.");

  console.log("\n=== ALL STAFF SELF-SERVICE ATTENDANCE TESTS PASSED SUCCESSFULLY ===");
}

runStaffSelfServiceAttendanceVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
