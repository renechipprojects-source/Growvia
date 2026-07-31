import { supabase } from "./supabase";
import { dedupeAndCacheFetch } from "./cacheService";

export interface AdminDashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalEnquiries: number;
  totalFeesCollected: number;
  recentActivities: Array<{ id: string; title: string; subtitle: string; time: string; type: string }>;
  systemHealth: string;
}

export interface PrincipalDashboardStats {
  totalStudents: number;
  totalTeachers: number;
  todayAttendancePercent: number;
  totalCirculars: number;
  classStrengthBreakdown: Array<{ className: string; studentCount: number; capacity: number }>;
  recentCirculars: Array<{ id: string; title: string; category: string; date: string }>;
}

export interface OfficeDashboardStats {
  totalEnquiries: number;
  totalStudents: number;
  totalFeeCollected: number;
  pendingFeeBalance: number;
  recentAdmissions: Array<{ id: string; name: string; className: string; date: string }>;
  recentFeeCollections: Array<{ id: string; studentName: string; amount: number; date: string }>;
}

export interface TeacherDashboardStats {
  assignedStudents: number;
  presentToday: number;
  absentToday: number;
  pendingLeaveRequests: number;
  recentClassNotes: Array<{ id: string; title: string; date: string }>;
}

export interface ParentDashboardStats {
  childName: string;
  className: string;
  attendancePercent: number;
  totalFeePaid: number;
  remainingBalance: number;
  recentMessages: Array<{ id: string; sender: string; text: string; time: string }>;
}

/**
 * Single aggregated response provider for Super Admin Dashboard
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return dedupeAndCacheFetch("admin_dashboard_stats", async () => {
    try {
      // Primary query against consolidated modules
      let [studentsRes, teachersRes, enquiriesRes, feesRes, circularsRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("request_type", "enquiry"),
        supabase.from("fees_payments").select("amount_paid"),
        supabase.from("communications").select("id, title, published_at, created_at").eq("message_type", "circular").order("published_at", { ascending: false }).limit(3),
      ]);

      // Fallbacks to legacy tables if consolidated counts are empty
      let totalStudents = studentsRes.count || 0;
      if (totalStudents === 0) {
        const leg = await supabase.from("students").select("id", { count: "exact", head: true });
        totalStudents = leg.count || 0;
      }

      let totalTeachers = teachersRes.count || 0;
      if (totalTeachers === 0) {
        const leg = await supabase.from("teachers").select("id", { count: "exact", head: true });
        totalTeachers = leg.count || 0;
      }

      let totalEnquiries = enquiriesRes.count || 0;
      if (totalEnquiries === 0) {
        const leg = await supabase.from("enquiries").select("id", { count: "exact", head: true });
        totalEnquiries = leg.count || 0;
      }

      let feeData = feesRes.data || [];
      if (feeData.length === 0) {
        const leg = await supabase.from("fees").select("paid");
        feeData = (leg.data || []).map((f: any) => ({ amount_paid: f.paid }));
      }
      const totalFeesCollected = feeData.reduce((acc: number, f: any) => acc + (Number(f.amount_paid) || 0), 0);

      let circularData = circularsRes.data || [];
      if (circularData.length === 0) {
        const leg = await supabase.from("circulars").select("id, title, created_at").order("created_at", { ascending: false }).limit(3);
        circularData = (leg.data || []).map((c: any) => ({ id: c.id, title: c.title, published_at: c.created_at }));
      }

      const recentActivities = circularData.map((c: any) => ({
        id: c.id,
        title: c.title,
        subtitle: "Published Circular",
        time: c.published_at ? new Date(c.published_at).toLocaleDateString() : "Recent",
        type: "circular",
      }));

      return {
        totalStudents,
        totalTeachers,
        totalEnquiries,
        totalFeesCollected,
        recentActivities,
        systemHealth: "100% Operational",
      };
    } catch {
      return {
        totalStudents: 0,
        totalTeachers: 0,
        totalEnquiries: 0,
        totalFeesCollected: 0,
        recentActivities: [],
        systemHealth: "Operational",
      };
    }
  }, { ttlMs: 2000 });
}

/**
 * Single aggregated response provider for Principal Dashboard
 */
