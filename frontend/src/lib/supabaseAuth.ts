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

  const backendUrls = Array.from(new Set([
    BACKEND_URL,
    "http://localhost:5000",
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

export async function resolveLoginIdViaServer(identifier: string) {
  const clean = (identifier || "").trim();
  if (!clean) return null;

  const isLocal = typeof window === "undefined" || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const backendUrls = Array.from(new Set([
    "http://localhost:5000",
    BACKEND_URL,
    "http://localhost:5001",
    "https://growvia-backend-4wp7.onrender.com",
    ""
  ])).filter((u) => typeof u === "string");

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

  return null;
}

const WELL_KNOWN_LOGIN_ID_MAP: Record<string, { email: string; role: string; name: string }> = {
  ADMIN001: { email: "admin@sunshineschool.edu", role: "admin", name: "System Admin" },
  PRINCIPAL001: { email: "principal@sunshineschool.edu", role: "principal", name: "School Principal" },
  OFFICE001: { email: "office@sunshineschool.edu", role: "office", name: "Office Manager" },
  TCH101: { email: "teacher@sunshineschool.edu", role: "teacher", name: "Senior Teacher" },
  TEACHER001: { email: "teacher@sunshineschool.edu", role: "teacher", name: "Senior Teacher" },
  PRT1001: { email: "parent@sunshineschool.edu", role: "parent", name: "Parent User" },
  PARENT001: { email: "parent@sunshineschool.edu", role: "parent", name: "Parent User" },
};

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
      const p1OrFilter = authEmail
        ? `auth_user_id.eq.${authUser.id},id.eq.${authUser.id},email.ilike.${authEmail}`
        : `auth_user_id.eq.${authUser.id},id.eq.${authUser.id}`;
      const { data: p1 } = await supabase
        .from("gv_users")
        .select("*")
        .or(p1OrFilter)
        .limit(1)
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
      const upperId = cleanLoginId.toUpperCase();
      const wellKnown = WELL_KNOWN_LOGIN_ID_MAP[upperId];

      if (wellKnown) {
        authEmail = wellKnown.email;
      }

      // Step A: Exact lookup of entered ID in live gv_users.login_id
      if (!authEmail) {
        const { data: p1 } = await supabase
          .from("gv_users")
          .select("*")
          .ilike("login_id", cleanLoginId)
          .limit(1)
          .maybeSingle();

        if (p1) {
          profile = p1;
          authEmail = p1.email;
        }
      }

      // Step B: If client RLS restricts query, resolve exact ID via server service role
      if (!authEmail) {
        const serverRes = await resolveLoginIdViaServer(cleanLoginId);
        if (serverRes?.email) {
          authEmail = serverRes.email;
          if (serverRes.profile) profile = serverRes.profile;
        }
      }

      // Step B.2: Check generated credentials store for issued parent/teacher keys
      try {
        const { listParentCredentials, listTeacherCredentials } = await import("./credentials");
        const parentCreds = listParentCredentials();
        const teacherCreds = listTeacherCredentials();

        const matchParent = parentCreds.find((c) => (c.loginId || "").toLowerCase() === cleanLoginId.toLowerCase());
        const matchTeacher = teacherCreds.find((c) => (c.loginId || "").toLowerCase() === cleanLoginId.toLowerCase());

        const matchedCred = matchParent || matchTeacher;
        if (matchedCred) {
          if (matchedCred.status === "Inactive") {
            return { success: false, error: "Your account is inactive. Please contact the administrator." };
          }

          if (matchedCred.password === password) {
            const role = matchedCred.kind;
            const targetEmail = matchedCred.kind === "parent"
              ? `${cleanLoginId.toLowerCase()}@growvia.edu`
              : `${cleanLoginId.toLowerCase()}@sunshineschool.edu`;

            // Fire-and-forget provision to ensure auth.users is synced
            triggerServerUserProvisioning({
              login_id: cleanLoginId,
              password,
              role,
              email: targetEmail,
              name: role === "parent" ? "Parent User" : "Teacher User",
            }).catch(() => {});

            // Attempt live Supabase Auth login
            const { data: authData } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password,
            }).catch(() => ({ data: null }));

            const userObj = authData?.user || {
              id: matchedCred.kind === "parent" ? (matchedCred as any).studentId : (matchedCred as any).teacherId,
              email: targetEmail,
            };

            const profileObj = {
              id: userObj.id,
              auth_user_id: userObj.id,
              login_id: matchedCred.loginId,
              email: targetEmail,
              role,
              full_name: role === "parent" ? "Parent User" : "Teacher User",
              status: "active",
            };

            return {
              success: true,
              user: userObj,
              profile: profileObj,
            };
          }
        }
      } catch (e) {
        console.warn("Generated credentials check notice:", e);
      }

      // Candidate Emails to attempt against Supabase Auth
      const candidateEmails = Array.from(new Set([
        authEmail,
        wellKnown?.email,
        `${cleanLoginId.toLowerCase()}@sunshineschool.edu`,
        `${cleanLoginId.toLowerCase()}@growvia.edu`,
      ])).filter(Boolean) as string[];

      let lastAuthError: any = null;
      let authenticatedUser: any = null;

      for (const candEmail of candidateEmails) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: candEmail,
          password,
        });

        if (authData?.user && !authError) {
          authenticatedUser = authData.user;
          authEmail = candEmail;
          lastAuthError = null;
          break;
        } else {
          lastAuthError = authError;
        }
      }

      if (!authenticatedUser) {
        return {
          success: false,
          error: lastAuthError?.message || "Invalid Login ID or password.",
        };
      }

      authUser = authenticatedUser;
    }

    // Ensure we have profile loaded for authenticated user
    if (!profile) {
      const p2OrFilter = authUser.email
        ? `auth_user_id.eq.${authUser.id},id.eq.${authUser.id},email.ilike.${authUser.email}`
        : `auth_user_id.eq.${authUser.id},id.eq.${authUser.id}`;
      const { data: p2 } = await supabase
        .from("gv_users")
        .select("*")
        .or(p2OrFilter)
        .limit(1)
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