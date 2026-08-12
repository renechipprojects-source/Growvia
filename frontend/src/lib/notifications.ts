// Centralized live notification service with role-based filtering, subscribe/emit,
// LocalStorage persistence, live Supabase sync, and zero mock data.
import type { Role } from "./roleConfig";
export type { Role };

export type NotificationPriority = "low" | "medium" | "high";
export type NotificationModule =
  | "homework"
  | "attendance"
  | "remarks"
  | "diary"
  | "announcement"
  | "leave"
  | "fees"
  | "admissions"
  | "enquiries"
  | "visits"
  | "inventory"
  | "messages"
  | "staff"
  | "system";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  module: NotificationModule;
  timestamp: number;
  read: boolean;
  priority: NotificationPriority;
  roles: Role[]; // which roles should see this
  link?: string; // route to open on click
  refId?: string; // related student/user id
}

type Listener = () => void;

const NOTIF_STORAGE_KEY = "sunshine.notifications.v3";

const LINK_BY_MODULE: Partial<Record<NotificationModule, Partial<Record<Role, string>>>> = {
  homework: {
    parent: "/parent/homework",
    teacher: "/teacher/homework",
  },
  attendance: {
    parent: "/parent/attendance",
    teacher: "/teacher/attendance",
    principal: "/principal/attendance",
  },
  remarks: { parent: "/parent/diary", teacher: "/teacher/progress" },
  diary: { parent: "/parent/diary", teacher: "/teacher/diary" },
  announcement: {
    parent: "/parent",
    teacher: "/teacher",
    office: "/office",
    principal: "/principal/announcements",
    "super-admin": "/super-admin",
  },
  leave: {
    parent: "/parent/leave",
    teacher: "/teacher/leave-requests",
    principal: "/principal",
    "super-admin": "/super-admin",
  },
  fees: { parent: "/parent/fees", office: "/office/fees", "super-admin": "/super-admin/revenue" },
  admissions: { office: "/office/admissions", principal: "/principal/students", "super-admin": "/super-admin/users" },
  messages: { parent: "/parent/messages", teacher: "/teacher/messages", office: "/office/messages" },
  staff: { principal: "/principal/teachers", "super-admin": "/super-admin/users" },
  system: { "super-admin": "/super-admin", principal: "/principal" },
};

function getInitialNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy mock seeds
        const clean = parsed.filter((n: any) => n && n.id && !String(n.id).startsWith("n-seed-"));
        return clean;
      }
    }
  } catch {}
  return [];
}

let store: AppNotification[] = getInitialNotifications();
const listeners = new Set<Listener>();
const listCache = new Map<Role, AppNotification[]>();
const unreadCache = new Map<Role, number>();

function saveStore(newStore: AppNotification[]) {
  // Purge any mock seeds
  store = newStore.filter((n) => !n.id.startsWith("n-seed-"));
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(store));
      window.dispatchEvent(new CustomEvent("sunshine-notification"));
    } catch {}
  }
  emit();
}

function emit() {
  listCache.clear();
  unreadCache.clear();
  for (const l of listeners) l();
}

const ALLOWED_MODULES_BY_ROLE: Record<Role | "developer", NotificationModule[]> = {
  office: ["admissions", "fees", "enquiries", "visits", "announcement", "messages", "inventory"],
  principal: ["leave", "announcement", "staff"],
  teacher: ["homework", "leave", "messages", "announcement"],
  parent: ["fees", "announcement", "homework", "attendance", "messages", "leave"],
  "super-admin": ["system", "announcement", "staff", "admissions", "fees"],
  developer: ["system"],
};

export function isNotificationAllowedForRole(n: AppNotification, role: Role): boolean {
  if (!n || !n.roles || !n.roles.includes(role)) return false;
  const allowed = ALLOWED_MODULES_BY_ROLE[role] || [];
  return allowed.includes(n.module);
}

const DELETED_NOTIF_KEY = "sunshine.deleted_notifications.v1";

function getDeletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_NOTIF_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

import { supabase } from "./supabase";

function addDeletedId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getDeletedIds();
    set.add(id);
    window.localStorage.setItem(DELETED_NOTIF_KEY, JSON.stringify(Array.from(set)));
  } catch {}

  Promise.resolve(
    supabase.from("gv_requests").upsert([
      {
        id: `del_notif_${id}`,
        request_type: "deleted_notification",
        applicant_or_child_name: id,
        reason_or_notes: JSON.stringify({ deletedAt: Date.now(), id }),
      },
    ])
  ).catch(() => {});
}

const saveNotifToSupabase = (n: AppNotification) => {
  const payload = {
    id: `notif_${n.id}`,
    request_type: "app_notification",
    applicant_or_child_name: n.title,
    reason_or_notes: JSON.stringify(n),
  };
  Promise.resolve(supabase.from("gv_requests").upsert([payload])).catch(() => {});
};

