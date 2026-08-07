import { supabase } from "./supabase";
import { authenticateGenerated } from "./credentials";
import { findSystemUserByLoginId, isTemporaryPassword } from "./auth";
import { API_URL as BACKEND_URL } from "./api";

/**
 * Server-Side Provisioning Trigger:
 * Calls the secure backend endpoint to provision or link Supabase Auth users
 * using server-side credentials without exposing keys to the browser.
 */
export async function triggerServerUserProvisioning(loginId?: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id: loginId }),
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

    // 1. Instant local check for system users & generated credentials (0ms)
    const sysUser = findSystemUserByLoginId(id);
    if (sysUser) {
      return {
        success: true,
        user: { id: sysUser.loginId, email: `${sysUser.loginId.toLowerCase()}@sunshine.edu` } as any,
        profile: {
          id: sysUser.loginId,
          auth_user_id: sysUser.loginId,
          login_id: sysUser.loginId,
          role: sysUser.role,
          full_name: sysUser.name,
          email: `${sysUser.loginId.toLowerCase()}@sunshine.edu`,
          status: "active",
          must_change_password: isTemporaryPassword(sysUser.loginId),
        },
      };
    }

    const generatedCred = authenticateGenerated(id, password);
    if (generatedCred) {
      return {
        success: true,
        user: { id: `GEN-${id}`, email: `${id.toLowerCase()}@growvia.edu` } as any,
        profile: {
          id: `GEN-${id}`,
          auth_user_id: `GEN-${id}`,
          login_id: id,
          role: generatedCred.role,
          full_name: generatedCred.name || (generatedCred.role === "teacher" ? "Teacher User" : "Parent User"),
          email: `${id.toLowerCase()}@growvia.edu`,
          status: "active",
          must_change_password: false,
        },
      };
    }

    // Find user profile in primary GV_users table
    let profile: any = null;
    let { data: userData } = await supabase
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

    if (userData) {
      profile = userData;
    } else {
      const { data: legacyUser } = await supabase
        .from("users")
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

      profile = legacyUser;
    }

    if (!profile) {
      return {
        success: false,
        error: "Invalid Login ID or password.",
      };
    }

    // Verify account status
    if (profile.status === "inactive" || profile.status === "disabled") {
      return {
        success: false,
        error: "Your account is inactive. Please contact the administrator.",
      };
    }

    const emailToAuth = profile.email || `${id.toLowerCase()}@growvia.edu`;

    // Authenticate using Supabase Auth
    let { data, error } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: "Invalid Login ID or password.",
      };
    }

    return {
      success: true,
      user: data.user,
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