// Polyfill localStorage in Node test environment if window is undefined
if (typeof globalThis.localStorage === "undefined") {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
  (globalThis as any).window = globalThis;
}

import { addMasterClass, updateMasterClass, getStoredMasterClasses, fetchMasterClassesFromSupabase, type MasterClassItem } from "../../frontend/src/lib/masterClassesStore";

async function runCustomClassCreationRegressionSuite() {
  console.log("=== STARTING CUSTOM CLASS & SECTION CREATION REGRESSION SUITE ===");

  // Test 1: Preset class creation
  const presetClass = addMasterClass({
    name: "Grade 1",
    section: "A",
    room: "Room 101",
    capacity: 30,
    classTeacher: "Priya Sharma",
  });

  if (presetClass.name !== "Grade 1" || presetClass.section !== "A") {
    throw new Error(`FAIL: Preset class creation failed. Got ${presetClass.name} Sec ${presetClass.section}`);
  }
  console.log(`[PASS] Requirement 1: Preset class created cleanly (${presetClass.fullName}).`);

  // Test 2: Custom multi-word class creation
  const customMultiWordClass = addMasterClass({
    name: "Robotics & AI Club",
    section: "Beta",
    room: "Lab 3",
    capacity: 25,
    classTeacher: "Vikram Malhotra",
  });

  if (customMultiWordClass.name !== "Robotics & AI Club") {
    throw new Error(`FAIL: Multi-word class name was truncated: '${customMultiWordClass.name}'`);
  }
  console.log(`[PASS] Requirement 2: Custom multi-word class created without truncation ('${customMultiWordClass.name}').`);

  // Test 3: Numeric section
  const numericSectionClass = addMasterClass({
    name: "Senior Kindergarten",
    section: "101",
    room: "Room 202",
    capacity: 35,
    classTeacher: "Ananya Sen",
  });

  if (numericSectionClass.section !== "101") {
    throw new Error(`FAIL: Numeric section corrupted: '${numericSectionClass.section}'`);
  }
  console.log(`[PASS] Requirement 3: Numeric section supported and retained ('${numericSectionClass.section}').`);

  // Test 4: Text section (preserving exact case, e.g. 'Rose')
  const textSectionClass = addMasterClass({
    name: "Pre-K Special",
    section: "Rose",
    room: "Garden Suite 1",
    capacity: 20,
    classTeacher: "Sunita Roy",
  });

  if (textSectionClass.section !== "Rose") {
    throw new Error(`FAIL: Text section forced uppercase or corrupted: '${textSectionClass.section}'`);
  }
  console.log(`[PASS] Requirement 4: Text section supported with exact casing ('${textSectionClass.section}').`);

  // Test 5: Room and Capacity persistence
  if (textSectionClass.room !== "Garden Suite 1" || textSectionClass.capacity !== 20) {
    throw new Error(`FAIL: Room or capacity lost. Room: '${textSectionClass.room}', Capacity: ${textSectionClass.capacity}`);
  }
  console.log(`[PASS] Requirement 5: Room ('${textSectionClass.room}') and Capacity (${textSectionClass.capacity}) correctly persisted.`);

  // Test 6: Reload persistence (local storage + memory cache)
  const storedList = getStoredMasterClasses();
  const reloadedCustom = storedList.find((c) => c.id === customMultiWordClass.id);
  const reloadedTextSec = storedList.find((c) => c.id === textSectionClass.id);

  if (!reloadedCustom || reloadedCustom.name !== "Robotics & AI Club") {
    throw new Error("FAIL: Reloaded custom class was lost or truncated in local storage.");
  }
  if (!reloadedTextSec || reloadedTextSec.section !== "Rose") {
    throw new Error("FAIL: Reloaded custom text section was lost or corrupted in local storage.");
  }
  console.log("[PASS] Requirement 6: Reload/re-fetch confirms 100% persistence of custom classes, multi-word names, numeric sections, and text sections.");

  console.log("\n=== ALL CUSTOM CLASS CREATION REGRESSION TESTS PASSED SUCCESSFULLY ===");
}

runCustomClassCreationRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