// Automatically sync live database notifications from Supabase
export function syncLiveDatabaseNotifications() {
  if (typeof window === "undefined") return;

  // Clear mock seeds from previous keys
  try {
    window.localStorage.removeItem("sunshine.notifications.v2");
    window.localStorage.removeItem("sunshine.notifications.v1");
  } catch {}

  const deletedSet = getDeletedIds();

  // Sync deleted markers from Supabase first
  Promise.resolve(
    supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "deleted_notification")
  ).then(({ data }) => {
    if (data && data.length > 0) {
      data.forEach((row: any) => {
        if (row.applicant_or_child_name) {
          deletedSet.add(row.applicant_or_child_name);
        }
      });
    }
  }).catch(() => {});

  // Sync custom saved notifications from gv_requests
  Promise.resolve(
    supabase
      .from("gv_requests")
      .select("*")
      .eq("request_type", "app_notification")
  )
    .then(({ data }) => {
      if (data && data.length > 0) {
        let updated = false;
        data.forEach((row: any) => {
          try {
            if (row.reason_or_notes && (row.reason_or_notes.startsWith("{") || row.reason_or_notes.startsWith("["))) {
              const n: AppNotification = JSON.parse(row.reason_or_notes);
              const isDel = deletedSet.has(n.id) || deletedSet.has(row.id) || deletedSet.has(`notif_${n.id}`);
              if (!isDel && !store.some((x) => x.id === n.id)) {
                store.unshift(n);
                updated = true;
              }
            }
          } catch {}
        });
        if (updated) saveStore([...store]);
      }
    })
    .catch(() => {});

  import("./supabaseService")
    .then(({ fetchCirculars, fetchLeaveRequests }) => {
      fetchCirculars().then(({ data }) => {
        if (data && data.length > 0) {
          let updated = false;
          data.forEach((c) => {
            const notifId = `n-cir-${c.id || c.title}`;
            const isDel = deletedSet.has(notifId) || (c.id && deletedSet.has(c.id)) || deletedSet.has(c.title);
            if (!isDel) {
              const read = (c.id ? isCircularRead(c.id, "principal") || isCircularRead(c.id, "all") : false) || isCircularRead(notifId, "principal");
              const existingIdx = store.findIndex((n) => n.id === notifId);
              if (existingIdx >= 0) {
                if (read && !store[existingIdx].read) {
                  store[existingIdx].read = true;
                  updated = true;
                }
              } else {
                store.unshift({
                  id: notifId,
                  title: `Circular: ${c.title}`,
                  description: c.content || c.title,
                  module: "announcement",
                  timestamp: c.published_date ? new Date(c.published_date).getTime() : Date.now(),
                  read,
                  priority: "high",
                  roles: ["parent", "teacher", "office", "principal", "super-admin"],
                });
                updated = true;
              }
            }
          });
          if (updated) saveStore([...store]);
        }
      });

      fetchLeaveRequests().then(({ data }: any) => {
        if (data && data.length > 0) {
          let updated = false;
          data.forEach((l: any) => {
            const notifId = `n-lv-${l.id || l.applicant_name}`;
            const isDel = deletedSet.has(notifId) || deletedSet.has(l.id);
            if (!isDel && !store.some((n) => n.id === notifId)) {
              const isPending = l.status === "Pending";
              store.unshift({
                id: notifId,
                title: `Leave Request: ${l.applicant_name}`,
                description: `${l.applicant_name} requested leave: ${l.reason} (${l.status})`,
                module: "leave",
                timestamp: l.applied_on ? new Date(l.applied_on).getTime() : Date.now(),
                read: false,
                priority: isPending ? "high" : "medium",
                roles: isPending ? ["teacher"] : ["parent"],
              });
              updated = true;
            }
          });
          if (updated) saveStore([...store]);
        }
      });
    })
    .catch(() => {});
}

