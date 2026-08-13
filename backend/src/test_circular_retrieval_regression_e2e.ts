import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { createCircular, fetchCirculars, deleteCircular } from "../../frontend/src/lib/supabaseService";
import { isCircularTargetedToRole } from "../../frontend/src/lib/circularReadStore";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runCircularRetrievalRegression() {
  console.log("==================================================================================");
  console.log("📰 CIRCULAR CREATION, PERSISTENCE & MULTI-ROLE PAGE RETRIEVAL REGRESSION E2E SUITE");
  console.log("==================================================================================");

  const timestamp = Date.now();
  const testId = `COM-CIRC-REGRESS-${timestamp.toString().slice(-4)}`;
  const testTitle = `Forensic Exam & Holiday Notice ${timestamp.toString().slice(-4)}`;
  const testSubject = `Term Examination & Holiday Schedule`;
  const testContent = `The school will conduct term exams starting next Monday followed by a holiday.`;

  const circularPayload = {
    id: testId,
    title: testTitle,
    subject: testSubject,
    description: testContent,
    priority: "High",
    publishDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2026-12-31",
    recipients: ["Admin", "Teachers", "Office Staff", "Parents"],
    status: "Published",
    senderId: "PRINCIPAL001",
    author: "Principal Office",
  };

  console.log(`\n[STEP 1] Publishing circular '${testTitle}'...`);
  const createRes = await createCircular(circularPayload);
  if (createRes.error) {
    console.error("  ✗ createCircular failed:", createRes.error);
    process.exit(1);
  }
  console.log("  ✓ createCircular returned success. Inserted ID:", createRes.data?.id || testId);

  console.log("\n[STEP 2] Inspecting Supabase gv_communications table...");
  const { data: dbRows, error: dbErr } = await adminSupabase
    .from("gv_communications")
    .select("*")
    .eq("id", testId);

  if (dbErr || !dbRows || dbRows.length === 0) {
    console.error("  ✗ Direct gv_communications check failed:", dbErr?.message || "Row not found");
    process.exit(1);
  }
  const dbRow = dbRows[0];
  console.log("  ✓ Raw Supabase record verified:");
  console.log({
    id: dbRow.id,
    message_type: dbRow.message_type,
    title: dbRow.title,
    recipient_role: dbRow.recipient_role,
    published_at: dbRow.published_at,
  });

  console.log("\n[STEP 3] Fetching circulars via fetchCirculars() service API...");
  const { data: fetchedCirculars, isFromSupabase } = await fetchCirculars();
  console.log(`  ✓ fetchCirculars returned ${fetchedCirculars.length} items (isFromSupabase: ${isFromSupabase}).`);

  const foundItem = fetchedCirculars.find((c) => c.id === testId || c.title === testTitle);
  if (!foundItem) {
    console.error("  ✗ Published circular NOT returned by fetchCirculars()!");
    process.exit(1);
  }
  console.log("  ✓ Published circular found in fetchCirculars():");
  console.log({
    id: foundItem.id,
    title: foundItem.title,
    recipients: foundItem.recipients,
    status: foundItem.status,
  });

  console.log("\n[STEP 4] Verifying role targeting via isCircularTargetedToRole...");
  const rolesToTest = ["principal", "admin", "teacher", "parent", "office"];
  rolesToTest.forEach((role) => {
    const isTargeted = isCircularTargetedToRole(foundItem, role);
    if (!isTargeted) {
      console.error(`  ✗ Circular failed targeting check for role '${role}'!`);
      process.exit(1);
    }
    console.log(`  ✓ Role '${role}' correctly target-approved.`);
  });

  console.log("\n[STEP 5] Cleaning up test circular record...");
  await deleteCircular(testId);
  await adminSupabase.from("gv_communications").delete().eq("id", testId);
  console.log("  ✓ Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 CIRCULAR RETRIEVAL REGRESSION RESULT: PASS (All 5 Steps Verified)");
  console.log("==================================================================================");
}

runCircularRetrievalRegression().catch((err) => {
  console.error("Regression script exception:", err);
  process.exit(1);
});
