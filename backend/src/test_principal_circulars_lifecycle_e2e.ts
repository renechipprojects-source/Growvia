import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { createCircular, fetchCirculars, deleteCircular } from "../../frontend/src/lib/supabaseService";
import { isCircularTargetedToRole } from "../../frontend/src/lib/circularReadStore";
import { NotificationService, listForRole, type Role } from "../../frontend/src/lib/notifications";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runPrincipalCircularsLifecycleSuite() {
  console.log("=== STARTING PRINCIPAL CIRCULARS COMPLETE LIFECYCLE E2E SUITE ===");

  const timestamp = Date.now();
  const testId = `COM-CIRC-TEST-${timestamp.toString().slice(-6)}`;
  const testTitle = `Annual Sports Day & PTM Circular ${timestamp.toString().slice(-4)}`;
  const testSubject = `Sports Schedule & Parent Interaction`;
  const testDescription = `Annual Sports Day will be held on 25th of this month. All teachers, office staff, and parents must attend.`;
  const testRecipients = ["Admin", "Teachers", "Office Staff", "Parents"];

  // 1. Principal creates circular
  console.log("\n[STEP 1] Principal creates circular...");
  const createRes = await createCircular({
    id: testId,
    title: testTitle,
    subject: testSubject,
    description: testDescription,
    priority: "High",
    publishDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    recipients: testRecipients,
    status: "Published",
    senderId: "PRINCIPAL001",
    author: "Principal Office",
  });

  if (createRes.error) {
    throw new Error(`FAIL: createCircular returned error: ${createRes.error}`);
  }
  console.log("  [PASS] createCircular returned success. Stored ID:", createRes.data?.id || testId);

  // 2. Verify Circular reaches Supabase gv_communications
  console.log("\n[STEP 2] Verifying record in Supabase gv_communications...");
  const { data: dbRows, error: dbErr } = await adminSupabase
    .from("gv_communications")
    .select("*")
    .eq("id", testId);

  if (dbErr || !dbRows || dbRows.length === 0) {
    throw new Error(`FAIL: Circular record not found in Supabase gv_communications table. Error: ${dbErr?.message}`);
  }
  const dbRow = dbRows[0];
  console.log("  [PASS] gv_communications row confirmed:", {
    id: dbRow.id,
    title: dbRow.title,
    recipient_role: dbRow.recipient_role,
    message_type: dbRow.message_type,
  });

  // 3. Verify correct target audience is stored
  console.log("\n[STEP 3] Verifying stored target audience...");
  const expectedAudience = testRecipients.join(",");
  if (dbRow.recipient_role !== expectedAudience) {
    throw new Error(`FAIL: Expected recipient_role '${expectedAudience}', got '${dbRow.recipient_role}'`);
  }
  console.log("  [PASS] Target audience correctly stored as:", dbRow.recipient_role);

  // 4. Admin retrieves it
  console.log("\n[STEP 4] Admin retrieves circulars...");
  const { data: adminList } = await fetchCirculars();
  const adminFound = adminList.find((c) => c.id === testId || c.title === testTitle);
  if (!adminFound) {
    throw new Error("FAIL: Admin fetchCirculars() could not find the newly created circular.");
  }
  const isAdminTargeted = isCircularTargetedToRole(adminFound, "admin");
  if (!isAdminTargeted) {
    throw new Error("FAIL: Circular is not targeted to Admin role.");
  }
  console.log("  [PASS] Admin retrieved circular successfully.");

  // 5. Principal retrieves it
  console.log("\n[STEP 5] Principal retrieves circulars...");
  const principalFound = adminList.find((c) => c.id === testId);
  if (!principalFound) {
    throw new Error("FAIL: Principal could not retrieve the circular.");
  }
  const isPrincipalTargeted = isCircularTargetedToRole(principalFound, "principal");
  if (!isPrincipalTargeted) {
    throw new Error("FAIL: Circular is not targeted to Principal role.");
  }
  console.log("  [PASS] Principal retrieved circular successfully.");

  // 6. Refresh / re-fetch retains it
  console.log("\n[STEP 6] Simulating page refresh & re-fetch...");
  const { data: refreshedList } = await fetchCirculars();
  const retainedItem = refreshedList.find((c) => c.id === testId);
  if (!retainedItem) {
    throw new Error("FAIL: Circular lost after re-fetch.");
  }
  console.log("  [PASS] Circular successfully retained after refresh with title:", retainedItem.title);

  // 7. Notification is generated correctly
  console.log("\n[STEP 7] Verifying NotificationService circular generation...");
  const targetRoles: Role[] = ["parent", "teacher", "office", "principal", "super-admin"];
  NotificationService.circularPublished(testTitle, targetRoles);

  const notifications = listForRole("parent");
  const matchingNotif = notifications.find((n) => n.title.includes(testTitle) || n.description.includes(testTitle));
  if (!matchingNotif) {
    throw new Error("FAIL: Notification for circular not found in notifications list.");
  }
  console.log("  [PASS] Notification generated successfully:", matchingNotif.title);

  // Cleanup
  console.log("\n[CLEANUP] Removing test circular...");
  await deleteCircular(testId);
  await adminSupabase.from("gv_communications").delete().eq("id", testId);
  console.log("  [PASS] Cleanup complete.");

  console.log("\n=== ALL PRINCIPAL CIRCULARS LIFECYCLE TESTS PASSED ===");
}

runPrincipalCircularsLifecycleSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
