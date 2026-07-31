// Principal profile store — persists to localStorage and emits to listeners so
// the header, sidebar, dashboard and profile page all stay in sync.
import { getSession } from "./principal-auth";

export type PrincipalProfile = {
  name: string;
  email: string;
  phone: string;
  designation: string;
  address: string;
  photo: string | null;
};

const KEY = "sunshine.principal.profile";
type Listener = () => void;
const listeners = new Set<Listener>();

function defaultProfile(): PrincipalProfile {
  const session = getSession();
  return {
    name: session?.name ?? "Dr. Anita Sharma",
    email: "principal@brightbloom.edu",
    phone: "+91 98765 43210",
    designation: "Principal",
    address: "Sunshine Play School Campus, Whitefield, Bengaluru 560066",
    photo: null,
  };
}

function read(): PrincipalProfile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultProfile();
}

let snapshot: PrincipalProfile = read();

export function subscribePrincipalProfile(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getPrincipalProfile(): PrincipalProfile {
  return snapshot;
}

export function updatePrincipalProfile(patch: Partial<PrincipalProfile>) {
  snapshot = { ...snapshot, ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore */
    }
  }
  for (const l of listeners) l();
}

// -- Password (demo) --
const PW_KEY = "sunshine.principal.password";
export function getPrincipalPassword(): string {
  if (typeof window === "undefined") return "demo";
  return window.localStorage.getItem(PW_KEY) ?? "demo";
}
export function setPrincipalPassword(next: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PW_KEY, next);
}

// -- Notification preferences --
const PREFS_KEY = "sunshine.principal.notif-prefs";
export type PrincipalNotifPrefs = {
  circulars: boolean;
  attendance: boolean;
  leaves: boolean;
  events: boolean;
  emailDigest: boolean;
};
const DEFAULT_PREFS: PrincipalNotifPrefs = {
  circulars: true,
  attendance: true,
  leaves: true,
  events: false,
  emailDigest: true,
};
export function getPrincipalNotifPrefs(): PrincipalNotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS;
}
export function setPrincipalNotifPrefs(prefs: PrincipalNotifPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
