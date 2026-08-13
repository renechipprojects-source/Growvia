import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inspectCirculars() {
  console.log("==========================================================");
  console.log("🔍 FORENSIC BUG 1 INSPECTION: gv_communications RECORDS");
  console.log("==========================================================");

  const { data: allComms, error: errAll } = await adminSupabase
    .from("gv_communications")
    .select("*");

  console.log(`Total gv_communications records: ${allComms?.length || 0}`);
  if (errAll) console.error("Error fetching gv_communications:", errAll.message);

  const circulars = (allComms || []).filter(r => r.message_type === "circular");
  console.log(`Records with message_type = 'circular': ${circulars.length}`);

  if (allComms && allComms.length > 0) {
    console.log("\nSample records from gv_communications:");
    allComms.slice(0, 5).forEach((r, idx) => {
      console.log(`--- Record ${idx + 1} ---`);
      console.log({
        id: r.id,
        message_type: r.message_type,
        title: r.title,
        body: r.body?.slice(0, 100),
        sender_role: r.sender_role,
        recipient_role: r.recipient_role,
        published_at: r.published_at,
        created_at: r.created_at,
      });
    });
  }

  // Also test createCircular simulation
  const now = Date.now();
  const testId = `COM-CIRC-FORENSIC-${now.toString().slice(-4)}`;
  const meta = {
    subject: "Forensic Circular Subject",
    description: "Forensic Circular Description Content",
    priority: "High",
    recipients: ["Parents", "Teachers", "Office Staff"],
    status: "Published",
  };

  const payload = {
    id: testId,
    message_type: "circular",
    title: "Forensic Test Circular",
    body: JSON.stringify(meta),
    sender_id: "PRINCIPAL001",
    sender_name: "Principal Office",
    sender_role: "principal",
    recipient_role: "Parents,Teachers,Office Staff",
    priority: "High",
    published_at: new Date().toISOString(),
  };

  console.log("\n[TEST INSERT] Inserting test circular payload...");
  const { data: insData, error: insErr } = await adminSupabase
    .from("gv_communications")
    .upsert([payload], { onConflict: "id" })
    .select();

  if (insErr) {
    console.error("  ✗ Test Insert Failed:", insErr.message);
  } else {
    console.log("  ✓ Test Insert Succeeded:", insData?.[0]?.id);
  }

  // Now query fetchCirculars pattern
  const { data: fetched, error: fetchErr } = await adminSupabase
    .from("gv_communications")
    .select("*")
    .eq("message_type", "circular");

  console.log(`\nQuery .select('*').eq('message_type', 'circular') returned ${fetched?.length || 0} rows.`);
  if (fetched && fetched.length > 0) {
    fetched.forEach((f) => {
      console.log(`- ID: ${f.id}, Title: ${f.title}, message_type: ${f.message_type}, body: ${f.body}`);
    });
  }

  // Cleanup test record
  await adminSupabase.from("gv_communications").delete().eq("id", testId);
}

inspectCirculars().catch(console.error);
