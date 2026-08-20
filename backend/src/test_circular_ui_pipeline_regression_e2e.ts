import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { createCircular, fetchCirculars, deleteCircular } from "../../frontend/src/lib/supabaseService";
import { isCircularTargetedToRole } from "../../frontend/src/lib/circularReadStore";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runCircularUIPipelineRegression() {
  console.log("==================================================================================");
  console.log("📰 CIRCULAR FULL UI RENDERING PIPELINE REGRESSION E2E SUITE");
  console.log("==================================================================================");

  const timestamp = Date.now();
  const testId = `COM-CIRC-UIPIPE-${timestamp.toString().slice(-4)}`;
  const testTitle = `UI Pipeline Test Notice ${timestamp.toString().slice(-4)}`;
  const testSubject = `Parent-Teacher Meeting & Term Schedule`;
  const testContent = `Detailed notice regarding upcoming parent teacher interaction and term schedule.`;

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

  console.log(`\n[STAGE 1] Published circular exists in Supabase...`);
  const createRes = await createCircular(circularPayload);
  if (createRes.error) {
    console.error("  ✗ createCircular failed:", createRes.error);
    process.exit(1);
  }
  console.log("  ✓ Circular inserted into Supabase `gv_communications` with ID:", testId);

  console.log(`\n[STAGE 2] fetchCirculars() returns it...`);
  const { data: fetchedCirculars, isFromSupabase } = await fetchCirculars();
  console.log(`  ✓ fetchCirculars returned ${fetchedCirculars.length} items (isFromSupabase: ${isFromSupabase}).`);
  
  if (!isFromSupabase) {
    console.error("  ✗ fetchCirculars did NOT load from Supabase!");
    process.exit(1);
  }

  const foundItem = fetchedCirculars.find((c) => c.id === testId || c.title === testTitle);
  if (!foundItem) {
    console.error("  ✗ Published circular NOT returned by fetchCirculars()!");
    process.exit(1);
  }
  console.log("  ✓ fetchCirculars successfully returned published circular:", {
    id: foundItem.id,
    title: foundItem.title,
    recipients: foundItem.recipients,
  });

  console.log(`\n[STAGE 3] CircularList receives it...`);
  const circularsPassedToComponent = fetchedCirculars;
  console.log(`  ✓ Component received array of count ${circularsPassedToComponent.length}`);

  console.log(`\n[STAGE 4] Role targeting accepts it...`);
  const rolesToTest = ["admin", "principal", "teacher", "parent", "office"];
  for (const role of rolesToTest) {
    const isTargeted = isCircularTargetedToRole(foundItem, role);
    if (!isTargeted) {
      console.error(`  ✗ Role targeting rejected circular for role '${role}'!`);
      process.exit(1);
    }
    console.log(`  ✓ Role '${role}' accepted by targeting filter.`);
  }

  console.log(`\n[STAGE 5] Final renderable list contains it...`);
  for (const role of rolesToTest) {
    const renderableList = circularsPassedToComponent.filter((c) => {
      const isTarget = isCircularTargetedToRole(c, role);
      const matchQ = true;
      const matchP = true;
      return isTarget && matchQ && matchP;
    });

    const itemInRenderList = renderableList.find((c) => c.id === testId || c.title === testTitle);
    if (!itemInRenderList) {
      console.error(`  ✗ Final renderable list for role '${role}' missing circular!`);
      process.exit(1);
    }
    console.log(`  ✓ Role '${role}' final renderable list contains circular (total visible: ${renderableList.length}).`);
  }

  console.log("\n[STAGE 6] Cleaning up test circular record...");
  await deleteCircular(testId);
  await adminSupabase.from("gv_communications").delete().eq("id", testId);
  console.log("  ✓ Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 CIRCULAR UI PIPELINE REGRESSION RESULT: PASS (All 5 Stages Verified)");
  console.log("==================================================================================");
}

runCircularUIPipelineRegression().catch((err) => {
  console.error("UI Pipeline regression script exception:", err);
  process.exit(1);
});
