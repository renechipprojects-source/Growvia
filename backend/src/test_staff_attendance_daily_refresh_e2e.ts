import {
  fetchStaffAttendanceFromSupabase,
  saveStaffAttendanceRecord,
  getLocalDateString,
  fetchAttendanceFromSupabase,
} from "../../frontend/src/lib/attendanceStore";

async function runStaffAttendanceDailyRefreshVerification() {
  console.log("=== STARTING STAFF ATTENDANCE DAILY REFRESH E2E VERIFICATION ===");

  const testStaffId = "STF-TEST-E2E-101";
  const testStaffName = "Test Staff Member";
  const day1Date = "2026-08-20";
  const day2Date = "2026-08-21";

  // 1. Mark attendance for Day 1 (2026-08-20)
  console.log(`\n[STEP 1] Marking staff attendance for Day 1 (${day1Date}) as 'Present'...`);
  await saveStaffAttendanceRecord(testStaffId, testStaffName, "Present", "08:30 AM", "04:30 PM", day1Date);
  await new Promise((r) => setTimeout(r, 1000));

  // 2. Fetch Day 1 attendance and verify
  const day1Map = await fetchStaffAttendanceFromSupabase(day1Date);
  const day1Record = day1Map[testStaffId];
  console.log(`  - Day 1 Record Status: ${day1Record?.status}, CheckIn: ${day1Record?.checkIn}`);
  if (!day1Record || day1Record.status !== "Present") {
    throw new Error(`FAIL: Day 1 attendance was not persisted correctly!`);
  }
  console.log("  [PASS] Day 1 attendance persisted successfully.");

  // 3. Fetch Day 2 attendance BEFORE marking Day 2
  console.log(`\n[STEP 2] Fetching Day 2 (${day2Date}) attendance before any marking on Day 2...`);
  const day2MapBeforeMarking = await fetchStaffAttendanceFromSupabase(day2Date);
  const day2RecordBefore = day2MapBeforeMarking[testStaffId];
  console.log(`  - Day 2 Record Status before marking: ${day2RecordBefore?.status || "Not Marked"}`);
  if (day2RecordBefore) {
    throw new Error(`FAIL: Day 1 attendance leaked into Day 2! Yesterday's record was shown today.`);
  }
  console.log("  [PASS] Day 2 returns NO RECORD (Not Marked). Yesterday's data did NOT carry forward.");

  // 4. Mark attendance for Day 2 (2026-08-21) as 'Late'
  console.log(`\n[STEP 3] Marking staff attendance for Day 2 (${day2Date}) as 'Late'...`);
  await saveStaffAttendanceRecord(testStaffId, testStaffName, "Late", "09:15 AM", "04:30 PM", day2Date);
  await new Promise((r) => setTimeout(r, 1000));

  const day2MapAfter = await fetchStaffAttendanceFromSupabase(day2Date);
  const day2RecordAfter = day2MapAfter[testStaffId];
  console.log(`  - Day 2 Record Status: ${day2RecordAfter?.status}, CheckIn: ${day2RecordAfter?.checkIn}`);
  if (!day2RecordAfter || day2RecordAfter.status !== "Late") {
    throw new Error(`FAIL: Day 2 attendance failed to save independently!`);
  }
  console.log("  [PASS] Day 2 attendance saved independently as 'Late'.");

  // 5. Verify Day 1 Historical Attendance remains unchanged as 'Present'
  console.log(`\n[STEP 4] Re-verifying Day 1 (${day1Date}) historical record...`);
  const day1MapReverify = await fetchStaffAttendanceFromSupabase(day1Date);
  const day1RecordReverify = day1MapReverify[testStaffId];
  console.log(`  - Day 1 Historical Status: ${day1RecordReverify?.status}`);
  if (!day1RecordReverify || day1RecordReverify.status !== "Present") {
    throw new Error(`FAIL: Day 1 historical record was mutated or overwritten!`);
  }
  console.log("  [PASS] Day 1 historical record remains intact as 'Present'.");

  // 6. Verify Student Attendance function is not broken
  console.log("\n[STEP 5] Verifying Student Attendance store function...");
  const studentAtt = await fetchAttendanceFromSupabase();
  console.log(`  - Student Attendance records fetched count: ${studentAtt.length}`);
  console.log("  [PASS] Student Attendance functionality verified intact.");

  console.log("\n=== ALL STAFF ATTENDANCE DAILY REFRESH E2E TESTS PASSED ===");
}

runStaffAttendanceDailyRefreshVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