// Run initial sync & set live polling interval on script load
if (typeof window !== "undefined") {
  syncLiveDatabaseNotifications();
  setInterval(() => syncLiveDatabaseNotifications(), 15000);

  window.addEventListener("storage", (e) => {
    if (e.key === NOTIF_STORAGE_KEY && e.newValue) {
      try {
        store = JSON.parse(e.newValue);
        emit();
      } catch {}
    }
  });

  window.addEventListener("sunshine-notification", () => {
    emit();
  });
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function listForRole(role: Role): AppNotification[] {
  const deletedSet = getDeletedIds();
  const cached = listCache.get(role);
  if (cached) return cached;
  const list = store.filter((n) => !deletedSet.has(n.id) && isNotificationAllowedForRole(n, role));
  listCache.set(role, list);
  return list;
}

export function unreadCountForRole(role: Role): number {
  const deletedSet = getDeletedIds();
  const cached = unreadCache.get(role);
  if (cached !== undefined) return cached;
  const n = store.filter((x) => !deletedSet.has(x.id) && isNotificationAllowedForRole(x, role) && !x.read).length;
  unreadCache.set(role, n);
  return n;
}

import { markAllCircularsAsRead, isCircularRead } from "./circularReadStore";
import { notifyAutoRefresh } from "./autoRefreshContext";

export function markRead(id: string) {
  const next = store.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStore(next);
  notifyAutoRefresh("notifications");
}

export function markAllRead(role: Role) {
  markAllCircularsAsRead(role);
  const next = store.map((n) => (isNotificationAllowedForRole(n, role) ? { ...n, read: true } : n));
  saveStore(next);
  notifyAutoRefresh("notifications");
}

export function removeNotification(id: string) {
  addDeletedId(id);
  addDeletedId(`notif_${id}`);
  addDeletedId(`n-cir-${id}`);
  const next = store.filter((n) => n.id !== id);
  saveStore(next);
  notifyAutoRefresh("notifications");

  Promise.resolve(
    supabase.from("gv_requests").delete().or(`id.eq.${id},id.eq.notif_${id}`)
  ).catch(() => {});
}

export function clearAllNotifications(role: Role) {
  markAllCircularsAsRead(role);
  const toDelete = store.filter((n) => isNotificationAllowedForRole(n, role));
  toDelete.forEach((n) => {
    addDeletedId(n.id);
    addDeletedId(`notif_${n.id}`);
    addDeletedId(`n-cir-${n.id}`);
    Promise.resolve(
      supabase.from("gv_requests").delete().or(`id.eq.${n.id},id.eq.notif_${n.id}`)
    ).catch(() => {});
  });
  const next = store.filter((n) => !isNotificationAllowedForRole(n, role));
  saveStore(next);
  notifyAutoRefresh("notifications");
}

export interface NotifyInput {
  title: string;
  description: string;
  module: NotificationModule;
  roles: Role[];
  priority?: NotificationPriority;
  link?: string;
  refId?: string;
}

export function getNotificationLinkForRole(n: AppNotification, userRole: Role | string): string {
  if (!n) return "/";
  const r = (userRole || "").toLowerCase();

  if (n.module === "announcement" || (n.id && n.id.startsWith("n-cir-"))) {
    if (r === "principal") return "/principal/circulars";
    if (r === "office") return "/office/circulars";
    if (r === "teacher") return "/teacher/circulars";
    if (r === "parent" || r === "student") return "/parent/circulars";
    if (r === "super-admin" || r === "admin") return "/admin/circulars";
  }

  const roleLink = LINK_BY_MODULE[n.module]?.[r as Role];
  if (roleLink) return roleLink;

  if (n.link && !n.link.startsWith("/parent")) return n.link;

  switch (r) {
    case "principal": return "/principal";
    case "office": return "/office";
    case "teacher": return "/teacher";
    case "super-admin":
    case "admin": return "/admin";
    case "parent":
    case "student":
    default: return "/parent";
  }
}

export function notify(input: NotifyInput) {
  const n: AppNotification = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    description: input.description,
    module: input.module,
    timestamp: Date.now(),
    read: false,
    priority: input.priority ?? "medium",
    roles: input.roles,
    link: input.link ?? LINK_BY_MODULE[input.module]?.[input.roles[0]],
    refId: input.refId,
  };
  const next = [n, ...store];
  saveStore(next);
  saveNotifToSupabase(n);
  return n;
}

// Convenience business-rule helpers (Only Actionable Communication)
export const NotificationService = {
  homeworkAssigned(..._args: any[]) {},
  attendanceMarked(..._args: any[]) {},
  remarkAdded(..._args: any[]) {},
  diaryPublished(..._args: any[]) {},
  announcement(text: string, roles: Role[] = ["parent", "teacher", "office", "principal", "super-admin"]) {
    notify({
      title: "New announcement",
      description: text,
      module: "announcement",
      roles,
    });
  },
  leaveRequested(student: string, parent: string) {
    notify({
      title: "New leave request",
      description: `${parent} requested leave for ${student}.`,
      module: "leave",
      roles: ["teacher"],
      priority: "high",
    });
  },
  leaveDecision(student: string, status: "Approved" | "Rejected") {
    notify({
      title: `Leave ${status.toLowerCase()}`,
      description: `Your leave request for ${student} has been ${status.toLowerCase()}.`,
      module: "leave",
      roles: ["parent"],
      priority: status === "Rejected" ? "high" : "medium",
    });
  },
  messageReceived(senderName: string, text: string, targetRole: "teacher" | "parent") {
    notify({
      title: `New Message from ${senderName}`,
      description: text,
      module: "messages",
      roles: [targetRole],
      priority: "medium",
    });
  },
  feePayment(..._args: any[]) {},
  admission(..._args: any[]) {},
  admissionCreated(..._args: any[]) {},
  enquiryCreated(..._args: any[]) {},
  healthAlert(..._args: any[]) {},
  transportAlert(..._args: any[]) {},
  passwordResetRequested(..._args: any[]) {},
  circularPublished(title: string, roles?: Role[]) {
    const defaultRoles: Role[] = ["parent", "teacher", "office", "principal", "super-admin"];
    const targetRoles: Role[] = roles && roles.length > 0 ? roles : defaultRoles;
    notify({
      title: `New Circular: ${title}`,
      description: `Principal published a new circular: "${title}"`,
      module: "announcement",
      roles: targetRoles,
      priority: "high",
    });
  },
};
