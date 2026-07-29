// Centralized read-tracking and delivery statistics store for ERP Circulars

const READ_STORAGE_KEY = "sunshine.circulars.read.v1";

interface ReadStore {
  [circularId: string]: string[]; // Array of user IDs or role keys who have read this circular
}

function getReadStore(): ReadStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReadStore(store: ReadStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(store));
  } catch {}
}

export function markCircularAsRead(circularId: string, roleOrUserId: string) {
  if (!circularId || !roleOrUserId) return;
  const store = getReadStore();
  const readers = store[circularId] || [];
  if (!readers.includes(roleOrUserId)) {
    store[circularId] = [...readers, roleOrUserId];
    saveReadStore(store);
  }
}

export function isCircularRead(circularId: string, roleOrUserId: string): boolean {
  if (!circularId || !roleOrUserId) return false;
  const store = getReadStore();
  const readers = store[circularId] || [];
  return readers.includes(roleOrUserId);
}

export function getUnreadCountForRole(circulars: any[], role: string): number {
  if (!Array.isArray(circulars) || circulars.length === 0) return 0;
  return circulars.filter((c) => {
    const isTarget = isCircularTargetedToRole(c, role);
    const read = isCircularRead(c.id, role);
    return isTarget && !read;
  }).length;
}

export function isCircularTargetedToRole(circular: any, role: string): boolean {
  if (!circular) return false;
  if (role === "principal" || role === "super-admin" || role === "admin") return true;

  const recipients = Array.isArray(circular.recipients)
    ? circular.recipients
    : typeof circular.target_audience === "string"
    ? circular.target_audience.split(",")
    : ["All"];

  const recLower = recipients.map((r: string) => r.toLowerCase().trim());
  if (recLower.includes("everyone") || recLower.includes("all")) return true;

  if (role === "teacher" && (recLower.includes("teachers") || recLower.includes("teacher"))) return true;
  if (role === "parent" && (recLower.includes("parents") || recLower.includes("parent"))) return true;
  if (role === "office" && (recLower.includes("office staff") || recLower.includes("office"))) return true;

  return false;
}

export function getDeliveryStats(circularId: string, recipients?: string[]) {
  const store = getReadStore();
  const readers = store[circularId] || [];
  const readCount = readers.length;

  let totalSent = 45; // Base recipient count for school branch
  if (Array.isArray(recipients) && recipients.length > 0) {
    if (recipients.includes("Parents")) totalSent += 80;
    if (recipients.includes("Teachers")) totalSent += 20;
    if (recipients.includes("Office Staff")) totalSent += 10;
  }

  const unreadCount = Math.max(0, totalSent - readCount);
  return {
    totalSent,
    readCount,
    unreadCount,
    readPercentage: Math.min(100, Math.round((readCount / (totalSent || 1)) * 100)),
  };
}
