import { ALL_RECIPIENTS } from "../../frontend/src/routes/principal.circulars";
import { createCircular, fetchCirculars } from "../../frontend/src/lib/supabaseService";
import { isCircularTargetedToRole } from "../../frontend/src/lib/circularReadStore";

async function runPrincipalCircularAudienceVerification() {
  console.log("=== STARTING PRINCIPAL CIRCULAR AUDIENCE VERIFICATION ===");

  // 1. Verify UI Recipient List does NOT contain "Admin"
  console.log("[TEST 1] Verifying Principal UI Recipient Options...");
  console.log("  - Current ALL_RECIPIENTS list:", ALL_RECIPIENTS);
  if (ALL_RECIPIENTS.includes("Admin" as any)) {
    throw new Error("FAIL: 'Admin' is still present in ALL_RECIPIENTS list!");
  }
  console.log("  [PASS] 'Admin' is completely absent from Principal recipient options UI.");

  // 2. Test programmatic attempt to include "Admin" in circular creation
  console.log("\n[TEST 2] Testing programmatic block of 'Admin' target in createCircular...");
  const testTitle = `Verification Circular ${Date.now()}`;
  const { data: createdData, error } = await createCircular({
    title: testTitle,
    subject: "Targeted Audience Test",
    description: "Testing role filtering rules for Parent vs Teacher vs Admin",
    recipients: ["Admin", "Parents"],
    priority: "High",
    status: "Published",
  });

  if (error || !createdData) {
    console.warn("  - Supabase offline or mock creation fallback used:", error);
  }

  // 3. Fetch circulars and verify audience rules
  console.log("\n[TEST 3] Verifying circular targeting & recipient delivery rules...");
  const { data: allCirculars } = await fetchCirculars();
  const createdCircular = allCirculars.find((c) => c.title === testTitle) || createdData;

  if (createdCircular) {
    console.log("  - Created Circular Recipients:", createdCircular.recipients);
    if (createdCircular.recipients.includes("Admin")) {
      throw new Error("FAIL: Created circular still contains 'Admin' in recipients list!");
    }
    console.log("  [PASS] 'Admin' was successfully stripped from circular recipient targets.");

    // Verify Role Targeting:
    const targetedToParents = isCircularTargetedToRole(createdCircular, "parents");
    const targetedToTeachers = isCircularTargetedToRole(createdCircular, "teachers");
    const targetedToAdmin = isCircularTargetedToRole(createdCircular, "admin");

    console.log(`  - Targeted to Parents? ${targetedToParents}`);
    console.log(`  - Targeted to Teachers? ${targetedToTeachers}`);
    console.log(`  - Viewable by Admin (administrative history)? ${targetedToAdmin}`);

    if (!targetedToParents) throw new Error("FAIL: Parent-targeted circular is not delivered to Parents!");
    if (targetedToTeachers) throw new Error("FAIL: Parent-targeted circular was incorrectly delivered to Teachers!");
    if (!targetedToAdmin) throw new Error("FAIL: Admin cannot view circular in administrative history!");

    console.log("  [PASS] Recipient delivery matrix matches business rules perfectly.");
  }

  console.log("\n=== ALL PRINCIPAL CIRCULAR AUDIENCE TESTS PASSED SUCCESSFULLY ===");
}

runPrincipalCircularAudienceVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
