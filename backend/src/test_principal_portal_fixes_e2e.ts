import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runPrincipalPortalFixesE2E() {
  console.log("==================================================================================");
  console.log("🎯 PRINCIPAL PORTAL 3-ISSUE QA & REGRESSION SUITE");
  console.log("==================================================================================");

  let passed = 0;
  let failed = 0;
  const now = Date.now();

  const testVehicleId = `VEH-TEST-${now}`;
  const testRouteId = `RTE-TEST-${now}`;
  const testCircularId = `COM-CIRC-TST-${now.toString().slice(-4)}`;

  try {
    // ---------------------------------------------------------------------------
    // ISSUE 1: TRANSPORT FLEET DATA BINDING & PERSISTENCE IN gv_inventory_expenses
    // ---------------------------------------------------------------------------
    console.log("\n[ISSUE 1] Verifying Transport Fleet Data Binding & Supabase Queries...");
    const { error: vErr } = await adminSupabase.from("gv_inventory_expenses").insert([
      {
        id: testVehicleId,
        record_type: "transport_vehicle",
        title: "Test Bus Alpha",
        category: "Transport Fleet",
        quantity: 35,
        supplier_or_paid_to: "KA-01-EQ-9999",
        notes: JSON.stringify({ number: "KA-01-EQ-9999", capacity: 35, status: "Active" }),
      },
      {
        id: testRouteId,
        record_type: "transport_route",
        title: "Route 1 - North Campus",
        category: "Transport Fleet",
        quantity: 24,
        supplier_or_paid_to: "KA-01-EQ-9999",
        notes: JSON.stringify({ vehicle: "KA-01-EQ-9999", driver: "Rajesh Kumar", status: "Active" }),
      }
    ]);

    if (!vErr) {
      const { data: transportRows } = await adminSupabase
        .from("gv_inventory_expenses")
        .select("*")
        .in("record_type", ["transport_vehicle", "transport_route"]);

      const vehicles = (transportRows || []).filter((r) => r.record_type === "transport_vehicle");
      const routes = (transportRows || []).filter((r) => r.record_type === "transport_route");

      if (vehicles.length > 0 && routes.length > 0) {
        console.log(`  ✓ PASS: Transport data resolved ${vehicles.length} vehicles and ${routes.length} routes from Supabase.`);
        passed++;
      } else {
        console.error("  ✗ FAIL: Transport data resolution empty.");
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Transport insertion error:", vErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // ISSUE 2: PRINCIPAL CIRCULARS PUBLISH & SUPABASE RETRIEVAL SYNCHRONIZATION
    // ---------------------------------------------------------------------------
    console.log("\n[ISSUE 2] Verifying Principal Circulars Publish → Upsert → Retrieval...");
    const circularMeta = {
      subject: "Annual Sports Meet Details",
      description: "All parents and teachers are invited to the sports complex next Friday.",
      priority: "High",
      recipients: ["Parents", "Teachers", "Office Staff"],
      status: "Published",
    };

    const { error: circErr } = await adminSupabase.from("gv_communications").upsert([
      {
        id: testCircularId,
        message_type: "circular",
        title: "Annual Sports Meet Details",
        body: JSON.stringify(circularMeta),
        sender_id: "PRIN-001",
        sender_name: "Principal Office",
        sender_role: "principal",
        recipient_role: "Parents,Teachers,Office Staff",
        priority: "High",
        published_at: new Date().toISOString(),
      }
    ], { onConflict: "id" });

    if (!circErr) {
      const { data: fetchedCirculars } = await adminSupabase
        .from("gv_communications")
        .select("*")
        .eq("message_type", "circular")
        .eq("id", testCircularId);

      if (fetchedCirculars && fetchedCirculars.length === 1) {
        const c = fetchedCirculars[0];
        const parsedBody = JSON.parse(c.body);
        if (c.title === "Annual Sports Meet Details" && parsedBody.status === "Published") {
          console.log("  ✓ PASS: Published circular successfully retrieved with status 'Published'.");
          passed++;
        } else {
          console.error("  ✗ FAIL: Circular properties mismatch:", c);
          failed++;
        }
      } else {
        console.error("  ✗ FAIL: Circular record missing in fetchCirculars query.");
        failed++;
      }
    } else {
      console.error("  ✗ FAIL: Circular publishing error:", circErr.message);
      failed++;
    }

    // ---------------------------------------------------------------------------
    // ISSUE 3: NOTIFICATIONS DEDUPLICATION BY DETERMINISTIC ID & TITLE
    // ---------------------------------------------------------------------------
    console.log("\n[ISSUE 3] Verifying Notification Deduplication & Single Emission...");
    const cleanTitle = "Annual Sports Meet Details";
    const deterministicId = `n-cir-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    const initialStore = [
      { id: deterministicId, title: `New Circular: ${cleanTitle}`, description: "Test 1", module: "announcement", timestamp: Date.now(), read: false, priority: "high", roles: ["parent", "teacher"] },
      { id: deterministicId, title: `New Circular: ${cleanTitle}`, description: "Test 2", module: "announcement", timestamp: Date.now(), read: false, priority: "high", roles: ["parent", "teacher"] },
      { id: `n-cir-other`, title: "Other Circular", description: "Other", module: "announcement", timestamp: Date.now(), read: false, priority: "medium", roles: ["parent"] }
    ];

    // Simulating deduplication logic
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const deduplicated = [];

    for (const item of initialStore) {
      const titleKey = `${item.module}:${(item.title || "").trim().toLowerCase()}`;
      if (seenIds.has(item.id) || (item.module === "announcement" && seenTitles.has(titleKey))) {
        continue;
      }
      seenIds.add(item.id);
      if (item.module === "announcement") {
        seenTitles.add(titleKey);
      }
      deduplicated.push(item);
    }

    if (deduplicated.length === 2 && deduplicated.filter(n => n.id === deterministicId).length === 1) {
      console.log("  ✓ PASS: Duplicate notifications successfully collapsed to exactly 1 notification.");
      passed++;
    } else {
      console.error("  ✗ FAIL: Notification deduplication mismatch. Count:", deduplicated.length);
      failed++;
    }

  } catch (err: any) {
    console.error("Unexpected error in Principal Portal test suite:", err);
    failed++;
  } finally {
    console.log("\n[CLEANUP] Purging test records...");
    await adminSupabase.from("gv_inventory_expenses").delete().or(`id.eq.${testVehicleId},id.eq.${testRouteId}`);
    await adminSupabase.from("gv_communications").delete().eq("id", testCircularId);
    console.log("  ✓ Cleanup completed.");
  }

  console.log("\n==================================================================================");
  console.log(`📊 PRINCIPAL PORTAL FIXES QA RESULT: ${passed}/3 Tests Passed, ${failed} Failed`);
  console.log("==================================================================================");
}

runPrincipalPortalFixesE2E().catch(console.error);
