import { supabase } from "./supabase";

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

export interface AnnualPromotionLifecycleStats {
  academicYear: string;
  studentsEligible: number;
  studentsPromoted: number;
  promotionPending: number;
  promotionCompleted: number;
  promotionFailed: number;
  promotionPercentage: number;
  studentsWaitingReview: number;
  studentsRequiringManualAction: number;
  totalAdmissions: number;
  activeStudents: number;
  graduatedStudents: number;
  tcIssued: number;
  studentsLeftSchool: number;
  rejoinedStudents: number;
  inactiveStudents: number;
  archivedStudents: number;
}

import { getDeveloperSettings } from "./developerSettingsStore";

/**
 * Super Admin Dashboard Statistics Provider
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    const [studentsRes, teachersRes, enquiriesRes, feesRes, circularsRes] = await Promise.all([
      supabase.from("gv_users").select("id, role").or("role.eq.student,role.eq.Student,role.ilike.*student*"),
      supabase.from("gv_users").select("id, role").or("role.eq.teacher,role.eq.Teacher,role.ilike.*teacher*"),
      supabase.from("gv_requests").select("id").eq("request_type", "enquiry"),
      supabase.from("gv_fees_payments").select("amount_paid").eq("record_type", "payment_receipt"),
      supabase.from("gv_communications").select("id, title, published_at, created_at").eq("message_type", "circular").order("created_at", { ascending: false }).limit(5),
    ]);

    let studentData = studentsRes.data || [];
    if (studentData.length === 0) {
      const { data: allUsers } = await supabase.from("gv_users").select("id, role");
      if (allUsers) studentData = allUsers.filter((u: any) => u.role?.toString().toLowerCase().includes("student"));
    }

    let teacherData = teachersRes.data || [];
    if (teacherData.length === 0) {
      const { data: allUsers } = await supabase.from("gv_users").select("id, role");
      if (allUsers) teacherData = allUsers.filter((u: any) => u.role?.toString().toLowerCase().includes("teacher"));
    }

    const totalStudents = studentData.length;
    const totalTeachers = teacherData.length;
    const totalEnquiries = enquiriesRes.data?.length || 0;
    const feeData = feesRes.data || [];
    const totalFeesCollected = feeData.reduce((acc: number, f: any) => acc + (Number(f.amount_paid) || 0), 0);

    const circularData = circularsRes.data || [];
    const recentActivities = circularData.map((c: any) => ({
      id: c.id,
      title: c.title,
      subtitle: "Published Circular",
      time: c.published_at || c.created_at ? new Date(c.published_at || c.created_at).toLocaleDateString() : "Recent",
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
  } catch (err) {
    console.error("Error in getAdminDashboardStats:", err);
    return {
      totalStudents: 0,
      totalTeachers: 0,
      totalEnquiries: 0,
      totalFeesCollected: 0,
      recentActivities: [],
      systemHealth: "Operational",
    };
  }
}

/**
 * Principal Dashboard Statistics Provider
 */
export async function getPrincipalDashboardStats(): Promise<PrincipalDashboardStats> {
  try {
    const [studentsRes, teachersRes, circularsRes, attendanceRes] = await Promise.all([
      supabase.from("gv_users").select("id, class_name, role").or("role.eq.student,role.eq.Student,role.ilike.*student*"),
      supabase.from("gv_users").select("id, role").or("role.eq.teacher,role.eq.Teacher,role.ilike.*teacher*"),
      supabase.from("gv_communications").select("id, title, priority, published_at").eq("message_type", "circular").order("created_at", { ascending: false }).limit(5),
      supabase.from("gv_requests").select("status").eq("request_type", "attendance"),
    ]);

    let students = studentsRes.data || [];
    if (students.length === 0) {
      const { data: allUsers } = await supabase.from("gv_users").select("id, class_name, role");
      if (allUsers) students = allUsers.filter((u: any) => u.role?.toString().toLowerCase().includes("student"));
    }

    let teachers = teachersRes.data || [];
    if (teachers.length === 0) {
      const { data: allUsers } = await supabase.from("gv_users").select("id, role");
      if (allUsers) teachers = allUsers.filter((u: any) => u.role?.toString().toLowerCase().includes("teacher"));
    }

    const totalStudents = students.length;
    const totalTeachers = teachers.length;

    const circulars = circularsRes.data || [];
    const totalCirculars = circulars.length;

    const classCounts: Record<string, number> = {};
    students.forEach((s: any) => {
      const cls = s.class_name || "Nursery";
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    });

    const classes = ["Nursery", "LKG", "UKG", "Playgroup"];
    const classStrengthBreakdown = classes.map((c) => ({
      className: c,
      studentCount: classCounts[c] || 0,
      capacity: 30,
    }));

    const attendanceRecords = attendanceRes.data || [];
    let todayAttendancePercent = 0;
    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter((a: any) => a.status === "P" || a.status === "Present").length;
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
  } catch (err) {
    console.error("Error in getPrincipalDashboardStats:", err);
    return {
      totalStudents: 0,
      totalTeachers: 0,
      todayAttendancePercent: 0,
      totalCirculars: 0,
      classStrengthBreakdown: [],
      recentCirculars: [],
    };
  }
}

