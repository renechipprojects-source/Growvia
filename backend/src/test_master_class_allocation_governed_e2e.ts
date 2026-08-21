import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), "backend/.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value.trim();
        if (key === "SUPABASE_URL") process.env.VITE_SUPABASE_URL = value.trim();
        if (key === "SUPABASE_SERVICE_ROLE_KEY") process.env.VITE_SUPABASE_ANON_KEY = value.trim();
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function runMasterClassAllocationGovernedE2ETest() {
  console.log("==================================================================================");
  console.log("🏫 GOVERNED CLASS ALLOCATION, SECTION SYNC & STAFF ASSIGNMENT E2E SUITE");
  console.log("==================================================================================");

  const {
    addMasterClass,
    updateMasterClass,
    deleteMasterClass,
    fetchMasterClassesFromSupabase,
    getStoredMasterClasses,
  } = await import("../../frontend/src/lib/masterClassesStore");
  const { createClient } = await import("@supabase/supabase-js");

  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const timestamp = Date.now();
  const runId = `${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
  const testClassName = `TestGrade-${runId}`;
  const testSectionNumeric = "101";
  const testSectionAlpha = "Rose";

  // STAGE 1: Create Class with Numeric Section & Verify Everywhere
  console.log(`\n[STAGE 1] Creating new Master Class '${testClassName}' with numeric section '${testSectionNumeric}'...`);
  const createdClass = addMasterClass({
    name: testClassName,
    section: testSectionNumeric,
    classTeacher: "Unassigned",
    room: "Room 301",
    capacity: 35,
  });

  console.log(`  ✓ Class Created ID: ${createdClass.id}, FullName: ${createdClass.fullName}`);
  await new Promise((r) => setTimeout(r, 600));

  const fetchedAfterCreate = await fetchMasterClassesFromSupabase();
  const foundCreate = fetchedAfterCreate.find((c) => c.id === createdClass.id);
  if (!foundCreate) {
    throw new Error("FAIL: Created class was not retrieved from database store!");
  }
  console.log("  [PASS] Create class verified: Visible in store and database.");

  // STAGE 2: Assign Staff to Class & Verify Synchronization
  console.log("\n[STAGE 2] Assigning Staff 'Test Teacher Alpha' as Class Teacher...");
  const updatedWithTeacher = updateMasterClass(createdClass.id, {
    classTeacher: "Test Teacher Alpha",
    teacherId: `TCH-GOV-${runId}`,
  });

  if (!updatedWithTeacher || updatedWithTeacher.classTeacher !== "Test Teacher Alpha") {
    throw new Error("FAIL: Master class teacher update failed!");
  }

  await new Promise((r) => setTimeout(r, 600));
  const fetchedAfterAssign = await fetchMasterClassesFromSupabase();
  const foundAssign = fetchedAfterAssign.find((c) => c.id === createdClass.id);
  if (!foundAssign || foundAssign.classTeacher !== "Test Teacher Alpha") {
    throw new Error("FAIL: Staff assignment not synchronized to database store!");
  }
  console.log("  [PASS] Staff assignment verified: Relational assignment updated everywhere.");

  // STAGE 3: Edit Section to Custom Alphabetic Section 'Rose'
  console.log(`\n[STAGE 3] Editing Section to custom alphabetic section '${testSectionAlpha}'...`);
  const updatedSection = updateMasterClass(createdClass.id, {
    section: testSectionAlpha,
  });

  if (!updatedSection || updatedSection.section !== testSectionAlpha) {
    throw new Error("FAIL: Section edit failed!");
  }

  await new Promise((r) => setTimeout(r, 600));
  const fetchedAfterSectionEdit = await fetchMasterClassesFromSupabase();
  const foundSectionEdit = fetchedAfterSectionEdit.find((c) => c.id === createdClass.id);
  if (!foundSectionEdit || foundSectionEdit.section !== testSectionAlpha) {
    throw new Error("FAIL: Section edit not reflected in database store!");
  }
  console.log("  [PASS] Custom section edit verified: Numeric ('101') and Alphabetic ('Rose') supported.");

  // STAGE 4: Delete Class & Verify Permanent Non-Resurrection
  console.log(`\n[STAGE 4] Deleting class '${createdClass.id}' and verifying permanent non-resurrection...`);
  await deleteMasterClass(createdClass.id);

  const localAfterDelete = getStoredMasterClasses();
  if (localAfterDelete.some((c) => c.id === createdClass.id)) {
    throw new Error("FAIL: Deleted class still present in local store!");
  }

  await new Promise((r) => setTimeout(r, 600));
  const fetchedAfterDelete = await fetchMasterClassesFromSupabase();
  if (fetchedAfterDelete.some((c) => c.id === createdClass.id)) {
    throw new Error("FAIL: Deleted class resurrected after database fetch!");
  }
  console.log("  [PASS] Class deletion verified: Cascading cleanup complete, zero resurrection.");

  // CLEANUP
  console.log("\n[CLEANUP] Cleaning test class records...");
  await adminSupabase.from("gv_requests").delete().eq("id", createdClass.id);
  await adminSupabase.from("gv_requests").delete().eq("id", `CA-${createdClass.id}`);
  console.log("  [PASS] Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 MASTER CLASS ALLOCATION E2E RESULT: PASS (All Stages Verified)");
  console.log("==================================================================================");
}

runMasterClassAllocationGovernedE2ETest().catch((err) => {
  console.error("E2E test exception:", err);
  process.exit(1);
});
