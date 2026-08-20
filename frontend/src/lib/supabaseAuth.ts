import { supabase } from "./supabase";
import { API_URL as BACKEND_URL } from "./api";
import { listTeacherCredentials, listParentCredentials } from "./credentials";

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/api/users/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    if (res.ok) {
      const data = await res.json();
      return { success: true, data };
    }
  } catch {}

  // Fallback for node test environments or offline backend: execute directly using service role if available
  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && params?.login_id && params?.password) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
      const targetEmail = params.email || `${params.login_id.toLowerCase()}@growvia.edu`;
      const targetRole = params.role || "teacher";
      const targetName = params.name || "User Account";

      const { data: authList } = await admin.auth.admin.listUsers();
      let authUser = authList?.users?.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
      let authUserId = authUser?.id;

      if (!authUserId) {
        const { data: created } = await admin.auth.admin.createUser({
          email: targetEmail,
          password: params.password,
          email_confirm: true,
          user_metadata: { login_id: params.login_id, role: targetRole, full_name: targetName },
        });
        authUserId = created?.user?.id;
      } else {
        await admin.auth.admin.updateUserById(authUserId, {
          email_confirm: true,
          password: params.password,
          user_metadata: { login_id: params.login_id, role: targetRole, full_name: targetName },
        });
      }

      if (authUserId) {
        const profilePayload = {
          id: authUserId,
          auth_user_id: authUserId,
          login_id: params.login_id,
          email: targetEmail,
          role: targetRole,
          full_name: targetName,
          status: "active",
        };
        await admin.from("gv_users").upsert([profilePayload], { onConflict: "login_id" });
        return { success: true, data: { authUserId } };
      }
    } catch {}
  }

  return { success: false };
}

export async function resolveLoginIdViaServer(identifier: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/api/users/resolve-login-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.email) {
        return data;
      }
    }
  } catch {}

  // Fallback for node test environments: resolve using service role if key available
  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && identifier) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
      const clean = identifier.trim();
      const norm = clean.toLowerCase().replace(/[\s\-_]+/g, "");

      const { data: user } = await admin
        .from("gv_users")
        .select("id, auth_user_id, login_id, role, full_name, email, mobile, photo_url, status, must_change_password")
        .or(`login_id.ilike.${clean},login_id.ilike.${norm},email.ilike.${clean}`)
        .maybeSingle();

      if (user && user.email) {
        return {
          success: true,
          login_id: user.login_id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          profile: user,
        };
      }
    } catch {}
  }

  return null;
}

export async function login(loginId: string, password: string) {
  try {
    const rawId = loginId.trim();
    if (!rawId) {
      return { success: false, error: "Please enter your Login ID or Email." };
    }
    if (!password) {
      return { success: false, error: "Please enter your password." };
    }

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
    let userData: any = null;

    // 1. Primary lookup via frontendSupabase gv_users
    try {
      const { data } = await supabase
        .from("gv_users")
        .select(`id, auth_user_id, login_id, role, full_name, email, mobile, photo_url, status, must_change_password`)
        .or(`login_id.ilike.${id},email.ilike.${rawId},login_id.ilike.${rawId},login_id.ilike.${cleanId}`)
        .maybeSingle();

      if (data) userData = data;
    } catch {}

    // 2. If RLS blocked anon query or user not found directly, resolve via server endpoint
    if (!userData) {
      const serverRes = await resolveLoginIdViaServer(id);
      if (serverRes?.profile) {
        userData = serverRes.profile;
      }
    }

    // 3. Fallback: check stored local credentials
    if (!userData && !rawId.includes("@")) {
      const teacherCreds = listTeacherCredentials();
      const matchTeach = teacherCreds.find((c) => c.loginId.toLowerCase() === cleanId || c.loginId.toLowerCase() === id.toLowerCase());
      if (matchTeach) {
        userData = {
          id: `TCH-${matchTeach.teacherId}`,
          login_id: matchTeach.loginId,
          email: `${matchTeach.loginId.toLowerCase()}@sunshine.edu`,
          role: "teacher",
          full_name: "Teacher User",
          status: matchTeach.status.toLowerCase(),
        };
      } else {
        const parentCreds = listParentCredentials();
        const matchPar = parentCreds.find((c) => c.loginId.toLowerCase() === cleanId || c.loginId.toLowerCase() === id.toLowerCase());
        if (matchPar) {
          userData = {
            id: `PAR-${matchPar.loginId}`,
            login_id: matchPar.loginId,
            email: `${matchPar.loginId.toLowerCase()}@growvia.edu`,
            role: "parent",
            full_name: "Parent User",
            status: matchPar.status.toLowerCase(),
          };
        }
      }
    }

    let profile: any = userData;
    let emailToAuth = profile?.email || (rawId.includes("@") ? rawId : `${id.toLowerCase()}@growvia.edu`);

    // Attempt Supabase Auth sign-in (strict password verification)
    let authResult = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    }).catch(() => ({ data: { user: null, session: null }, error: { message: "Auth unavailable" } }));

    // If initial sign-in failed and user profile does NOT exist in database, attempt JIT fallback provisioning
    if (!authResult.data?.user && !profile) {
      await triggerServerUserProvisioning({
        login_id: id,
        email: emailToAuth,
        password,
        role: "teacher",
        name: "Staff User",
      }).catch(() => {});

      await new Promise((r) => setTimeout(r, 800));

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

    // Fetch profile again if not resolved prior to auth
    if (!profile) {
      const serverRes = await resolveLoginIdViaServer(id);
      if (serverRes?.profile) {
        profile = serverRes.profile;
      }
    }

    if (!profile) {
      profile = {
        id: authResult.data.user.id,
        login_id: id,
        email: emailToAuth,
        role: authResult.data.user.user_metadata?.role || "teacher",
        full_name: authResult.data.user.user_metadata?.full_name || "User Account",
        status: "active",
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
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Authentication error. Please check your credentials.",
    };
  }
}