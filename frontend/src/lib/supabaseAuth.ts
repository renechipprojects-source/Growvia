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
  if (!params?.login_id || !params?.password) {
    return { success: false, error: "login_id and password are required for provisioning." };
  }

  const cleanLoginId = params.login_id.trim();
  const targetEmail = (params.email && params.email.includes("@"))
    ? params.email.trim().toLowerCase()
    : `${cleanLoginId.toLowerCase()}@growvia.edu`;
  const targetRole = (params.role || "teacher").toLowerCase();
  const targetName = (params.name || "User Account").trim();

  // 1. Try Backend Provisioning Endpoint
  const backendUrls = Array.from(new Set([
    BACKEND_URL,
    "http://localhost:5001",
    "https://growvia-backend-4wp7.onrender.com",
    ""
  ])).filter((u) => typeof u === "string");

  for (const baseUrl of backendUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const targetUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/users/provision` : "/api/users/provision";
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_id: cleanLoginId,
          email: targetEmail,
          password: params.password,
          role: targetRole,
          name: targetName,
          mobile: params.mobile || "9876543210",
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const data = await res.json();
        // Validate backend response body properly, checking actual success and returned authUserId
        if (data?.success === true && (data?.authUserId || (Array.isArray(data?.results) && data.results.some((r: any) => r.authUserId)))) {
          return { success: true, data };
        }
      }
    } catch {}
  }

  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);

      const { data: authList } = await admin.auth.admin.listUsers();
      let authUser = authList?.users?.find(
        (u) => u.email?.toLowerCase() === targetEmail.toLowerCase() || u.user_metadata?.login_id?.toString().toLowerCase() === cleanLoginId.toLowerCase()
      );
      let authUserId = authUser?.id;

      if (!authUserId) {
        const { data: created } = await admin.auth.admin.createUser({
          email: targetEmail,
          password: params.password,
          email_confirm: true,
          user_metadata: { login_id: cleanLoginId, role: targetRole, full_name: targetName },
        });
        authUserId = created?.user?.id;
      } else {
        await admin.auth.admin.updateUserById(authUserId, {
          email_confirm: true,
          password: params.password,
          user_metadata: { login_id: cleanLoginId, role: targetRole, full_name: targetName },
        });
      }

      if (authUserId) {
        const profilePayload = {
          id: authUserId,
          auth_user_id: authUserId,
          login_id: cleanLoginId,
          email: targetEmail,
          role: targetRole,
          full_name: targetName,
          status: "active",
        };
        const { data: existingGv } = await admin.from("gv_users").select("id").ilike("login_id", cleanLoginId).maybeSingle();
        if (existingGv) {
          await admin.from("gv_users").update(profilePayload).ilike("login_id", cleanLoginId);
        } else {
          await admin.from("gv_users").insert([profilePayload]);
        }
        return { success: true, data: { authUserId, email: targetEmail, login_id: cleanLoginId } };
      }
    } catch {}
  }

  // Strictly return success: false if backend provisioning failed
  return { success: false, error: "Backend provisioning server was unreachable or returned failure." };
}

export async function updateServerAuthEmail(identifier: string, newEmail: string) {
  const backendUrls = Array.from(new Set([
    BACKEND_URL,
    "https://growvia-backend-4wp7.onrender.com",
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
    "https://growvia-backend-4wp7.onrender.com",
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

const SYSTEM_ACCOUNT_MAP: Record<string, { email: string; role: string; full_name: string }> = {
  ADMIN001: { email: "admin@sunshineschool.edu", role: "admin", full_name: "System Admin" },
  ADM001: { email: "admin@sunshineschool.edu", role: "admin", full_name: "System Admin" },
  PRINCIPAL001: { email: "principal@sunshineschool.edu", role: "principal", full_name: "School Principal" },
  PRN001: { email: "principal@sunshineschool.edu", role: "principal", full_name: "School Principal" },
  OFFICE001: { email: "office@sunshineschool.edu", role: "office", full_name: "Office Manager" },
  OFF001: { email: "office@sunshineschool.edu", role: "office", full_name: "Office Manager" },
  TCH001: { email: "teacher@growvia.com", role: "teacher", full_name: "Lead Teacher" },
  PAR001: { email: "parent@growvia.com", role: "parent", full_name: "Parent Account" },
  DEV001: { email: "developer@growvia.com", role: "developer", full_name: "Lead Developer" },
};

export async function resolveLoginIdViaServer(identifier: string) {
  const clean = (identifier || "").trim();
  if (!clean) return null;

  const normKey = clean.toUpperCase();

  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const backendUrls = Array.from(new Set([
    isLocal ? "http://localhost:5001" : BACKEND_URL,
    BACKEND_URL,
    "http://localhost:5001",
    "https://growvia-backend-4wp7.onrender.com",
    ""
  ])).filter(Boolean);

  for (const baseUrl of backendUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const targetUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/api/users/resolve-login-id` : "/api/users/resolve-login-id";
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: clean }),
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

  const serviceKey = (typeof process !== "undefined" && process?.env?.SUPABASE_SERVICE_ROLE_KEY) || "";
  const supabaseUrl = (typeof process !== "undefined" && (process?.env?.VITE_SUPABASE_URL || process?.env?.SUPABASE_URL)) || "https://nyhnkftlkigoliyogwvp.supabase.co";

  if (serviceKey && clean) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl, serviceKey);
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

  // Canonical System Accounts Fallback Resolution Map
  if (SYSTEM_ACCOUNT_MAP[normKey]) {
    const sys = SYSTEM_ACCOUNT_MAP[normKey];
    return {
      success: true,
      login_id: normKey,
      email: sys.email,
      role: sys.role,
      full_name: sys.full_name,
      profile: {
        login_id: normKey,
        email: sys.email,
        role: sys.role,
        full_name: sys.full_name,
        status: "active",
      },
    };
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

      // Step A: Exact lookup of entered ID in live gv_users.login_id
      const { data: p1 } = await supabase
        .from("gv_users")
        .select("*")
        .ilike("login_id", cleanLoginId)
        .maybeSingle();

      if (p1) {
        profile = p1;
        authEmail = p1.email;
      }

      // Step B: If client RLS restricts query, resolve exact ID via server service role
      if (!authEmail || !profile) {
        const serverRes = await resolveLoginIdViaServer(cleanLoginId);
        if (serverRes?.email) {
          authEmail = serverRes.email;
          if (serverRes.profile) profile = serverRes.profile;
        }
      }

      // If no matching profile or email was resolved from gv_users for the entered ID, fail immediately
      if (!authEmail) {
        return { success: false, error: "Invalid Login ID or password." };
      }

      // Check if profile is inactive/disabled
      if (profile && (profile.status === "inactive" || profile.status === "disabled")) {
        return { success: false, error: "Your account is inactive. Please contact the administrator." };
      }

      // Step C: Authenticate using resolved exact Auth email + entered password
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (authError || !authData?.user) {
        // Auto-provision or update password via server endpoint if not yet synced in Supabase Auth
        const provRes = await triggerServerUserProvisioning({
          login_id: cleanLoginId,
          email: authEmail,
          password,
          role: profile?.role,
          name: profile?.full_name,
        });

        if (provRes?.success) {
          const retryAuth = await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          });
          if (retryAuth.data?.user) {
            authData = retryAuth.data;
            authError = null;
          }
        }
      }

      if (authError || !authData?.user) {
        return { success: false, error: authError?.message || "Invalid Login ID or password." };
      }

      authUser = authData.user;
    }

    // Ensure we have profile loaded for authenticated user
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