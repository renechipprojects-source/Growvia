import { createClient } from "@supabase/supabase-js";
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
      }
    });
  }
} catch {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

async function testAddClassE2E() {
  console.log("==================================================================================");
  console.log("🧪 STARTING CLASS ADDING & SUPABASE PERSISTENCE E2E TEST");
  console.log("==================================================================================");

  const testClassName = "Test Grade 6";
  const testSection = "Z";
  const testId = `CLS-TestGrade6-Z`;

  try {
    // 1. Clean up any pre-existing test class
    await admin.from("gv_requests").delete().eq("id", testId);

    // 2. Fetch existing classes count before add
    const { data: beforeRows } = await admin.from("gv_requests").select("*").eq("request_type", "class");
    console.log(`[STEP 1] Classes in DB before addition: ${beforeRows?.length || 0}`);

    // 3. Perform Class Addition (Simulating addMasterClass flow)
    const newClassItem = {
      id: testId,
      name: testClassName,
      section: testSection,
      fullName: `${testClassName} - Section ${testSection}`,
      classTeacher: "Unassigned",
      teacherId: "",
      room: "Room 999",
      capacity: 40,
    };

    const payload = {
      id: newClassItem.id,
      request_type: "class",
      leave_type_or_interested_class: `${newClassItem.name} ${newClassItem.section}`.trim(),
      applicant_or_child_name: newClassItem.classTeacher,
      status: "active",
      reason_or_notes: JSON.stringify(newClassItem),
    };

    console.log(`[STEP 2] Upserting new class record ${testId} into Supabase gv_requests...`);
    const { error: upsertErr } = await admin.from("gv_requests").upsert([payload], { onConflict: "id" });

    if (upsertErr) {
      throw new Error(`Failed to upsert class record: ${upsertErr.message}`);
    }
    console.log(`  └─ [PASS] Class record upserted successfully.`);

    // 4. Verification after Addition (Simulating fetchMasterClassesFromSupabase after refresh/restart)
    console.log(`[STEP 3] Fetching class record from Supabase after simulated refresh...`);
    const { data: fetched, error: fetchErr } = await admin
      .from("gv_requests")
      .select("*")
      .eq("id", testId)
      .single();

    if (fetchErr || !fetched) {
      throw new Error(`Added class not found in Supabase: ${fetchErr?.message}`);
    }

    const parsedNotes = JSON.parse(fetched.reason_or_notes);
    console.log(`  └─ [PASS] Verified class in DB: Name="${parsedNotes.name}", Section="${parsedNotes.section}", Capacity=${parsedNotes.capacity}`);

    // 5. Uniqueness validation check simulation
    console.log(`[STEP 4] Testing class uniqueness check for duplicate "${testClassName} - Section ${testSection}"...`);
    const { data: dupCheck } = await admin
      .from("gv_requests")
      .select("*")
      .eq("request_type", "class")
      .eq("leave_type_or_interested_class", `${testClassName} ${testSection}`);

    if (dupCheck && dupCheck.length > 0) {
      console.log(`  └─ [PASS] Uniqueness check correctly detects existing class "${testClassName} ${testSection}".`);
    } else {
      throw new Error("Uniqueness check failed to find created class.");
    }

    // 6. Cleanup test record
    console.log(`[STEP 5] Cleaning up test class record ${testId}...`);
    await admin.from("gv_requests").delete().eq("id", testId);
    console.log(`  └─ [PASS] Cleaned up test class ${testId}`);

    console.log("\n==================================================================================");
    console.log("✅ ALL CLASS ADDING AND SUPABASE PERSISTENCE CHECKS PASSED PERFECTLY!");
    console.log("==================================================================================");
  } catch (err: any) {
    console.error("❌ E2E CLASS ADDING TEST FAILED:", err);
    process.exit(1);
  }
}

testAddClassE2E();