/**
 * Office Dashboard Statistics Provider
 */
export async function getOfficeDashboardStats(): Promise<OfficeDashboardStats> {
  try {
    const [enquiriesRes, studentsRes, feesRes] = await Promise.all([
      supabase.from("gv_requests").select("id, applicant_or_child_name, created_at").eq("request_type", "enquiry").order("created_at", { ascending: false }),
      supabase.from("gv_users").select("id, full_name, class_name, admission_no, created_at, role").or("role.eq.student,role.eq.Student,role.ilike.*student*").order("created_at", { ascending: false }),
      supabase.from("gv_fees_payments").select("id, student_name, amount_paid, amount_due, balance, record_type, created_at").order("created_at", { ascending: false }),
    ]);

    const enquiries = enquiriesRes.data || [];
    let students = studentsRes.data || [];
    if (students.length === 0) {
      const { data: allUsers } = await supabase.from("gv_users").select("id, full_name, class_name, admission_no, created_at, role");
      if (allUsers) students = allUsers.filter((u: any) => u.role?.toString().toLowerCase().includes("student"));
    }
    const fees = feesRes.data || [];

    const totalEnquiries = enquiries.length;
    const totalStudents = students.length;

    const receiptRows = fees.filter((f: any) => f.record_type === "payment_receipt");
    const scheduleRows = fees.filter((f: any) => f.record_type === "fee_schedule");

    const totalFeeCollected = receiptRows.reduce((sum: number, f: any) => sum + Number(f.amount_paid || 0), 0);
    const pendingFeeBalance = scheduleRows.reduce((sum: number, f: any) => sum + Number(f.balance || 0), 0);

    return {
      totalEnquiries,
      totalStudents,
      totalFeeCollected,
      pendingFeeBalance,
      recentAdmissions: students.slice(0, 5).map((s: any) => ({
        id: s.id,
        name: s.full_name,
        className: s.class_name || "Nursery",
        date: s.created_at ? new Date(s.created_at).toLocaleDateString() : "Today",
      })),
      recentFeeCollections: receiptRows.filter((f: any) => (f.amount_paid || 0) > 0).slice(0, 5).map((f: any) => ({
        id: f.id,
        studentName: f.student_name || "Student",
        amount: Number(f.amount_paid || 0),
        date: f.created_at ? new Date(f.created_at).toLocaleDateString() : "Today",
      })),
    };
  } catch (err) {
    console.error("Error in getOfficeDashboardStats:", err);
    return {
      totalEnquiries: 0,
      totalStudents: 0,
      totalFeeCollected: 0,
      pendingFeeBalance: 0,
      recentAdmissions: [],
      recentFeeCollections: [],
    };
  }
}

/**
 * Teacher Dashboard Statistics Provider
 */
export async function getTeacherDashboardStats(): Promise<TeacherDashboardStats> {
  try {
    const [studentsRes, leaveRes, attendanceRes] = await Promise.all([
      supabase.from("gv_users").select("id, role").or("role.eq.student,role.eq.Student,role.ilike.*student*"),
      supabase.from("gv_requests").select("id").eq("request_type", "leave").eq("status", "Pending"),
      supabase.from("gv_requests").select("status").eq("request_type", "attendance"),
    ]);

    let students = studentsRes.data || [];
    if (students.length === 0) {
      const { data: allUsers } = await supabase.from("gv_users").select("id, role");
      if (allUsers) students = allUsers.filter((u: any) => u.role?.toString().toLowerCase().includes("student"));
    }

    const assignedStudents = students.length;
    const pendingLeaveRequests = leaveRes.data?.length || 0;
    const attendanceRecords = attendanceRes.data || [];
    const presentToday = attendanceRecords.filter((a: any) => a.status === "P" || a.status === "Present").length;
    const absentToday = Math.max(0, assignedStudents - presentToday);

    return {
      assignedStudents,
      presentToday,
      absentToday,
      pendingLeaveRequests,
      recentClassNotes: [],
    };
  } catch (err) {
    console.error("Error in getTeacherDashboardStats:", err);
    return {
      assignedStudents: 0,
      presentToday: 0,
      absentToday: 0,
      pendingLeaveRequests: 0,
      recentClassNotes: [],
    };
  }
}