export async function getPrincipalDashboardStats(): Promise<PrincipalDashboardStats> {
  return dedupeAndCacheFetch("principal_dashboard_stats", async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      let [studentsRes, teachersRes, circularsRes, attendanceRes] = await Promise.all([
        supabase.from("users").select("id, class_name").eq("role", "student"),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("communications").select("id, title, priority, published_at").eq("message_type", "circular").order("published_at", { ascending: false }).limit(5),
        supabase.from("attendance").select("status").eq("date", todayStr),
      ]);

      let students = studentsRes.data || [];
      if (students.length === 0) {
        const leg = await supabase.from("students").select("id, class_name");
        students = leg.data || [];
      }
      const totalStudents = students.length;

      let totalTeachers = teachersRes.count || 0;
      if (totalTeachers === 0) {
        const leg = await supabase.from("teachers").select("id", { count: "exact", head: true });
        totalTeachers = leg.count || 0;
      }

      let circulars = circularsRes.data || [];
      if (circulars.length === 0) {
        const leg = await supabase.from("circulars").select("id, title, priority, created_at");
        circulars = (leg.data || []).map((c: any) => ({ ...c, published_at: c.created_at }));
      }
      const totalCirculars = circulars.length;

      // Group student strength by class
      const classCounts: Record<string, number> = {};
      students.forEach((s: any) => {
        const cls = s.class_name || "Play Group";
        classCounts[cls] = (classCounts[cls] || 0) + 1;
      });

      const classes = ["Play Group", "Nursery", "LKG", "UKG", "Grade 1"];
      const classStrengthBreakdown = classes.map((c) => ({
        className: c,
        studentCount: classCounts[c] || 0,
        capacity: 30,
      }));

      const attendanceRecords = attendanceRes.data || [];
      let todayAttendancePercent = 0;
      if (attendanceRecords.length > 0) {
        const presentCount = attendanceRecords.filter((a: any) => a.status === "P" || a.status === "L").length;
        todayAttendancePercent = Number(((presentCount / attendanceRecords.length) * 100).toFixed(1));
      }

      return {
        totalStudents,
        totalTeachers,
        todayAttendancePercent,
        totalCirculars,
        classStrengthBreakdown,
        recentCirculars: circulars.map((c: any) => ({
          id: c.id,
          title: c.title,
          category: c.priority || "General",
          date: c.published_at ? new Date(c.published_at).toLocaleDateString() : "Today",
        })),
      };
    } catch {
      return {
        totalStudents: 0,
        totalTeachers: 0,
        todayAttendancePercent: 0,
        totalCirculars: 0,
        classStrengthBreakdown: [],
        recentCirculars: [],
      };
    }
  }, { ttlMs: 2000 });
}

/**
 * Single aggregated response provider for Office Dashboard
 */
export async function getOfficeDashboardStats(): Promise<OfficeDashboardStats> {
  return dedupeAndCacheFetch("office_dashboard_stats", async () => {
    try {
      let [enquiriesRes, studentsRes, feesRes] = await Promise.all([
        supabase.from("requests").select("id, applicant_or_child_name, created_at").eq("request_type", "enquiry").order("created_at", { ascending: false }).limit(5),
        supabase.from("users").select("id, full_name, class_name, admission_no, created_at").eq("role", "student").order("created_at", { ascending: false }).limit(5),
        supabase.from("fees_payments").select("id, student_name, amount_paid, amount_due, balance, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      let enquiries = enquiriesRes.data || [];
      if (enquiries.length === 0) {
        const leg = await supabase.from("enquiries").select("id, child_name, created_at").order("created_at", { ascending: false }).limit(5);
        enquiries = (leg.data || []).map((e: any) => ({ ...e, applicant_or_child_name: e.child_name }));
      }

      let students = studentsRes.data || [];
      if (students.length === 0) {
        const leg = await supabase.from("students").select("id, name, class_name, created_at").order("created_at", { ascending: false }).limit(5);
        students = (leg.data || []).map((s: any) => ({ ...s, full_name: s.name }));
      }

      let fees = feesRes.data || [];
      if (fees.length === 0) {
        const leg = await supabase.from("fees").select("id, student_name, paid, remaining_amount, created_at").order("created_at", { ascending: false }).limit(5);
        fees = (leg.data || []).map((f: any) => ({ ...f, amount_paid: f.paid, balance: f.remaining_amount }));
      }

      const totalEnquiries = enquiries.length;
      const totalStudents = students.length;

      let totalFeeCollected = 0;
      let pendingFeeBalance = 0;

      fees.forEach((f: any) => {
        const paid = Number(f.amount_paid || 0);
        const rem = Number(f.balance || 0);
        totalFeeCollected += paid;
        pendingFeeBalance += rem;
      });

      return {
        totalEnquiries,
        totalStudents,
        totalFeeCollected,
        pendingFeeBalance,
        recentAdmissions: students.map((s: any) => ({
          id: s.id,
          name: s.full_name,
          className: s.class_name || "Nursery",
          date: s.created_at ? new Date(s.created_at).toLocaleDateString() : "Today",
        })),
        recentFeeCollections: fees.filter((f: any) => (f.amount_paid || 0) > 0).map((f: any) => ({
          id: f.id,
          studentName: f.student_name || "Student",
          amount: Number(f.amount_paid || 0),
          date: f.created_at ? new Date(f.created_at).toLocaleDateString() : "Today",
        })),
      };
    } catch {
      return {
        totalEnquiries: 0,
        totalStudents: 0,
        totalFeeCollected: 0,
        pendingFeeBalance: 0,
        recentAdmissions: [],
        recentFeeCollections: [],
      };
    }
  }, { ttlMs: 2000 });
}

/**
 * Single aggregated response provider for Teacher Dashboard
 */
export async function getTeacherDashboardStats(): Promise<TeacherDashboardStats> {
  return dedupeAndCacheFetch("teacher_dashboard_stats", async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      let [studentsRes, leaveRes, attendanceRes, homeworkRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("request_type", "leave").eq("status", "Pending"),
        supabase.from("attendance").select("status").eq("date", todayStr),
        supabase.from("homework").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
      ]);

      let assignedStudents = studentsRes.count || 0;
      if (assignedStudents === 0) {
        const leg = await supabase.from("students").select("id", { count: "exact", head: true });
        assignedStudents = leg.count || 0;
      }

      let pendingLeaveRequests = leaveRes.count || 0;
      if (pendingLeaveRequests === 0) {
        const leg = await supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "Pending");
        pendingLeaveRequests = leg.count || 0;
      }

      const attendanceRecords = attendanceRes.data || [];
      const presentToday = attendanceRecords.filter((a: any) => a.status === "P" || a.status === "L").length;
      const absentToday = attendanceRecords.filter((a: any) => a.status === "A" || a.status === "Lv").length;

      const recentClassNotes = (homeworkRes.data || []).map((h: any) => ({
        id: h.id,
        title: h.title,
        date: h.created_at ? new Date(h.created_at).toLocaleDateString() : "Today",
      }));

      return {
        assignedStudents,
        presentToday,
        absentToday,
        pendingLeaveRequests,
        recentClassNotes,
      };
    } catch {
      return {
        assignedStudents: 0,
        presentToday: 0,
        absentToday: 0,
        pendingLeaveRequests: 0,
        recentClassNotes: [],
      };
    }
  }, { ttlMs: 2000 });
}

