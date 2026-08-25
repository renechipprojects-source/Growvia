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
      .from("gv_communications")
      .select("*")
      .eq("message_type", "message");

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

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sunshine_circulars_read"));
    }

    supabase.from("gv_communications").insert([
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

export function markAllCircularsAsRead(role: string, circulars: any[] = []) {
  if (!role) return;
  const store = getReadStore(READ_STORAGE_KEY);
  store[`__ALL_READ__${role}`] = ["true"];

  if (Array.isArray(circulars) && circulars.length > 0) {
    circulars.forEach((c) => {
      if (c && (c.id || c.title)) {
        const id = c.id || c.title;
        store[id] = Array.from(new Set([...(store[id] || []), role, "all"]));
        store[`n-cir-${id}`] = Array.from(new Set([...(store[`n-cir-${id}`] || []), role, "all"]));
      }
    });
  }

  saveReadStore(store, READ_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sunshine_circulars_read"));
  }
}

export function isCircularRead(circularId: string, roleOrUserId: string): boolean {
  if (!circularId || !roleOrUserId) return false;
  const store = getReadStore(READ_STORAGE_KEY);
  if (store[`__ALL_READ__${roleOrUserId}`]?.includes("true")) return true;
  const readers = store[circularId] || [];
  return readers.includes(roleOrUserId) || readers.includes("all");
}

export function acknowledgeCircular(circularId: string, roleOrUserId: string) {
  if (!circularId || !roleOrUserId) return;
  markCircularAsRead(circularId, roleOrUserId);
  const store = getReadStore(ACK_STORAGE_KEY);
  const acks = store[circularId] || [];
  if (!acks.includes(roleOrUserId)) {
    store[circularId] = [...acks, roleOrUserId];
    saveReadStore(store, ACK_STORAGE_KEY);

    Promise.resolve(
      supabase.from("gv_communications").insert([
        {
          sender_id: "SYSTEM",
          sender_name: "CircularReadStore",
          sender_role: "system",
          receiver_id: circularId,
          receiver_role: "ack",
          message_text: `READ_ACK:${roleOrUserId}`,
          read_status: true,
        }
      ])
    ).then(() => {});
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
  const store = getReadStore(READ_STORAGE_KEY);
  if (store[`__ALL_READ__${role}`]?.includes("true")) return 0;

  return circulars.filter((c) => {
    const isTarget = isCircularTargetedToRole(c, role);
    const read =
      isCircularRead(c.id, role) ||
      isCircularRead(c.title, role) ||
      isCircularRead(`n-cir-${c.id}`, role) ||
      isCircularRead(`n-cir-${c.title}`, role);
    return isTarget && !read;
  }).length;
}

export function normalizeRoleToCanonical(roleStr: string): string {
  const s = (roleStr || "").toLowerCase().trim();
  if (s === "admin" || s === "super-admin" || s === "administrator") return "admin";
  if (s === "principal" || s === "headmaster" || s === "director") return "principal";
  if (s === "teachers" || s === "teacher" || s === "faculty") return "teacher";
  if (s === "office staff" || s === "office" || s === "staff" || s === "caretaker" || s === "helper") return "office";
  if (s === "parents" || s === "parent" || s === "student" || s === "students" || s === "guardian") return "parent";
  if (s === "all" || s === "everyone" || s === "all roles" || s === "all parents" || s === "all teachers") return "all";
  return s;
}

export function isCircularTargetedToRole(circular: any, role: string): boolean {
  if (!circular) return false;
  const canonicalUserRole = normalizeRoleToCanonical(role);
  if (canonicalUserRole === "admin" || canonicalUserRole === "principal") return true;

  const rawTargets = circular.recipients || circular.target_audience || circular.recipient_role || "all";
  const rawList: string[] = Array.isArray(rawTargets)
    ? rawTargets
    : typeof rawTargets === "string"
    ? rawTargets.split(",")
    : ["all"];

  const canonicalTargets = rawList
    .flatMap((r: any) => (typeof r === "string" ? r.split(",") : [String(r)]))
    .map((r: string) => normalizeRoleToCanonical(r))
    .filter(Boolean);

  if (canonicalTargets.includes("all")) return true;
  return canonicalTargets.includes(canonicalUserRole);
}

import { fetchStudents, fetchTeachers } from "./supabaseService";

export async function fetchDeliveryStats(circularId: string, recipients?: string[]) {
  await syncReadStoreFromSupabase();

  const readStore = getReadStore(READ_STORAGE_KEY);
  const ackStore = getReadStore(ACK_STORAGE_KEY);

  const readers = (readStore[circularId] || []).filter((r) => r !== "system" && r !== "all");
  const acks = (ackStore[circularId] || []).filter((r) => r !== "system" && r !== "all");

  const [{ data: students }, { data: teachers }] = await Promise.all([
    fetchStudents(),
    fetchTeachers(),
  ]);

  const rawList: string[] = Array.isArray(recipients) && recipients.length > 0
    ? recipients
    : ["Parents", "Teachers"];

  const canonicalTargets = rawList
    .flatMap((r: any) => (typeof r === "string" ? r.split(",") : [String(r)]))
    .map((r: string) => r.trim());

  let totalSent = 0;

  const isAll = canonicalTargets.some((t) => {
    const l = t.toLowerCase();
    return l === "all" || l === "everyone" || l === "all roles";
  });

  const includesParents = isAll || canonicalTargets.some((t) => {
    const l = t.toLowerCase();
    return l === "parents" || l === "parent" || l === "all parents" || l === "students" || l === "all students";
  });

  const includesStaff = isAll || canonicalTargets.some((t) => {
    const l = t.toLowerCase();
    return l === "teachers" || l === "teacher" || l === "all teachers" || l === "staff" || l === "all staff" || l === "office staff" || l === "office";
  });

  if (includesParents) {
    totalSent += (students || []).length;
  } else {
    // Check specific class targeted recipients (e.g. "Nursery", "Grade 1")
    const targetedClasses = canonicalTargets.map((t) => t.toLowerCase());
    const matchingStudents = (students || []).filter((s) =>
      targetedClasses.some((tc) => tc === s.className?.toLowerCase() || tc === `class ${s.className}`.toLowerCase())
    );
    totalSent += matchingStudents.length;
  }

  if (includesStaff) {
    totalSent += (teachers || []).length;
  }

  if (totalSent === 0 && (students?.length || teachers?.length)) {
    totalSent = (students || []).length + (teachers || []).length;
  }

  const readCount = Math.min(readers.length, totalSent);
  const ackCount = Math.min(acks.length, totalSent);

  const unreadCount = Math.max(0, totalSent - readCount);
  const pendingAckCount = Math.max(0, totalSent - ackCount);
  const readPercentage = totalSent > 0 ? Math.min(100, Math.round((readCount / totalSent) * 100)) : 0;

  return {
    totalSent,
    readCount,
    ackCount,
    unreadCount,
    pendingAckCount,
    readPercentage,
  };
}

export function getDeliveryStats(circularId: string, recipients?: string[], totalSentOverride?: number) {
  const readStore = getReadStore(READ_STORAGE_KEY);
  const ackStore = getReadStore(ACK_STORAGE_KEY);

  const readers = (readStore[circularId] || []).filter((r) => r !== "system" && r !== "all");
  const acks = (ackStore[circularId] || []).filter((r) => r !== "system" && r !== "all");

  const readCount = readers.length;
  const ackCount = acks.length;

  const totalSent = typeof totalSentOverride === "number" && totalSentOverride > 0 ? totalSentOverride : 0;
  const unreadCount = Math.max(0, totalSent - readCount);
  const pendingAckCount = Math.max(0, totalSent - ackCount);

  return {
    totalSent,
    readCount,
    ackCount,
    unreadCount,
    pendingAckCount,
    readPercentage: totalSent > 0 ? Math.min(100, Math.round((readCount / totalSent) * 100)) : 0,
  };
}
