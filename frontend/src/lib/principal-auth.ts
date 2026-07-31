// Thin shim over the Unified Access Hub session so the Principal Portal
// integrates with the shared login at "/". The hub stores the active
// session under "sunshine.auth" (see src/routes/index.tsx).

const HUB_KEYS = ["sunshine.auth"];

export type PrincipalSession = {
  loginId: string;
  name: string;
  role: "principal";
  loggedInAt: string;
};

function readHubSession(): { role?: string; email?: string; name?: string } | null {
  if (typeof window === "undefined") return null;
  for (const key of HUB_KEYS) {
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getSession(): PrincipalSession | null {
  const s = readHubSession();
  if (!s || s.role !== "principal") return null;
  return {
    loginId: s.email ?? "principal",
    name: s.name ?? "Principal",
    role: "principal",
    loggedInAt: new Date().toISOString(),
  };
}

export function isAuthed(): boolean {
  return !!getSession();
}

export function login(): PrincipalSession | null {
  return getSession();
}

export function logout() {
  if (typeof window === "undefined") return;
  for (const key of HUB_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}
