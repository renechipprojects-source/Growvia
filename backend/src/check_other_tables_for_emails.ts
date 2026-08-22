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

const supabase = createClient(supabaseUrl, serviceKey);

async function searchOtherTables() {
  const tables = ["users", "students", "teachers", "parents"];
  for (const t of tables) {
    try {
      const { data } = await supabase.from(t).select("*");
      console.log(`\n=== TABLE ${t} (${data?.length || 0} rows) ===`);
      (data || []).forEach((row: any) => {
        const str = JSON.stringify(row).toLowerCase();
        if (str.includes("vanthia") || str.includes("gayu22") || str.includes("anurk")) {
          console.log(`  MATCH IN ${t}:`, row);
        }
      });
    } catch (e: any) {
      console.log(`Error querying ${t}:`, e.message);
    }
  }
}

searchOtherTables();
