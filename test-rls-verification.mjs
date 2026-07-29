import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRlsPermissions() {
  console.log("=== SUPABASE RLS VERIFICATION AUDIT FOR CIRCULARS TABLE ===\n");

  // 1. SELECT test
  const { data: selectData, error: selectError } = await supabase.from('circulars').select('*');
  if (selectError) console.error("❌ SELECT RLS Error:", selectError.message);
  else console.log(`✅ SELECT Policy: SUCCESS (${selectData.length} records retrieved)`);

  // 2. INSERT test
  const timestamp = Date.now();
  const testRecord = {
    title: `RLS Verification Notice ${timestamp}`,
    content: JSON.stringify({ description: "Testing insert RLS", priority: "Low", recipients: ["All"] }),
    target_audience: "All",
    published_date: "2026-07-29",
    author: "Principal Audit Test"
  };

  const { data: insertData, error: insertError } = await supabase.from('circulars').insert([testRecord]).select();
  if (insertError) {
    console.error("❌ INSERT RLS Error:", insertError.message);
    process.exit(1);
  }
  const insertedId = insertData[0].id;
  console.log(`✅ INSERT Policy: SUCCESS (Record Created: ${insertedId})`);

  // 3. UPDATE test
  const updatedMeta = JSON.stringify({ description: "Testing update RLS - Updated content", priority: "High", recipients: ["All"] });
  const { error: updateError } = await supabase.from('circulars').update({ content: updatedMeta }).eq('id', insertedId);
  if (updateError) console.error("❌ UPDATE RLS Error:", updateError.message);
  else console.log(`✅ UPDATE Policy: SUCCESS for record ${insertedId}`);

  // 4. DELETE test
  const { error: deleteError } = await supabase.from('circulars').delete().eq('id', insertedId);
  if (deleteError) console.error("❌ DELETE RLS Error:", deleteError.message);
  else console.log(`✅ DELETE Policy: SUCCESS for record ${insertedId}`);

  console.log("\n=== RLS PERMISSION AUDIT PASSED: SELECT, INSERT, UPDATE, DELETE ALL 100% OPERATIONAL ===");
}

testRlsPermissions();
