// Helpers for the Admin portal to sign out cleanly.
const KEYS = ["sunshine.auth"];

export function adminSignOut() {
  if (typeof window === "undefined") return;
  for (const key of KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
  // Replace history so the browser Back button cannot restore a protected page.
  try {
    window.history.replaceState(null, "", "/");
  } catch {
    /* ignore */
  }
  window.location.replace("/");
}
