import { supabase } from "./supabase";

export async function login(loginId: string, password: string) {
  try {
    const id = loginId.trim();
    const isSystemDev = id.toLowerCase().includes("dev") || id.toLowerCase().includes("developer");
    if (isSystemDev) {
      return { success: false, error: "System developer login" };
    }

    // Find the user's email using their Login ID or Email
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
      .or(`login_id.eq.${id},email.eq.${id}`)
      .maybeSingle();

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

    // Verify the authenticated user matches the profile if auth_user_id is set
    if (profile.auth_user_id && profile.auth_user_id !== data.user.id) {
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
  } catch {
    return {
      success: false,
      error: "Authentication error.",
    };
  }
}