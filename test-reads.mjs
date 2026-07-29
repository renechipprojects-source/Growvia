import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlthgiosjkmpnaiypawj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsdGhnaW9zamttcG5haXlwYXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4ODUwNTUsImV4cCI6MjEwMDQ2MTA1NX0.2kIsVh3iFYu4hYHWRcE__EAIgt24WUsNCbmFDbcCcpI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testReadSync() {
  const { data, error } = await supabase.from('messages').insert([
    {
      sender_id: 'SYSTEM',
      sender_name: 'CircularReadStore',
      sender_role: 'system',
      receiver_id: 'CIR-04ba51f3',
      receiver_role: 'parent',
      message_text: 'READ_ACK:parent:Parent_Aarav',
      read_status: true
    }
  ]).select();

  console.log("Message/Read Sync Insert:", { data, error });
}

testReadSync();
