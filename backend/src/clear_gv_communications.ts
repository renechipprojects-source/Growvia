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
} catch (e) {
  console.error("Failed to parse .env:", e);
}

async function clearGvCommunications() {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://nyhnkftlkigoliyogwvp.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("==================================================================================");
  console.log("🧹 CLEARING OPERATIONAL COMMUNICATIONS FROM gv_communications");
  console.log("==================================================================================");

  const { data: before } = await admin.from("gv_communications").select("*");
  console.log(`  Records in gv_communications BEFORE: ${before?.length || 0}`);

  const { error } = await admin.from("gv_communications").delete().neq("id", "none_never_match_all");
  if (!error) {
    console.log("  ✓ Successfully deleted all operational records from gv_communications!");
  } else {
    console.error("  Error deleting from gv_communications:", error);
  }

  const { data: after } = await admin.from("gv_communications").select("*");
  console.log(`  Records in gv_communications AFTER: ${after?.length || 0}`);

  console.log("==================================================================================");
}

clearGvCommunications().catch((err) => console.error(err));
