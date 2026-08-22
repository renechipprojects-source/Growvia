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
  mobile?: string;
}) {
  const backendUrls = Array.from(new Set([
    BACKEND_URL,
    "http://localhost:5000",
    ""
  ])).filter((u) => typeof u === "string");

  for (const baseUrl of backendUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const targetUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/users/provision` : "/api/users/provision";
      const res = await fetch(targetUrl, {
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
  }

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

export async function updateServerAuthEmail(identifier: string, newEmail: string) {
  const backendUrls = Array.from(new Set([
    BACKEND_URL,
    "http://localhost:5000",
    ""
  ])).filter((u) => typeof u === "string");

  for (const baseUrl of backendUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const targetUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/users/update-email` : "/api/users/update-email";
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, new_email: newEmail }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const data = await res.json();
        if (data?.success) return data;
      }
    } catch {}
  }

  // Node fallback for tests
  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && identifier && newEmail) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
      const clean = identifier.trim();
      const targetEmail = newEmail.trim().toLowerCase();

      let authUserId: string | null = null;
      let targetLoginId: string = clean;
      let targetRole: string = "teacher";
      let targetName: string = "User Account";

      const { data: profile } = await admin
        .from("gv_users")
        .select("id, auth_user_id, login_id, role, full_name, email")
        .or(`login_id.ilike.${clean},email.ilike.${clean},id.ilike.${clean}`)
        .maybeSingle();

      if (profile) {
        targetLoginId = profile.login_id || clean;
        authUserId = profile.auth_user_id || profile.id;
        if (profile.role) targetRole = profile.role;
        if (profile.full_name) targetName = profile.full_name;
      }

      if (authUserId) {
        await admin.auth.admin.updateUserById(authUserId, {
          email: targetEmail,
          email_confirm: true,
          user_metadata: { login_id: targetLoginId, role: targetRole, full_name: targetName },
        });
      } else {
        const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
        let authUser = userList?.users?.find(
          (u) =>
            u.email?.toLowerCase() === clean.toLowerCase() ||
            u.email?.toLowerCase() === targetEmail ||
            u.user_metadata?.login_id?.toString().toLowerCase() === targetLoginId.toLowerCase()
        );
        if (authUser) {
          authUserId = authUser.id;
          if (authUser.user_metadata?.role) targetRole = authUser.user_metadata.role;
          await admin.auth.admin.updateUserById(authUser.id, {
            email: targetEmail,
            email_confirm: true,
            user_metadata: { login_id: targetLoginId, role: targetRole, full_name: targetName },
          });
        }
      }

      await admin.from("gv_users").update({ email: targetEmail }).or(`login_id.ilike.${targetLoginId},login_id.ilike.${clean},id.ilike.${clean}`);
      return { success: true, email: targetEmail, authUserId };
    } catch {}
  }

  return { success: false };
}

