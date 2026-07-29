import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testJsonCircular() {
  const meta = {
    subject: "School Annual Day Dress Code & Timings",
    description: "Dear Parents, Please note the dress code and timings for Annual Day.",
    priority: "High",
    recipients: ["Parents", "Teachers"],
    attachmentName: "Annual_Day_Schedule.pdf",
    attachmentUrl: "https://example.com/schedule.pdf",
    status: "Published"
  };

  const payload = {
    title: "School Annual Day Dress Code & Timings",
    content: JSON.stringify(meta),
    target_audience: "Parents,Teachers",
    published_date: "2026-07-29",
    author: "Principal Office"
  };

  const { data, error } = await supabase.from('circulars').insert([payload]).select();
  console.log("JSON Insert Result:", { data, error });

  const { data: list } = await supabase.from('circulars').select('*').order('created_at', { ascending: false });
  console.log("Fetched Circulars Count from Supabase:", list?.length);
  list?.forEach((item) => {
    try {
      const parsed = JSON.parse(item.content);
      console.log(`Parsed item [${item.id}]:`, parsed.subject, "Priority:", parsed.priority);
    } catch {
      console.log(`Plain text item [${item.id}]:`, item.content);
    }
  });
}

testJsonCircular();
