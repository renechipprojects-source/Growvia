// Centralized read-tracking, acknowledgement, and delivery statistics store for ERP Circulars
import { supabase } from "./supabase";

const READ_STORAGE_KEY = "sunshine.circulars.read.v1";
const ACK_STORAGE_KEY = "sunshine.circulars.ack.v1";

interface ReadStore {
  [circularId: string]: string[]; // Array of user IDs or role keys who have read this circular
}

function getReadStore(key = READ_STORAGE_KEY): ReadStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReadStore(store: ReadStore, key = READ_STORAGE_KEY) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {}
}

export async function syncReadStoreFromSupabase() {
  try {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("sender_id", "SYSTEM")
      .like("message_text", "READ_ACK:%");

    if (data && data.length > 0) {
      const readStore = getReadStore(READ_STORAGE_KEY);
      const ackStore = getReadStore(ACK_STORAGE_KEY);

      data.forEach((item: any) => {
        const parts = item.message_text.split(":");
        if (parts.length >= 2) {
          const circularId = item.receiver_id;
          const userKey = parts[1];

          const readers = readStore[circularId] || [];
          if (!readers.includes(userKey)) {
            readStore[circularId] = [...readers, userKey];
          }

          const acks = ackStore[circularId] || [];
          if (!acks.includes(userKey)) {
            ackStore[circularId] = [...acks, userKey];
          }
        }
      });

      saveReadStore(readStore, READ_STORAGE_KEY);
      saveReadStore(ackStore, ACK_STORAGE_KEY);
    }
  } catch {}
}

export function markCircularAsRead(circularId: string, roleOrUserId: string) {
  if (!circularId || !roleOrUserId) return;
  const store = getReadStore(READ_STORAGE_KEY);
  const readers = store[circularId] || [];
  if (!readers.includes(roleOrUserId)) {
    store[circularId] = [...readers, roleOrUserId];
    saveReadStore(store, READ_STORAGE_KEY);

    supabase.from("messages").insert([
      {
        sender_id: "SYSTEM",
        sender_name: "CircularReadStore",
        sender_role: "system",
        receiver_id: circularId,
        receiver_role: "read",
        message_text: `READ_ACK:${roleOrUserId}`,
        read_status: true,
      }
    ]).then(() => {});
  }
}

export function isCircularRead(circularId: string, roleOrUserId: string): boolean {
  if (!circularId || !roleOrUserId) return false;
  const store = getReadStore(READ_STORAGE_KEY);
  const readers = store[circularId] || [];
  return readers.includes(roleOrUserId);
}

export function acknowledgeCircular(circularId: string, roleOrUserId: string) {
  if (!circularId || !roleOrUserId) return;
  markCircularAsRead(circularId, roleOrUserId);
  const store = getReadStore(ACK_STORAGE_KEY);
  const acks = store[circularId] || [];
  if (!acks.includes(roleOrUserId)) {
    store[circularId] = [...acks, roleOrUserId];
    saveReadStore(store, ACK_STORAGE_KEY);

    supabase.from("messages").insert([
      {
        sender_id: "SYSTEM",
        sender_name: "CircularReadStore",
        sender_role: "system",
        receiver_id: circularId,
        receiver_role: "ack",
        message_text: `READ_ACK:${roleOrUserId}`,
        read_status: true,
      }
    ]).then(() => {});
  }
}

export function isCircularAcknowledged(circularId: string, roleOrUserId: string): boolean {
  if (!circularId || !roleOrUserId) return false;
  const store = getReadStore(ACK_STORAGE_KEY);
  const acks = store[circularId] || [];
  return acks.includes(roleOrUserId);
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
  const readStore = getReadStore(READ_STORAGE_KEY);
  const ackStore = getReadStore(ACK_STORAGE_KEY);

  const readers = readStore[circularId] || [];
  const acks = ackStore[circularId] || [];
  const readCount = readers.length;
  const ackCount = acks.length;

  let totalSent = 45; // Base recipient count
  if (Array.isArray(recipients) && recipients.length > 0) {
    if (recipients.includes("Parents")) totalSent += 80;
    if (recipients.includes("Teachers")) totalSent += 20;
    if (recipients.includes("Office Staff")) totalSent += 10;
  }

  const unreadCount = Math.max(0, totalSent - readCount);
  const pendingAckCount = Math.max(0, totalSent - ackCount);

  return {
    totalSent,
    readCount,
    ackCount,
    unreadCount,
    pendingAckCount,
    readPercentage: Math.min(100, Math.round((readCount / (totalSent || 1)) * 100)),
  };
}
