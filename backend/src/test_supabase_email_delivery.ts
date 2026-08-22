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
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const supabase = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function testEmailDelivery() {
  console.log("==================================================================================");
  console.log("📧 TESTING SUPABASE AUTH EMAIL DELIVERY CONFIGURATION");
  console.log("==================================================================================");

  // Test real email address syntax vs custom domain
  const testEmails = [
    "admin@sunshineschool.edu",
    "test.account@gmail.com",
  ];

  for (const testEmail of testEmails) {
    console.log(`\nTesting resetPasswordForEmail for: ${testEmail}...`);
    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: "http://localhost:5173/forgot-password",
    });

    if (error) {
      console.error(`  ❌ resetPasswordForEmail Error (${testEmail}):`, error.message, error.status);
    } else {
      console.log(`  ✅ resetPasswordForEmail succeeded for ${testEmail}! Data:`, data);
    }
  }
}

testEmailDelivery();
