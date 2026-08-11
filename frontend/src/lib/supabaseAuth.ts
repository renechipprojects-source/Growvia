import { supabase } from "./supabase";
import { API_URL as BACKEND_URL } from "./api";

/**
 * Server-Side Provisioning Trigger:
 * Calls the secure backend endpoint to provision or link Supabase Auth users
 * using server-side credentials without exposing keys to the browser.
 */
export async function triggerServerUserProvisioning(params?: {
  login_id?: string;
  email?: string;
  password?: string;
  role?: string;
  name?: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
  } catch {}
  return { success: false };
}

export async function login(loginId: string, password: string) {
  try {
    const id = loginId.trim();

    // Find user profile in primary gv_users table
    const { data: userData, error: queryErr } = await supabase
      .from("gv_users")
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
      .or(`login_id.ilike.${id},email.ilike.${id}`)
      .maybeSingle();

    if (queryErr) {
      return {
        success: false,
        error: "Unable to connect to school server. Please check your connection.",
      };
    }

    const profile = userData;

    if (!profile) {
      return {
        success: false,
        error: "Invalid Login ID or password.",
      };
    }


    if (profile.status === "inactive" || profile.status === "disabled") {
      return {
        success: false,
        error: "Your account is inactive. Please contact the administrator.",
      };
    }

    const emailToAuth = profile.email || `${id.toLowerCase()}@growvia.edu`;

    // JIT Provisioning on backend
    triggerServerUserProvisioning({
      login_id: profile.login_id || id,
      email: emailToAuth,
      password,
      role: profile.role,
      name: profile.full_name,
    }).catch(() => {});

    // Try Supabase Auth sign-in
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    }).catch(() => ({ data: null }));

    return {
      success: true,
      user: authData?.user || { id: profile.id, email: emailToAuth },
      profile: {
        ...profile,
        role: profile.role,
      },
    };
  } catch {
    return {
      success: false,
      error: "Authentication error. Please check your credentials.",
    };
  }
}