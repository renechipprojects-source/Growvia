import { supabase } from "./supabase";

export async function login(loginId: string, password: string) {
  // Find the user's email using their Login ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      login_id,
      role,
      full_name,
      email,
      mobile,
      photo_url,
      status,
      must_change_password
    `)
    .eq("login_id", loginId)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: "Invalid Login ID or password.",
    };
  }

  // Authenticate using the email stored in the profile
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: error?.message ?? "Invalid Login ID or password.",
    };
  }

  // Verify the authenticated user matches the profile
  if (profile.auth_user_id !== data.user.id) {
    await supabase.auth.signOut();

    return {
      success: false,
      error: "Profile verification failed.",
    };
  }

  return {
    success: true,
    user: data.user,
    profile,
  };
}