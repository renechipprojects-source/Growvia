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

    // 1. Primary lookup via frontendSupabase gv_users using exact field queries
    try {
      const { data: d1 } = await supabase.from("gv_users").select("*").ilike("login_id", rawId).maybeSingle();
      if (d1) userData = d1;
      else {
        const { data: d2 } = await supabase.from("gv_users").select("*").ilike("email", rawId).maybeSingle();
        if (d2) userData = d2;
        else {
          const { data: d3 } = await supabase.from("gv_users").select("*").ilike("login_id", id).maybeSingle();
          if (d3) userData = d3;
        }
      }
    } catch {}

    // 2. If RLS blocked anon query or user not found directly, resolve via server endpoint
    if (!userData) {
      const serverRes = await resolveLoginIdViaServer(id) || await resolveLoginIdViaServer(rawId);
      if (serverRes?.profile) {
        userData = serverRes.profile;
      }
    }

    // 3. Fallback: check stored local credentials
    if (!userData && !rawId.includes("@")) {
      const teacherCreds = listTeacherCredentials();
      const matchTeach = teacherCreds.find((c) => c.loginId.toLowerCase() === cleanId || c.loginId.toLowerCase() === id.toLowerCase() || c.loginId.toLowerCase() === rawId.toLowerCase());
      if (matchTeach) {
        userData = {
          id: `TCH-${matchTeach.teacherId}`,
          login_id: matchTeach.loginId,
          email: `${matchTeach.loginId.toLowerCase()}@sunshineschool.edu`,
          role: "teacher",
          full_name: "Teacher User",
          status: matchTeach.status.toLowerCase(),
        };
      } else {
        const parentCreds = listParentCredentials();
        const matchPar = parentCreds.find((c) => c.loginId.toLowerCase() === cleanId || c.loginId.toLowerCase() === id.toLowerCase() || c.loginId.toLowerCase() === rawId.toLowerCase());
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

    const emailCandidates: string[] = [];
    if (rawId.includes("@")) {
      emailCandidates.push(rawId.trim().toLowerCase());
      if (profile?.email) emailCandidates.push(profile.email.trim().toLowerCase());
    } else {
      if (profile?.email) emailCandidates.push(profile.email.trim().toLowerCase());
      emailCandidates.push(`${rawId.toLowerCase()}@sunshineschool.edu`);
      emailCandidates.push(`${rawId.toLowerCase()}@growvia.edu`);
      emailCandidates.push(`${id.toLowerCase()}@sunshineschool.edu`);
      emailCandidates.push(`${id.toLowerCase()}@growvia.edu`);
      emailCandidates.push(`${cleanId}@sunshineschool.edu`);
      emailCandidates.push(`${cleanId}@growvia.edu`);
    }

    // Remove duplicates
    const uniqueCandidates = Array.from(new Set(emailCandidates.filter(Boolean)));

    let authResult: any = null;
    let successfulEmail: string | null = null;

    for (const candEmail of uniqueCandidates) {
      try {
        const res = await supabase.auth.signInWithPassword({
          email: candEmail,
          password,
        });
        if (res.data?.user) {
          authResult = res;
          successfulEmail = candEmail;
          break;
        }
      } catch {}
    }

    // If initial sign-in failed, try resolving exact auth email via server endpoint
    if (!authResult?.data?.user) {
      const serverRes = await resolveLoginIdViaServer(rawId) || await resolveLoginIdViaServer(id);
      if (serverRes?.email) {
        try {
          const res = await supabase.auth.signInWithPassword({
            email: serverRes.email,
            password,
          });
          if (res.data?.user) {
            authResult = res;
            successfulEmail = serverRes.email;
            if (serverRes.profile) profile = serverRes.profile;
          }
        } catch {}
      }
    }

    // Require successful password verification
    if (!authResult?.data?.user) {
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
        email: successfulEmail || profile?.email || `${id.toLowerCase()}@sunshineschool.edu`,
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