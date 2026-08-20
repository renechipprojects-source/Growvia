import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./backend/.env" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ3NDY1MywiZXhwIjoyMTAxMDUwNjUzfQ.xsa3qLPf8jTe45x5x_-8TyTusbjnMiihtQse4IgjutQ";

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runAdminInventoryActionsLifecycleSuite() {
  console.log("=== STARTING ADMIN INVENTORY ACTIONS & PERSISTENCE E2E SUITE ===");

  const timestamp = Date.now();
  const testId = `IE-INV-TEST-${timestamp.toString().slice(-5)}`;
  const testItemName = `Whiteboard Markers Set ${timestamp.toString().slice(-4)}`;
  const testSku = `SKU-WM-${timestamp.toString().slice(-4)}`;
  const initialQty = 25;
  const restockAddQty = 15;
  const expectedRestockedQty = initialQty + restockAddQty;

  // 1. Create Inventory Item in Supabase gv_inventory_expenses
  console.log("\n[STEP 1] Adding item to institutional inventory...");
  const insertPayload = {
    id: testId,
    record_type: "inventory",
    title: testItemName,
    receipt_ref: testSku,
    category: "General Supplies",
    quantity: initialQty,
    min_stock: 10,
    amount_or_unit_cost: 150,
    unit: "box",
    transaction_date: new Date().toISOString().slice(0, 10),
  };

  const { data: insertData, error: insertErr } = await adminSupabase
    .from("gv_inventory_expenses")
    .insert([insertPayload])
    .select();

  if (insertErr || !insertData || insertData.length === 0) {
    throw new Error(`FAIL: Inserting inventory item failed: ${insertErr?.message}`);
  }
  console.log("  [PASS] Item created in gv_inventory_expenses. ID:", insertData[0].id);

  // 2. Fetch and verify record
  console.log("\n[STEP 2] Fetching item from Supabase...");
  const { data: fetchedRows, error: fetchErr } = await adminSupabase
    .from("gv_inventory_expenses")
    .select("*")
    .eq("id", testId);

  if (fetchErr || !fetchedRows || fetchedRows.length === 0) {
    throw new Error(`FAIL: Fetching created item failed: ${fetchErr?.message}`);
  }
  const item = fetchedRows[0];
  if (item.quantity !== initialQty) {
    throw new Error(`FAIL: Expected quantity ${initialQty}, got ${item.quantity}`);
  }
  console.log("  [PASS] Initial inventory verified:", { title: item.title, quantity: item.quantity });

  // 3. Test Restock Action (+15 units)
  console.log("\n[STEP 3] Performing Restock Action (+15 units)...");
  const { error: updateErr } = await adminSupabase
    .from("gv_inventory_expenses")
    .update({ quantity: expectedRestockedQty })
    .eq("id", testId);

  if (updateErr) {
    throw new Error(`FAIL: Restock update failed: ${updateErr.message}`);
  }

  const { data: restockedRows } = await adminSupabase
    .from("gv_inventory_expenses")
    .select("*")
    .eq("id", testId);

  if (!restockedRows || restockedRows[0].quantity !== expectedRestockedQty) {
    throw new Error(`FAIL: Expected restocked quantity ${expectedRestockedQty}, got ${restockedRows?.[0]?.quantity}`);
  }
  console.log("  [PASS] Restock action succeeded. New Quantity:", restockedRows[0].quantity);

  // 4. Test Edit Action (Change name and price)
  console.log("\n[STEP 4] Performing Edit Action (Updating name and unit price)...");
  const updatedName = `${testItemName} (Deluxe Pack)`;
  const updatedPrice = 180;

  const { error: editErr } = await adminSupabase
    .from("gv_inventory_expenses")
    .update({ title: updatedName, amount_or_unit_cost: updatedPrice })
    .eq("id", testId);

  if (editErr) {
    throw new Error(`FAIL: Edit update failed: ${editErr.message}`);
  }

  const { data: editedRows } = await adminSupabase
    .from("gv_inventory_expenses")
    .select("*")
    .eq("id", testId);

  if (!editedRows || editedRows[0].title !== updatedName || editedRows[0].amount_or_unit_cost !== updatedPrice) {
    throw new Error(`FAIL: Edited record mismatch: ${JSON.stringify(editedRows)}`);
  }
  console.log("  [PASS] Edit action succeeded:", { title: editedRows[0].title, price: editedRows[0].amount_or_unit_cost });

  // 5. Test Delete Action
  console.log("\n[STEP 5] Performing Delete Action...");
  const { error: deleteErr } = await adminSupabase
    .from("gv_inventory_expenses")
    .delete()
    .eq("id", testId);

  if (deleteErr) {
    throw new Error(`FAIL: Delete action failed: ${deleteErr.message}`);
  }

  const { data: postDeleteRows } = await adminSupabase
    .from("gv_inventory_expenses")
    .select("*")
    .eq("id", testId);

  if (postDeleteRows && postDeleteRows.length > 0) {
    throw new Error("FAIL: Item still exists in Supabase after deletion.");
  }
  console.log("  [PASS] Item successfully deleted from Supabase.");

  console.log("\n=== ALL ADMIN INVENTORY ACTION TESTS PASSED ===");
}

runAdminInventoryActionsLifecycleSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
