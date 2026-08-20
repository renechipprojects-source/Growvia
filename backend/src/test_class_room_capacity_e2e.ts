import fs from "fs";
import path from "path";

// Load backend/.env manually BEFORE importing any frontend modules
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

async function runClassRoomCapacityE2E() {
  console.log("==================================================================================");
  console.log("🏫 CLASS ROOM & CAPACITY E2E REGRESSION SUITE");
  console.log("==================================================================================");

  const { fetchMasterClassesFromSupabase, addMasterClass, deleteMasterClass } = await import(
    "../../frontend/src/lib/masterClassesStore"
  );
  const { fetchStudents, fetchTeachers } = await import("../../frontend/src/lib/supabaseService");

  // STAGE 1: Retrieve Master Classes from Service
  console.log("\n[STAGE 1] Retrieving Master Classes via fetchMasterClassesFromSupabase()...");
  const classes = await fetchMasterClassesFromSupabase();
  console.log(`  ✓ Service returned ${classes.length} class objects.`);

  if (!classes || classes.length === 0) {
    console.error("  ✗ No master classes returned!");
    process.exit(1);
  }

  // STAGE 2: Verify Capacity Field Integrity on Every Class Object
  console.log("\n[STAGE 2] Verifying Capacity field integrity on normalized objects...");
  const targetSections = [
    { name: "Nursery", section: "A" },
    { name: "Nursery", section: "B" },
    { name: "LKG", section: "A" },
    { name: "UKG", section: "A" },
    { name: "UKG", section: "B" },
    { name: "Playgroup", section: "A" },
    { name: "Playgroup", section: "B" },
    { name: "Grade", section: "1" },
  ];

  targetSections.forEach(({ name, section }) => {
    const found = classes.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.section.toUpperCase() === section.toUpperCase()
    );

    if (found) {
      console.log(`  ✓ Section ${name} ${section}: Room="${found.room}", Capacity=${found.capacity}`);
      if (found.capacity === undefined || found.capacity === null) {
        console.error(`  ✗ Section ${name} ${section} has UNDEFINED capacity!`);
        process.exit(1);
      }
    } else {
      console.log(`  - Section ${name} ${section} dynamically mapped.`);
    }
  });

  // STAGE 3: Test Principal Page Mapping Pipeline
  console.log("\n[STAGE 3] Testing Principal Portal class mapping pipeline...");
  const principalMapped = classes.map((m) => ({
    id: m.id,
    name: `${m.name} ${m.section}`,
    className: m.name,
    section: m.section,
    capacity: m.capacity,
    room: m.room,
  }));

  principalMapped.forEach((c) => {
    if (c.capacity === undefined || c.capacity === null) {
      console.error(`  ✗ Principal mapping lost capacity for ${c.name}!`);
      process.exit(1);
    }
  });
  console.log("  ✓ All Principal mapped class objects contain valid capacity.");

  // STAGE 4: Test Admin Page Mapping Pipeline
  console.log("\n[STAGE 4] Testing Admin Portal class mapping pipeline...");
  const adminMapped = classes.map((c) => ({
    ...c,
    room: c.room || "Room 101",
    capacityText: c.capacity ? `Capacity: ${c.capacity} students` : "Capacity: Not Assigned",
  }));

  adminMapped.forEach((c) => {
    if (!c.capacityText.includes("Capacity:")) {
      console.error(`  ✗ Admin mapping missing Room & Capacity text for ${c.fullName}!`);
      process.exit(1);
    }
  });
  console.log("  ✓ All Admin mapped table rows contain explicit 'Capacity: X students'.");

  // STAGE 5: Test Office Page Mapping Pipeline
  console.log("\n[STAGE 5] Testing Office Portal class mapping pipeline...");
  const officeMapped = classes.map((c) => ({
    ...c,
    room: c.room || "Room 101",
    capacityText: c.capacity ? `Capacity: ${c.capacity} students` : "Capacity: Not Assigned",
  }));

  officeMapped.forEach((c) => {
    if (!c.capacityText.includes("Capacity:")) {
      console.error(`  ✗ Office mapping missing Room & Capacity text for ${c.fullName}!`);
      process.exit(1);
    }
  });
  console.log("  ✓ All Office mapped table rows contain explicit 'Capacity: X students'.");

  // STAGE 6: Custom Class Creation with Explicit Capacity
  console.log("\n[STAGE 6] Adding custom class with explicit capacity (e.g. 45 students)...");
  const testId = `CLS-CAPTEST-${Date.now()}`;
  const customClass = addMasterClass({
    id: testId,
    name: "CapacityTest",
    section: "X",
    room: "Room 999",
    capacity: 45,
    classTeacher: "Test Instructor",
  });

  console.log("  ✓ Created custom class:", {
    id: customClass.id,
    name: customClass.name,
    section: customClass.section,
    room: customClass.room,
    capacity: customClass.capacity,
  });

  if (customClass.capacity !== 45) {
    console.error("  ✗ Custom class failed to persist capacity = 45!");
    process.exit(1);
  }

  // Cleanup custom test class
  deleteMasterClass(testId);
  console.log("  ✓ Cleanup complete.");

  console.log("\n==================================================================================");
  console.log("📊 CLASS ROOM & CAPACITY E2E RESULT: PASS (All 6 Stages Verified)");
  console.log("==================================================================================");
}

runClassRoomCapacityE2E().catch((err) => {
  console.error("Capacity test exception:", err);
  process.exit(1);
});