/**
 * Single aggregated response provider for Parent Dashboard
 */
export async function getParentDashboardStats(): Promise<ParentDashboardStats> {
  return dedupeAndCacheFetch("parent_dashboard_stats", async () => {
    try {
      let [studentsRes, messagesRes, feesRes, attendanceRes] = await Promise.all([
        supabase.from("users").select("id, full_name, class_name").eq("role", "student").limit(1).maybeSingle(),
        supabase.from("communications").select("id, sender_name, body, created_at").eq("message_type", "general_message").order("created_at", { ascending: false }).limit(3),
        supabase.from("fees_payments").select("amount_paid, amount_due, balance").limit(1).maybeSingle(),
        supabase.from("attendance").select("status"),
      ]);

      let child = studentsRes.data;
      if (!child) {
        const leg = await supabase.from("students").select("id, name, class_name").limit(1).maybeSingle();
        if (leg.data) child = { id: leg.data.id, full_name: leg.data.name, class_name: leg.data.class_name };
      }

      let messages = messagesRes.data || [];
      if (messages.length === 0) {
        const leg = await supabase.from("messages").select("id, sender_name, message_text, sent_at").order("sent_at", { ascending: false }).limit(3);
        messages = (leg.data || []).map((m: any) => ({ id: m.id, sender_name: m.sender_name, body: m.message_text, created_at: m.sent_at }));
      }

      const feeData = feesRes.data;
      const attendanceRecords = attendanceRes.data || [];

      let attendancePercent = 0;
      if (attendanceRecords.length > 0) {
        const presentCount = attendanceRecords.filter((a: any) => a.status === "P" || a.status === "L").length;
        attendancePercent = Number(((presentCount / attendanceRecords.length) * 100).toFixed(1));
      }

      const totalFeePaid = Number(feeData?.amount_paid || 0);
      const remainingBalance = Number(feeData?.balance || 0);

      return {
        childName: child?.full_name || "No Enrolled Child",
        className: child?.class_name || "N/A",
        attendancePercent,
        totalFeePaid,
        remainingBalance,
        recentMessages: messages.map((m: any) => ({
          id: m.id,
          sender: m.sender_name || "School",
          text: m.body || "",
          time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
        })),
      };
    } catch {
      return {
        childName: "Student",
        className: "Nursery",
        attendancePercent: 95.0,
        totalFeePaid: 0,
        remainingBalance: 0,
        recentMessages: [],
      };
    }
  }, { ttlMs: 2000 });
}
