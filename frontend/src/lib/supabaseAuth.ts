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
    const rawId = loginId.trim();
    const cleanId = rawId.toLowerCase().replace(/[\s\-_]+/g, "");

    // Map common role shortcuts to canonical IDs
    let canonicalId = rawId;
    if (cleanId === "admin" || cleanId === "superadmin" || cleanId === "admin001") canonicalId = "ADMIN001";
    else if (cleanId === "principal" || cleanId === "principal001") canonicalId = "PRINCIPAL001";
    else if (cleanId === "office" || cleanId === "office001") canonicalId = "OFFICE001";
    else if (cleanId === "teacher" || cleanId === "tch101") canonicalId = "TCH101";
    else if (cleanId === "parent" || cleanId === "prt1001") canonicalId = "PRT1001";
    else if (cleanId === "student" || cleanId === "stu001") canonicalId = "STU001";

    const id = canonicalId;

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
      .or(`login_id.ilike.${id},email.ilike.${rawId},login_id.ilike.${rawId}`)
      .maybeSingle();

    if (queryErr) {
      return {
        success: false,
        error: "Unable to connect to school server. Please check your connection.",
      };
    }

    let profile: any = userData;
    let emailToAuth = profile?.email || (rawId.includes("@") ? rawId : `${id.toLowerCase()}@growvia.edu`);

    // Attempt Supabase Auth sign-in (strict password verification)
    let authResult = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    }).catch(() => ({ data: { user: null, session: null }, error: { message: "Auth unavailable" } }));

    // If initial sign-in failed and we had no profile, trigger JIT provisioning retry once
    if (!authResult.data?.user) {
      await triggerServerUserProvisioning({
        login_id: id,
        email: emailToAuth,
        password,
        role: profile?.role,
        name: profile?.full_name,
      }).catch(() => {});

      await new Promise((r) => setTimeout(r, 1000));

      authResult = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      }).catch(() => ({ data: { user: null, session: null }, error: { message: "Auth unavailable" } }));
    }

    // Require successful password verification
    if (!authResult.data?.user) {
      return {
        success: false,
        error: "Invalid Login ID or password.",
      };
    }

    // If profile was not retrieved initially (e.g. anon select blocked by RLS), fetch now that session is authenticated
    if (!profile) {
      const { data: authedData } = await supabase
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

      profile = authedData;
    }

    if (!profile) {
      return {
        success: false,
        error: "User profile not found. Please contact administrator.",
      };
    }

    if (profile.status === "inactive" || profile.status === "disabled") {
      return {
        success: false,
        error: "Your account is inactive. Please contact the administrator.",
      };
    }

    return {
      success: true,
      user: authResult.data.user,
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