export async function updateServerAuthPassword(identifier: string, newPassword: string) {
  const backendUrls = Array.from(new Set([
    BACKEND_URL,
    "http://localhost:5000",
    ""
  ])).filter((u) => typeof u === "string");

  for (const baseUrl of backendUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const targetUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/users/update-password` : "/api/users/update-password";
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, new_password: newPassword }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const data = await res.json();
        if (data?.success) return data;
      }
    } catch {}
  }

  // Node fallback for tests
  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && identifier && newPassword) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
      const clean = identifier.trim();

      let authUserId: string | null = null;
      let targetLoginId: string = clean;
      let targetRole: string = "teacher";
      let targetName: string = "User Account";

      const { data: profile } = await admin
        .from("gv_users")
        .select("id, auth_user_id, login_id, role, full_name, email")
        .or(`login_id.ilike.${clean},email.ilike.${clean},id.ilike.${clean}`)
        .maybeSingle();

      if (profile) {
        targetLoginId = profile.login_id || clean;
        authUserId = profile.auth_user_id || profile.id;
        if (profile.role) targetRole = profile.role;
        if (profile.full_name) targetName = profile.full_name;
      }

      if (authUserId) {
        await admin.auth.admin.updateUserById(authUserId, {
          password: newPassword,
          email_confirm: true,
          user_metadata: { login_id: targetLoginId, role: targetRole, full_name: targetName },
        });
      } else {
        const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
        let authUser = userList?.users?.find(
          (u) =>
            u.email?.toLowerCase() === clean.toLowerCase() ||
            u.user_metadata?.login_id?.toString().toLowerCase() === targetLoginId.toLowerCase()
        );
        if (authUser) {
          authUserId = authUser.id;
          if (authUser.user_metadata?.role) targetRole = authUser.user_metadata.role;
          await admin.auth.admin.updateUserById(authUser.id, {
            password: newPassword,
            email_confirm: true,
            user_metadata: { login_id: targetLoginId, role: targetRole, full_name: targetName },
          });
        }
      }

      await admin.from("gv_users").update({ must_change_password: false }).or(`login_id.ilike.${targetLoginId},login_id.ilike.${clean},id.ilike.${clean}`);
      return { success: true, authUserId };
    } catch {}
  }

  return { success: false };
}

export async function resolveLoginIdViaServer(identifier: string) {
  const backendUrls = Array.from(new Set([
    BACKEND_URL,
    "http://localhost:5000",
    ""
  ])).filter((u) => typeof u === "string");

  for (const baseUrl of backendUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const targetUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/users/resolve-login-id` : "/api/users/resolve-login-id";
      const res = await fetch(targetUrl, {
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
  }

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

export async function login(loginIdInput: string, passwordInput: string) {
  try {
    const rawInput = (loginIdInput || "").trim();
    const password = (passwordInput || "").trim();
    if (!rawInput) {
      return { success: false, error: "Please enter your Login ID or Email." };
    }
    if (!password) {
      return { success: false, error: "Please enter your password." };
    }

    let authUser: any = null;
    let profile: any = null;
    let authEmail: string | null = null;

    if (rawInput.includes("@")) {
      // ─── 1. EMAIL LOGIN FLOW ────────────────────────────────────────────────
      authEmail = rawInput.toLowerCase();

      // Authenticate directly against live Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError || !authData?.user) {
        return { success: false, error: authError?.message || "Invalid Email or password." };
      }

      authUser = authData.user;

      // Resolve linked live gv_users profile
      const { data: p1 } = await supabase
        .from("gv_users")
        .select("*")
        .or(`auth_user_id.eq.${authUser.id},id.eq.${authUser.id},email.ilike.${authEmail}`)
        .maybeSingle();

      if (p1) {
        profile = p1;
      } else {
        // Fallback: resolve profile via backend service if anon RLS policy restricts reading
        const serverRes = await resolveLoginIdViaServer(authEmail);
        if (serverRes?.profile) {
          profile = serverRes.profile;
        }
      }
    } else {
      // ─── 2. GENERATED LOGIN ID FLOW ──────────────────────────────────────────
      const cleanLoginId = rawInput;

      // Resolve live gv_users profile by login_id
      const { data: p1 } = await supabase
        .from("gv_users")
        .select("*")
        .ilike("login_id", cleanLoginId)
        .maybeSingle();

      if (p1) {
        profile = p1;
      } else {
        // Resolve via backend service
        const serverRes = await resolveLoginIdViaServer(cleanLoginId);
        if (serverRes?.profile) {
          profile = serverRes.profile;
        }
      }

      if (!profile) {
        return { success: false, error: "Invalid Login ID or password." };
      }

      // Check if account is inactive/disabled before attempting Auth
      if (profile.status === "inactive" || profile.status === "disabled") {
        return { success: false, error: "Your account is inactive. Please contact the administrator." };
      }

      // Resolve that user's authoritative live Auth email
      const serverRes = await resolveLoginIdViaServer(profile.login_id || cleanLoginId);
      authEmail = serverRes?.email || profile.email;

      if (!authEmail) {
        return { success: false, error: "Unable to resolve Auth account for this Login ID." };
      }

      // Authenticate against live Supabase Auth using resolved Auth email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError || !authData?.user) {
        return { success: false, error: authError?.message || "Invalid Login ID or password." };
      }

      authUser = authData.user;
    }

    // Ensure we have a profile loaded
    if (!profile) {
      const { data: p2 } = await supabase
        .from("gv_users")
        .select("*")
        .or(`auth_user_id.eq.${authUser.id},id.eq.${authUser.id},email.ilike.${authUser.email}`)
        .maybeSingle();
      if (p2) profile = p2;
    }

    if (!profile) {
      profile = {
        id: authUser.id,
        auth_user_id: authUser.id,
        login_id: authUser.user_metadata?.login_id || rawInput,
        email: authUser.email || authEmail,
        role: authUser.user_metadata?.role || "teacher",
        full_name: authUser.user_metadata?.full_name || "User Account",
        status: "active",
      };
    }

    if (profile.status === "inactive" || profile.status === "disabled") {
      await supabase.auth.signOut().catch(() => {});
      return {
        success: false,
        error: "Your account is inactive. Please contact the administrator.",
      };
    }

    return {
      success: true,
      user: authUser,
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