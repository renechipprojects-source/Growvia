import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { notify, markRead, syncLiveDatabaseNotifications, NotificationService, listForRole } from "../../frontend/src/lib/notifications";
import { createCircular, deleteCircular } from "../../frontend/src/lib/supabaseService";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runCircularNotificationReadPersistenceE2E() {
  console.log("==================================================================================");
  console.log("📰 CIRCULAR NOTIFICATION READ PERSISTENCE E2E TEST SUITE");
  console.log("==================================================================================");

  const timestamp = Date.now();
  const testTitle = `Read Persistence Circular ${timestamp.toString().slice(-4)}`;
  const testId = `COM-CIRC-PER-${timestamp.toString().slice(-4)}`;

  // 1. Create circular
  console.log(`\n[STEP 1] Creating published circular '${testTitle}'...`);
  const createRes = await createCircular({
    id: testId,
    title: testTitle,
    subject: "Persistence Audit Notice",
    description: "Testing notification read state persistence across refresh & DB sync.",
    priority: "High",
    publishDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2026-12-31",
    recipients: ["Parents", "Teachers", "Office Staff", "Admin"],
    status: "Published",
  });

  if (createRes.error) {
    console.error("  ✗ createCircular failed:", createRes.error);
    process.exit(1);
  }
  console.log("  ✓ Circular created in Supabase `gv_communications`");

  // 2. Create/resolve notification
  console.log("\n[STEP 2] Creating notification via NotificationService.circularPublished...");
  NotificationService.circularPublished(testTitle);

  const notifId = `n-cir-${testTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  console.log(`  ✓ Notification issued with ID: ${notifId}`);

  // 3. Verify notification unread BEFORE click
  const notifsBefore = listForRole("parent");
  const itemBefore = notifsBefore.find((n) => n.id === notifId || n.title.includes(testTitle));
  
  console.log("\n[STEP 3] Verifying notification unread before click...");
  console.log("  - UI Read state:", itemBefore?.read);
  if (itemBefore?.read === true) {
    console.error("  ✗ Notification was unexpectedly initialized as read!");
    process.exit(1);
  }
  console.log("  ✓ Notification initially verified UNREAD (read = false).");

  // 4. Mark notification read
  console.log(`\n[STEP 4] Calling markRead('${itemBefore?.id || notifId}')...`);
  const targetId = itemBefore?.id || notifId;
  markRead(targetId);
  await new Promise((r) => setTimeout(r, 800));

  // 5. Read database
  console.log("\n[STEP 5] Reading database record from `gv_requests`...");
  const dbReqId = `notif_${targetId}`;
  const { data: dbRows, error: dbErr } = await adminSupabase
    .from("gv_requests")
    .select("*")
    .or(`id.eq.${dbReqId},id.eq.${targetId}`);

  if (dbErr) {
    console.error("  ✗ Database query failed:", dbErr.message);
    process.exit(1);
  }

  let dbParsedRead: boolean | null = null;
  if (dbRows && dbRows.length > 0) {
    try {
      const parsed = JSON.parse(dbRows[0].reason_or_notes);
      dbParsedRead = parsed.read;
    } catch {}
  }

  console.log("  ✓ Database record fetched:", {
    id: dbRows?.[0]?.id,
    request_type: dbRows?.[0]?.request_type,
    persistedRead: dbParsedRead,
  });

  // 6. Verify persisted read state
  console.log("\n[STEP 6] Verifying persisted read state in Supabase...");
  if (dbParsedRead !== true) {
    console.error("  ✗ Database record does NOT contain persisted read = true!");
    process.exit(1);
  }
  console.log("  ✓ Database authoritative persistence VERIFIED (read = true in `gv_requests`).");

  // 7. Re-fetch notifications
  console.log("\n[STEP 7] Re-fetching local notifications...");
  const notifsAfterMark = listForRole("parent");
  const itemAfterMark = notifsAfterMark.find((n) => n.id === targetId || n.id === notifId);

  // 8. Verify still read
  console.log("\n[STEP 8] Verifying notification is still read after re-fetch...");
  if (itemAfterMark?.read !== true) {
    console.error("  ✗ Notification read state reverted to false in memory!");
    process.exit(1);
  }
  console.log("  ✓ Notification read state verified READ (read = true).");

  // 9. Simulate realtime refresh
  console.log("\n[STEP 9] Simulating background database sync (syncLiveDatabaseNotifications)...");
  syncLiveDatabaseNotifications();
  await new Promise((r) => setTimeout(r, 1000));

  // 10. Verify still read after realtime sync
  console.log("\n[STEP 10] Verifying notification remains read after realtime sync...");
  const notifsAfterSync = listForRole("parent");
  const itemAfterSync = notifsAfterSync.find((n) => n.id === targetId || n.id === notifId);

  if (itemAfterSync?.read !== true) {
    console.error("  ✗ Notification read state was OVERWRITTEN to unread by background sync!");
    process.exit(1);
  }
  console.log("  ✓ Notification PERMANENTLY REMAINS READ after realtime DB sync!");

  // 11. Cleanup
  console.log("\n[STEP 11] Cleaning up test records...");
  await deleteCircular(testId);
  await adminSupabase.from("gv_communications").delete().eq("id", testId);
  await adminSupabase.from("gv_requests").delete().or(`id.eq.${dbReqId},id.eq.${targetId}`);
  console.log("  ✓ Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 CIRCULAR NOTIFICATION READ PERSISTENCE E2E RESULT: PASS (All 11 Steps Verified)");
  console.log("==================================================================================");
}

runCircularNotificationReadPersistenceE2E().catch((err) => {
  console.error("Persistence test exception:", err);
  process.exit(1);
});
