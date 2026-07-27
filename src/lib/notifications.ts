// Centralized live notification service with role-based filtering, subscribe/emit,
// LocalStorage persistence, live Supabase sync, and zero mock data.
import type { Role } from "./roleConfig";

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

// Automatically sync live database notifications from Supabase
export function syncLiveDatabaseNotifications() {
  if (typeof window === "undefined") return;

  // Clear mock seeds from previous keys
  try {
    window.localStorage.removeItem("sunshine.notifications.v2");
    window.localStorage.removeItem("sunshine.notifications.v1");
  } catch {}

  import("./supabaseService")
    .then(({ fetchCirculars, fetchLeaveRequests, fetchEnquiries }) => {
      fetchCirculars().then(({ data }) => {
        if (data && data.length > 0) {
          let updated = false;
          data.forEach((c) => {
            const notifId = `n-cir-${c.id || c.title}`;
            if (!store.some((n) => n.id === notifId)) {
              store.unshift({
                id: notifId,
                title: `Circular: ${c.title}`,
                description: c.content || c.title,
                module: "announcement",
                timestamp: c.published_date ? new Date(c.published_date).getTime() : Date.now(),
                read: false,
                priority: "high",
                roles: ["parent", "teacher", "office", "principal", "super-admin"],
              });
              updated = true;
            }
          });
          if (updated) saveStore([...store]);
        }
      });

      fetchLeaveRequests().then(({ data }) => {
        if (data && data.length > 0) {
          let updated = false;
          data.forEach((l) => {
            const notifId = `n-lv-${l.id || l.applicant_name}`;
            if (!store.some((n) => n.id === notifId)) {
              store.unshift({
                id: notifId,
                title: `Leave Request: ${l.applicant_name}`,
                description: `${l.applicant_name} (${l.applicant_role}) requested leave: ${l.reason} (${l.status})`,
                module: "leave",
                timestamp: l.applied_on ? new Date(l.applied_on).getTime() : Date.now(),
                read: false,
                priority: l.status === "Pending" ? "high" : "medium",
                roles: ["teacher", "principal", "super-admin", "office"],
              });
              updated = true;
            }
          });
          if (updated) saveStore([...store]);
        }
      });

      fetchEnquiries().then(({ data }) => {
        if (data && data.length > 0) {
          let updated = false;
          data.forEach((e) => {
            const notifId = `n-enq-${e.id}`;
            if (!store.some((n) => n.id === notifId)) {
              store.unshift({
                id: notifId,
                title: `Admission Enquiry: ${e.childName}`,
                description: `${e.parentName} enquired for ${e.interestedClass} (${e.status})`,
                module: "admissions",
                timestamp: e.createdAt ? new Date(e.createdAt).getTime() : Date.now(),
                read: false,
                priority: "medium",
                roles: ["office", "principal", "super-admin"],
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

// Run initial sync on script load
if (typeof window !== "undefined") {
  syncLiveDatabaseNotifications();

  window.addEventListener("storage", (e) => {
    if (e.key === NOTIF_STORAGE_KEY && e.newValue) {
      try {
        store = JSON.parse(e.newValue).filter((n: any) => !n.id.startsWith("n-seed-"));
        emit();
      } catch {}
    }
  });

  window.addEventListener("sunshine-notification", () => {
    emit();
  });
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function listForRole(role: Role): AppNotification[] {
  const cached = listCache.get(role);
  if (cached) return cached;
  const next = store
    .filter((n) => n && n.roles && n.roles.includes(role) && !n.id.startsWith("n-seed-"))
    .sort((a, b) => b.timestamp - a.timestamp);
  listCache.set(role, next);
  return next;
}

export function unreadCountForRole(role: Role): number {
  const cached = unreadCache.get(role);
  if (cached !== undefined) return cached;
  const n = store.filter((x) => x && x.roles && x.roles.includes(role) && !x.read && !x.id.startsWith("n-seed-")).length;
  unreadCache.set(role, n);
  return n;
}

export function markRead(id: string) {
  const next = store.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStore(next);
}

export function markAllRead(role: Role) {
  const next = store.map((n) => (n.roles.includes(role) ? { ...n, read: true } : n));
  saveStore(next);
}

export function removeNotification(id: string) {
  const next = store.filter((n) => n.id !== id);
  saveStore(next);
}

export function clearAllNotifications(role: Role) {
  const next = store.filter((n) => !n.roles.includes(role));
  saveStore(next);
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
  return n;
}

// Convenience business-rule helpers
export const NotificationService = {
  homeworkAssigned(title: string, teacher: string) {
    notify({
      title: "New homework assigned",
      description: `${teacher} assigned: ${title}`,
      module: "homework",
      roles: ["parent", "teacher", "principal"],
    });
  },
  attendanceMarked(className: string) {
    notify({
      title: "Attendance updated",
      description: `Attendance has been updated for ${className} today.`,
      module: "attendance",
      roles: ["parent", "teacher", "principal", "office"],
      priority: "low",
    });
  },
  remarkAdded(student: string) {
    notify({
      title: "New remark added",
      description: `Teacher added a new remark about ${student}.`,
      module: "remarks",
      roles: ["parent", "principal", "teacher"],
    });
  },
  diaryPublished(student: string) {
    notify({
      title: "Daily diary updated",
      description: `A new diary entry is available for ${student}.`,
      module: "diary",
      roles: ["parent", "teacher"],
      priority: "low",
    });
  },
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
      roles: ["teacher", "principal", "super-admin", "office"],
      priority: "high",
    });
  },
  leaveDecision(student: string, status: "Approved" | "Rejected") {
    notify({
      title: `Leave ${status.toLowerCase()}`,
      description: `Your leave request for ${student} has been ${status.toLowerCase()}.`,
      module: "leave",
      roles: ["parent", "teacher", "principal"],
      priority: status === "Rejected" ? "high" : "medium",
    });
  },
  feePayment(amount: string, from: string) {
    notify({
      title: "Fee payment recorded",
      description: `${amount} received from ${from}.`,
      module: "fees",
      roles: ["office", "principal", "super-admin", "parent"],
    });
  },
  admission(student: string) {
    notify({
      title: "New admission enquiry",
      description: `${student} submitted an admission enquiry.`,
      module: "admissions",
      roles: ["office", "principal", "super-admin"],
    });
  },
  admissionCreated(student: string, admissionNo: string) {
    notify({
      title: "New admission completed",
      description: `${student} has been admitted (${admissionNo}).`,
      module: "admissions",
      roles: ["office", "principal", "super-admin"],
      priority: "high",
      link: "/office/students",
    });
  },
  enquiryCreated(name: string, className: string) {
    notify({
      title: "New enquiry received",
      description: `New enquiry for ${name} (${className}).`,
      module: "admissions",
      roles: ["office", "principal", "super-admin"],
      priority: "medium",
      link: "/office/enquiries",
    });
  },
  healthAlert(student: string, detail: string) {
    notify({
      title: "Health & Medical Alert",
      description: `Medical update for ${student}: ${detail}`,
      module: "system",
      roles: ["office", "principal", "super-admin", "teacher"],
      priority: "high",
    });
  },
  transportAlert(title: string, detail: string) {
    notify({
      title: `Transport: ${title}`,
      description: detail,
      module: "system",
      roles: ["office", "principal", "super-admin", "parent"],
      priority: "medium",
    });
  },
  passwordResetRequested(name: string, role: string) {
    notify({
      title: "Password reset request",
      description: `${name} (${role}) requested a password reset.`,
      module: "staff",
      roles: ["office", "super-admin"],
      priority: "high",
      link: "/office/password-resets",
    });
  },
  circularPublished(title: string) {
    notify({
      title: `New Circular: ${title}`,
      description: `Principal published a new circular: "${title}"`,
      module: "announcement",
      roles: ["parent", "teacher", "office", "principal", "super-admin"],
      priority: "high",
    });
  },
};
