import {
  LayoutDashboard, Users, Building2, GraduationCap, DollarSign, BarChart3, Settings,
  ClipboardList, School, Calendar, Bell, FileText, UserCheck, Baby, MessageSquare,
  Image as ImageIcon, BookOpen, CalendarClock, PhoneCall, ClipboardCheck, Receipt,
  Percent, Wallet, TrendingUp, Heart, CreditCard, Plane, ListChecks, PartyPopper,
  Sparkles, ShieldCheck, Megaphone, NotebookPen, KeyRound, Boxes, type LucideIcon,
} from "lucide-react";

export type Role = "super-admin" | "principal" | "office" | "teacher" | "parent";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export interface RoleTheme {
  role: Role;
  name: string;
  title: string;
  subtitle: string;
  gradient: string;
  softBg: string;
  ring: string;
  accent: string;
  chip: string;
  icon: LucideIcon;
  nav: NavItem[];
}

export const ROLES: Record<Role, RoleTheme> = {
  "super-admin": {
    role: "super-admin",
    name: "Super Admin",
    title: "Organization Command Center",
    subtitle: "Monitor every branch, every metric.",
    gradient: "from-blue-600 via-indigo-600 to-purple-600",
    softBg: "from-blue-50 via-indigo-50 to-purple-50",
    ring: "ring-blue-500/30",
    accent: "text-blue-600",
    chip: "bg-blue-100 text-blue-700",
    icon: ShieldCheck,
    nav: [
      { to: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/super-admin/users", label: "Users", icon: Users },
      { to: "/super-admin/branches", label: "Branches", icon: Building2 },
      { to: "/super-admin/academic", label: "Academic Overview", icon: GraduationCap },
      { to: "/super-admin/revenue", label: "Revenue", icon: DollarSign },
      { to: "/super-admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/super-admin/settings", label: "Settings", icon: Settings },
    ],
  },
  principal: {
    role: "principal",
    name: "Principal",
    title: "Academic Leadership",
    subtitle: "Nurture teachers, shape futures.",
    gradient: "from-teal-500 via-emerald-500 to-green-500",
    softBg: "from-teal-50 via-emerald-50 to-green-50",
    ring: "ring-emerald-500/30",
    accent: "text-emerald-600",
    chip: "bg-emerald-100 text-emerald-700",
    icon: School,
    nav: [
      { to: "/principal", label: "Dashboard", icon: LayoutDashboard },
      { to: "/principal/teachers", label: "Teachers", icon: Users },
      { to: "/principal/students", label: "Students", icon: Baby },
      { to: "/principal/classes", label: "Classes", icon: BookOpen },
      { to: "/principal/attendance", label: "Attendance", icon: UserCheck },
      { to: "/principal/activities", label: "Activities", icon: Sparkles },
      { to: "/principal/events", label: "Events", icon: PartyPopper },
      { to: "/principal/enquiries", label: "Enquiries", icon: ClipboardList },
      { to: "/principal/announcements", label: "Announcements", icon: Megaphone },
      { to: "/principal/reports", label: "Reports", icon: FileText },
    ],
  },
  office: {
    role: "office",
    name: "Office Staff",
    title: "Administration Hub",
    subtitle: "Admissions, fees, and everything in between.",
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    softBg: "from-orange-50 via-amber-50 to-yellow-50",
    ring: "ring-orange-500/30",
    accent: "text-orange-600",
    chip: "bg-orange-100 text-orange-700",
    icon: Receipt,
    nav: [
      { to: "/office", label: "Dashboard", icon: LayoutDashboard },
      { to: "/office/new-enquiry", label: "New Enquiry", icon: Sparkles },
      { to: "/office/enquiries", label: "Enquiries", icon: ClipboardList },
      { to: "/office/visits", label: "Today's Visits", icon: Calendar },
      { to: "/office/admissions", label: "Admissions", icon: ClipboardCheck },
      { to: "/office/students", label: "Students", icon: Baby },
      { to: "/office/class-assignment", label: "Class Assignment", icon: UserCheck },
      { to: "/office/fees", label: "Fee Collection", icon: DollarSign },
      { to: "/office/receipts", label: "Fee Receipts", icon: Receipt },
      { to: "/office/expenses", label: "Expenses", icon: Wallet },
      { to: "/office/inventory", label: "Inventory", icon: Boxes },
      { to: "/office/messages", label: "Messages", icon: MessageSquare },
      { to: "/office/parent-credentials", label: "Parent Logins", icon: KeyRound },
      { to: "/office/teacher-credentials", label: "Teacher Logins", icon: ShieldCheck },
      { to: "/office/password-resets", label: "Password Reset Requests", icon: KeyRound },
      { to: "/office/reports", label: "Reports", icon: FileText },
    ],
  },
  teacher: {
    role: "teacher",
    name: "Teacher",
    title: "My Classroom",
    subtitle: "Every child. Every day. Every moment.",
    gradient: "from-sky-400 via-sky-500 to-blue-500",
    softBg: "from-sky-50 via-blue-50 to-indigo-50",
    ring: "ring-sky-500/30",
    accent: "text-sky-600",
    chip: "bg-sky-100 text-sky-700",
    icon: BookOpen,
    nav: [
      { to: "/teacher", label: "Dashboard", icon: LayoutDashboard },
      {
        to: "/teacher/my-class",
        label: "My Class",
        icon: Baby,
        children: [
          { to: "/teacher/my-class", label: "Overview", icon: Baby },
          { to: "/teacher/attendance", label: "Attendance", icon: UserCheck },
          { to: "/teacher/diary", label: "Daily Diary", icon: NotebookPen },
          { to: "/teacher/homework", label: "Homework", icon: BookOpen },
        ],
      },
      { to: "/teacher/my-subjects", label: "My Subjects", icon: BookOpen },
      { to: "/teacher/activities", label: "Activities", icon: Sparkles },
      { to: "/teacher/gallery", label: "Gallery", icon: ImageIcon },
      { to: "/teacher/progress", label: "Student Progress", icon: TrendingUp },
      { to: "/teacher/leave-requests", label: "Leave Requests", icon: Plane },
      { to: "/teacher/circulars", label: "Circulars", icon: Megaphone },
      { to: "/teacher/alerts", label: "Alerts", icon: Bell },
      { to: "/teacher/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  parent: {
    role: "parent",
    name: "Parent",
    title: "My Little One",
    subtitle: "Stay close, every step of the day.",
    gradient: "from-pink-400 via-fuchsia-400 to-purple-400",
    softBg: "from-pink-50 via-fuchsia-50 to-purple-50",
    ring: "ring-pink-500/30",
    accent: "text-pink-600",
    chip: "bg-pink-100 text-pink-700",
    icon: Heart,
    nav: [
      { to: "/parent", label: "Dashboard", icon: LayoutDashboard },
      {
        to: "/parent/child",
        label: "My Child",
        icon: Baby,
        children: [
          { to: "/parent/child", label: "Child Profile", icon: Baby },
          { to: "/parent/attendance", label: "Attendance", icon: UserCheck },
          { to: "/parent/gallery", label: "Photo Gallery", icon: ImageIcon },
        ],
      },

      { to: "/parent/circulars", label: "Circulars", icon: Megaphone },
      { to: "/parent/diary", label: "Daily Diary", icon: NotebookPen },
      { to: "/parent/fees", label: "Fees", icon: DollarSign },
      { to: "/parent/messages", label: "Messages", icon: MessageSquare },
      { to: "/parent/leave", label: "Leave Request", icon: Plane },
    ],
  },
};

export const ROLE_LIST: Role[] = [
  "super-admin", "principal", "office", "teacher", "parent",
];
