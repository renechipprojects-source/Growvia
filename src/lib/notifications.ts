// Centralized notification service with role-based filtering, subscribe/emit,
// mark-as-read, and simulated real-time updates.
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

function seed(): AppNotification[] {
  const now = Date.now();
  const m = (n: number) => now - n * 60_000;
  return [
    {
      id: "n-seed-1",
      title: "Homework assigned",
      description: "Miss Anjali added new homework: Shapes worksheet.",
      module: "homework",
      timestamp: m(5),
      read: false,
      priority: "medium",
      roles: ["parent"],
      link: "/parent/homework",
    },
    {
      id: "n-seed-2",
      title: "Attendance updated",
      description: "Diya was marked present today.",
      module: "attendance",
      timestamp: m(35),
      read: false,
      priority: "low",
      roles: ["parent"],
      link: "/parent/attendance",
    },
    {
      id: "n-seed-3",
      title: "New leave request",
      description: "Rohit Sharma requested leave for Aarav (Jul 23).",
      module: "leave",
      timestamp: m(12),
      read: false,
      priority: "high",
      roles: ["teacher"],
      link: "/teacher/leave-requests",
    },
    {
      id: "n-seed-4",
      title: "Fee payment recorded",
      description: "₹8,500 received from Neha Patel.",
      module: "fees",
      timestamp: m(90),
      read: false,
      priority: "medium",
      roles: ["office", "super-admin"],
      link: "/office/fees",
    },
    {
      id: "n-seed-5",
      title: "New admission enquiry",
      description: "Kavya Singh enquired about Nursery admission.",
      module: "admissions",
      timestamp: m(140),
      read: true,
      priority: "medium",
      roles: ["office", "principal", "super-admin"],
      link: "/office/enquiries",
    },
    {
      id: "n-seed-6",
      title: "Announcement published",
      description: "Yellow Day celebration tomorrow — please dress your child in yellow.",
      module: "announcement",
      timestamp: m(200),
      read: false,
      priority: "medium",
      roles: ["parent", "teacher", "office", "principal", "super-admin"],
    },
  ];
}

let store: AppNotification[] = seed();
const listeners = new Set<Listener>();
const listCache = new Map<Role, AppNotification[]>();
const unreadCache = new Map<Role, number>();

function emit() {
  listCache.clear();
  unreadCache.clear();
  for (const l of listeners) l();
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function listForRole(role: Role): AppNotification[] {
  const cached = listCache.get(role);
  if (cached) return cached;
  const next = store
    .filter((n) => n.roles.includes(role))
    .sort((a, b) => b.timestamp - a.timestamp);
  listCache.set(role, next);
  return next;
}

export function unreadCountForRole(role: Role): number {
  const cached = unreadCache.get(role);
  if (cached !== undefined) return cached;
  const n = store.filter((x) => x.roles.includes(role) && !x.read).length;
  unreadCache.set(role, n);
  return n;
}


export function markRead(id: string) {
  store = store.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
}

export function markAllRead(role: Role) {
  store = store.map((n) => (n.roles.includes(role) ? { ...n, read: true } : n));
  emit();
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
  store = [n, ...store];
  emit();
  return n;
}

// Convenience business-rule helpers
export const NotificationService = {
  homeworkAssigned(title: string, teacher: string) {
    notify({
      title: "New homework assigned",
      description: `${teacher} assigned: ${title}`,
      module: "homework",
      roles: ["parent"],
    });
  },
  attendanceMarked(className: string) {
    notify({
      title: "Attendance updated",
      description: `Attendance has been updated for ${className} today.`,
      module: "attendance",
      roles: ["parent"],
      priority: "low",
    });
  },
  remarkAdded(student: string) {
    notify({
      title: "New remark added",
      description: `Teacher added a new remark about ${student}.`,
      module: "remarks",
      roles: ["parent"],
    });
  },
  diaryPublished(student: string) {
    notify({
      title: "Daily diary updated",
      description: `A new diary entry is available for ${student}.`,
      module: "diary",
      roles: ["parent"],
      priority: "low",
    });
  },
  announcement(text: string, roles: Role[] = ["parent", "teacher", "office"]) {
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
  feePayment(amount: string, from: string) {
    notify({
      title: "Fee payment recorded",
      description: `${amount} received from ${from}.`,
      module: "fees",
      roles: ["office", "accountant" as Role, "super-admin"].filter(Boolean) as Role[],
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
};
