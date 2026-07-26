import { supabase } from "./lib/supabase";

async function testConnection() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*");

  console.log("Profiles:", data);
  console.log("Error:", error);
}

testConnection();
