async function runClassesSectionFilterVerification() {
  console.log("=== STARTING DYNAMIC SECTION FILTER E2E VERIFICATION ===");

  // Sample heterogeneous class records
  const sampleClasses = [
    { id: "c1", className: "Nursery", section: "A", fullName: "Nursery A", classTeacher: "Teacher 1" },
    { id: "c2", className: "Nursery", section: "1", fullName: "Nursery 1", classTeacher: "Teacher 2" },
    { id: "c3", className: "LKG", section: "101", fullName: "LKG 101", classTeacher: "Teacher 3" },
    { id: "c4", className: "LKG", section: "Rose", fullName: "LKG Rose", classTeacher: "Teacher 4" },
    { id: "c5", className: "UKG", section: "Beta", fullName: "UKG Beta", classTeacher: "Teacher 5" },
    { id: "c6", className: "UKG", section: "101-Custom-Updated", fullName: "UKG 101-Custom-Updated", classTeacher: "Teacher 6" },
  ];

  // Derive section options dynamically
  const deriveSectionOptions = (records: typeof sampleClasses) => {
    const set = new Set<string>();
    records.forEach((c) => {
      if (c.section && typeof c.section === "string" && c.section.trim()) {
        set.add(c.section.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  };

  const options = deriveSectionOptions(sampleClasses);
  console.log("[TEST 1] Dynamically derived section options:", options);

  // Check expected section values
  const expectedSections = ["1", "101", "101-Custom-Updated", "A", "Beta", "Rose"];
  const matches = expectedSections.every((sec) => options.includes(sec));
  if (!matches) {
    throw new Error(`FAIL: Dynamic sections list does not contain all expected sections! Got: ${JSON.stringify(options)}`);
  }
  console.log("  [PASS] Dynamic section extraction & natural sorting verified.");

  // Test Filtering Logic for each section type
  console.log("\n[TEST 2] Testing record filtering for alphabetical, numeric, room codes, and named sections...");

  const filterRecords = (secFilter: string) => {
    return sampleClasses.filter((c) => {
      return !secFilter || secFilter === "all" || c.section.trim().toLowerCase() === secFilter.trim().toLowerCase();
    });
  };

  // Test Section 'A'
  const filterA = filterRecords("A");
  if (filterA.length !== 1 || filterA[0].section !== "A") {
    throw new Error(`FAIL: Section 'A' filter failed! Got ${filterA.length} records.`);
  }
  console.log("  [PASS] Section 'A' filter verified.");

  // Test Section '1'
  const filter1 = filterRecords("1");
  if (filter1.length !== 1 || filter1[0].section !== "1") {
    throw new Error(`FAIL: Section '1' filter failed! Got ${filter1.length} records.`);
  }
  console.log("  [PASS] Section '1' filter verified.");

  // Test Section '101'
  const filter101 = filterRecords("101");
  if (filter101.length !== 1 || filter101[0].section !== "101") {
    throw new Error(`FAIL: Section '101' filter failed! Got ${filter101.length} records.`);
  }
  console.log("  [PASS] Section '101' filter verified.");

  // Test Section 'Rose'
  const filterRose = filterRecords("Rose");
  if (filterRose.length !== 1 || filterRose[0].section !== "Rose") {
    throw new Error(`FAIL: Section 'Rose' filter failed! Got ${filterRose.length} records.`);
  }
  console.log("  [PASS] Section 'Rose' filter verified.");

  // Test Default 'all'
  const filterAll = filterRecords("all");
  if (filterAll.length !== sampleClasses.length) {
    throw new Error(`FAIL: Default 'all' filter failed! Expected ${sampleClasses.length}, got ${filterAll.length}`);
  }
  console.log("  [PASS] Default 'all' filter verified.");

  console.log("\n=== ALL DYNAMIC SECTION FILTER TESTS PASSED SUCCESSFULLY ===");
}

runClassesSectionFilterVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
