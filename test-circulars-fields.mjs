import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFields() {
  const fullPayload = {
    title: "Annual Sports Day Celebration",
    content: "We are excited to announce Annual Sports Day 2026.",
    target_audience: "Parents,Teachers",
    published_date: "2026-07-29",
    author: "Principal Office",
  };

  const { data, error } = await supabase.from('circulars').insert([fullPayload]).select();
  console.log("Full Payload Result:", { data, error });
}

testFields();