/**
 * Parent Dashboard Statistics Provider
 */
export async function getParentDashboardStats(): Promise<ParentDashboardStats> {
  try {
    const [studentsRes, messagesRes, feesRes] = await Promise.all([
      supabase.from("gv_users").select("id, full_name, class_name, role").or("role.eq.student,role.eq.Student,role.ilike.*student*").limit(1).maybeSingle(),
      supabase.from("gv_communications").select("id, sender_name, body, created_at").eq("message_type", "message").order("created_at", { ascending: false }).limit(3),
      supabase.from("gv_fees_payments").select("amount_paid, amount_due, balance").eq("record_type", "fee_schedule").limit(1).maybeSingle(),
    ]);

    const child = studentsRes.data;
    const messages = messagesRes.data || [];
    const feeData = feesRes.data;

    return {
      childName: child?.full_name || "Student",
      className: child?.class_name || "Nursery",
      attendancePercent: 0,
      totalFeePaid: Number(feeData?.amount_paid || 0),
      remainingBalance: Number(feeData?.balance || 0),
      recentMessages: messages.map((m: any) => ({
        id: m.id,
        sender: m.sender_name || "Class Teacher",
        text: m.body || "",
        time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today",
      })),
    };
  } catch (err) {
    console.error("Error in getParentDashboardStats:", err);
    return {
      childName: "Student",
      className: "Nursery",
      attendancePercent: 0,
      totalFeePaid: 0,
      remainingBalance: 0,
      recentMessages: [],
    };
  }
}

export async function getAnnualPromotionAndLifecycleStats(targetYear?: string): Promise<AnnualPromotionLifecycleStats> {
  const year = targetYear || getDeveloperSettings().school?.academicYear || "2026-2027";
  try {
    let { data: students } = await supabase.from("gv_users").select("id, status, role").or("role.eq.student,role.eq.Student,role.ilike.*student*");
    if (!students || students.length === 0) {
      const { data: allUsers } = await supabase.from("gv_users").select("id, status, role");
      if (allUsers) students = allUsers.filter((u: any) => u.role?.toString().toLowerCase().includes("student"));
    }
    const list = students || [];
    const totalStudents = list.length;
    const promotedCount = list.filter((s: any) => s.status === "Promoted").length;
    const graduatedCount = list.filter((s: any) => s.status === "Graduated").length;
    const tcIssued = list.filter((s: any) => s.status === "TC Issued" || s.status === "Transferred").length;
    const activeStudents = list.filter((s: any) => s.status === "active" || s.status === "Active").length;
    const promotionPending = Math.max(0, totalStudents - (promotedCount + graduatedCount + tcIssued));
    const promotionPercentage = totalStudents > 0 ? Number(((promotedCount / totalStudents) * 100).toFixed(1)) : 0;

    return {
      academicYear: year,
      studentsEligible: totalStudents,
      studentsPromoted: promotedCount,
      promotionPending,
      promotionCompleted: promotedCount,
      promotionFailed: 0,
      promotionPercentage,
      studentsWaitingReview: promotionPending,
      studentsRequiringManualAction: 0,
      totalAdmissions: totalStudents,
      activeStudents,
      graduatedStudents: graduatedCount,
      tcIssued,
      studentsLeftSchool: tcIssued,
      rejoinedStudents: 0,
      inactiveStudents: Math.max(0, totalStudents - activeStudents),
      archivedStudents: 0,
    };
  } catch (err) {
    console.error("Error in getAnnualPromotionAndLifecycleStats:", err);
    return {
      academicYear: year,
      studentsEligible: 0,
      studentsPromoted: 0,
      promotionPending: 0,
      promotionCompleted: 0,
      promotionFailed: 0,
      promotionPercentage: 0,
      studentsWaitingReview: 0,
      studentsRequiringManualAction: 0,
      totalAdmissions: 0,
      activeStudents: 0,
      graduatedStudents: 0,
      tcIssued: 0,
      studentsLeftSchool: 0,
      rejoinedStudents: 0,
      inactiveStudents: 0,
      archivedStudents: 0,
    };
  }
}

import { subscribeToRealtimeTable } from "./realtimeService";

export function subscribeToPromotionAndLifecycleUpdates(callback: (data: AnnualPromotionLifecycleStats) => void): () => void {
  const handler = () => {
    getAnnualPromotionAndLifecycleStats().then(callback).catch(() => {});
  };
  handler();

  return subscribeToRealtimeTable({
    table: "gv_users",
    onPayload: () => handler(),
  });
}
