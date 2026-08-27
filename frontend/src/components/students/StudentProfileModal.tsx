import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, UserCheck, FileText, CheckCircle2, History, Clock, Edit } from "lucide-react";
import { useClassAssignments } from "@/lib/classAssignmentContext";
import { useAcademicYear } from "@/lib/academicYearContext";
import { getPromotionHistory, getActivityTimeline } from "@/lib/promotionStore";
import { cn } from "@/lib/utils";
import { toCanonicalAdmissionNo } from "@/lib/credentials";
import { useStudentDocs } from "@/lib/studentDocsContext";
import { fetchStudents } from "@/lib/supabaseService";
import { fetchAttendanceFromSupabase, getStoredAttendance, type StudentAttendanceEntry } from "@/lib/attendanceStore";

interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
  student: any | null;
  onEditStudent?: (student: any) => void;
}

const mergeStudentData = (base: any, fresh: any) => {
  if (!fresh) return base;
  if (!base) return fresh;

  let parentObj: any = {};
  if (typeof base.parent === "object" && base.parent !== null) {
    parentObj = { ...base.parent };
  } else if (typeof base.parent === "string" && base.parent.trim()) {
    parentObj.name = base.parent.trim();
  }

  const freshParentName = typeof fresh.parent === "object"
    ? fresh.parent?.name
    : (fresh.parent || fresh.parent_name || fresh.fatherName);
  if (freshParentName && String(freshParentName).trim() && String(freshParentName).trim() !== "N/A" && String(freshParentName).trim() !== "Not provided") {
    parentObj.name = String(freshParentName).trim();
  }
  if (!parentObj.name) parentObj.name = "Parent";

  const freshPhone = fresh.mobile || fresh.phone || (typeof fresh.parent === "object" ? fresh.parent?.phone : undefined);
  if (freshPhone && String(freshPhone).trim() && String(freshPhone).trim() !== "N/A") {
    parentObj.phone = String(freshPhone).trim();
  }

  const freshEmail = fresh.email || fresh.parent_email || fresh.parentEmail || (typeof fresh.parent === "object" ? fresh.parent?.email : undefined);
  if (freshEmail && String(freshEmail).trim() && String(freshEmail).trim() !== "N/A") {
    parentObj.email = String(freshEmail).trim();
  }

  const freshOcc = fresh.occupation || fresh.parent_occupation || (typeof fresh.parent === "object" ? fresh.parent?.occupation : undefined);
  if (freshOcc && String(freshOcc).trim() && String(freshOcc).trim() !== "N/A") {
    parentObj.occupation = String(freshOcc).trim();
  }

  return {
    ...base,
    ...fresh,
    id: base.id || fresh.id,
    admissionNo: base.admissionNo || fresh.admissionNo || fresh.id || base.id,
    name: fresh.name || fresh.full_name || base.name,
    gender: fresh.gender || base.gender,
    className: fresh.className || fresh.class_name || base.className,
    section: fresh.section || base.section,
    rollNo: fresh.rollNo ?? fresh.roll_no ?? base.rollNo,
    dob: fresh.dob || fresh.dateOfBirth || fresh.date_of_birth || base.dob,
    bloodGroup: fresh.bloodGroup || fresh.blood_group || base.bloodGroup,
    address: fresh.address || fresh.residential_address || fresh.residentialAddress || base.address,
    parent: parentObj,
    phone: parentObj.phone || fresh.phone || base.phone,
    email: parentObj.email || fresh.email || base.email,
    academic: base.academic || fresh.academic,
    teacherRemarks: fresh.teacherRemarks || fresh.remarks || base.teacherRemarks,
    attendance: fresh.attendance ?? base.attendance,
    avatar: fresh.avatar || fresh.photo_url || base.avatar,
  };
};

export function StudentProfileModal({ open, onClose, student, onEditStudent }: StudentProfileModalProps) {
  const { activeYear } = useAcademicYear();
  const { getClassTeacher } = useClassAssignments();
  const { get: getDocs } = useStudentDocs();
  const [activeTab, setActiveTab] = useState<"profile" | "promotion" | "timeline">("profile");
  const [liveStudent, setLiveStudent] = useState<any>(student);
  const [attendanceStats, setAttendanceStats] = useState<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    leaveDays: number;
    percentage: number | null;
    displayStr: string;
    breakdownStr?: string;
  }>({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    leaveDays: 0,
    percentage: null,
    displayStr: "No attendance records",
  });

  const computeAttendance = (records: StudentAttendanceEntry[], currentSt: any) => {
    if (!currentSt) return;
    const sId = String(currentSt?.id || "").toLowerCase();
    const admNo = toCanonicalAdmissionNo(currentSt?.admissionNo || currentSt?.id, currentSt?.id).toLowerCase();
    const sName = String(currentSt?.name || "").toLowerCase();

    const matched = (records || []).filter((r) => {
      const rId = String(r.studentId || "").toLowerCase();
      const rAdm = String(r.admissionNo || "").toLowerCase();
      const rName = String(r.studentName || "").toLowerCase();
      return (
        (sId && rId === sId) ||
        (admNo && (rAdm === admNo || rId === admNo)) ||
        (sName && rName === sName)
      );
    });

    const totalDays = matched.length;
    if (totalDays > 0) {
      const presentDays = matched.filter((r) => r.status === "P").length;
      const absentDays = matched.filter((r) => r.status === "A").length;
      const lateDays = matched.filter((r) => r.status === "L").length;
      const leaveDays = matched.filter((r) => r.status === "Lv").length;
      const pct = Math.round(((presentDays + lateDays) / totalDays) * 100);

      setAttendanceStats({
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        percentage: pct,
        displayStr: `${pct}% Present`,
        breakdownStr: `${presentDays} Present, ${lateDays} Late, ${absentDays} Absent (${totalDays} total days)`,
      });
      return;
    }

    const fallbackAtt = currentSt?.attendance;
    if (fallbackAtt !== undefined && fallbackAtt !== null) {
      if (typeof fallbackAtt === "number") {
        setAttendanceStats({
          totalDays: 100,
          presentDays: Math.round((fallbackAtt / 100) * 100),
          absentDays: 100 - Math.round((fallbackAtt / 100) * 100),
          lateDays: 0,
          leaveDays: 0,
          percentage: fallbackAtt,
          displayStr: `${fallbackAtt}% Present`,
          breakdownStr: `${fallbackAtt}% Present based on enrolled student record`,
        });
        return;
      } else if (typeof fallbackAtt === "object") {
        const pres = fallbackAtt.present || 0;
        const abs = fallbackAtt.absent || 0;
        const late = fallbackAtt.late || 0;
        const lv = fallbackAtt.leave || 0;
        const tot = fallbackAtt.total || (pres + abs + late + lv) || 100;
        const pct = Math.round(((pres + late) / tot) * 100);

        setAttendanceStats({
          totalDays: tot,
          presentDays: pres,
          absentDays: abs,
          lateDays: late,
          leaveDays: lv,
          percentage: pct,
          displayStr: `${pct}% Present`,
          breakdownStr: `${pres} Present, ${late} Late, ${abs} Absent (${tot} total days)`,
        });
        return;
      }
    }

    setAttendanceStats({
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      leaveDays: 0,
      percentage: null,
      displayStr: "No attendance records",
    });
  };

  useEffect(() => {
    let isMounted = true;
    setLiveStudent(student);

    if (open && student?.id) {
      computeAttendance(getStoredAttendance(), student);

      Promise.all([
        fetchStudents(),
        fetchAttendanceFromSupabase()
      ]).then(([{ data: studentList }, attendanceRecords]) => {
        if (!isMounted) return;

        const match = (studentList || []).find((s: any) =>
          s.id === student.id ||
          (s.admissionNo && student.admissionNo && String(s.admissionNo).toLowerCase() === String(student.admissionNo).toLowerCase()) ||
          (s.name && student.name && String(s.name).toLowerCase() === String(student.name).toLowerCase())
        );

        const targetSt = match ? mergeStudentData(student, match) : student;
        setLiveStudent(targetSt);
        computeAttendance(attendanceRecords || [], targetSt);
      }).catch(() => {
        if (!isMounted) return;
        computeAttendance(getStoredAttendance(), student);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [open, student?.id]);

  if (!student) return null;

  const st = liveStudent || student;

  const canonicalAdmNo = toCanonicalAdmissionNo(st.admissionNo || st.id, st.id);
  const docRecord = getDocs(canonicalAdmNo) || getDocs(st.admissionNo) || getDocs(st.id);

  const rawParent = typeof st.parent === "object"
    ? st.parent?.name
    : (st.parent || st.parent_name || st.fatherName || st.guardianName || st.motherName);
  const parentName = (rawParent && String(rawParent).trim() !== "" && String(rawParent).trim() !== "N/A")
    ? String(rawParent).trim()
    : "Not provided";

  const rawPhone = typeof st.parent === "object" && st.parent?.phone
    ? st.parent.phone
    : (st.phone || st.mobile || st.parentPhone);
  const parentPhone = (rawPhone && String(rawPhone).trim() !== "" && String(rawPhone).trim() !== "N/A")
    ? String(rawPhone).trim()
    : "Not provided";

  const rawEmail = st.email || (typeof st.parent === "object" ? st.parent?.email : undefined) || st.parent_email || st.parentEmail;
  const studentEmail = (rawEmail && String(rawEmail).trim() !== "" && String(rawEmail).trim() !== "N/A")
    ? String(rawEmail).trim()
    : "Not provided";

  const rawAddress = st.address || st.residential_address || st.residentialAddress;
  const studentAddress = (rawAddress && String(rawAddress).trim() !== "" && String(rawAddress).trim() !== "N/A")
    ? String(rawAddress).trim()
    : "Not provided";

  const rawDob = st.dob || st.dateOfBirth || st.date_of_birth;
  const studentDob = (rawDob && String(rawDob).trim() !== "" && String(rawDob).trim() !== "N/A")
    ? String(rawDob).trim()
    : "Not provided";

  const rawGender = st.gender || st.sex;
  const studentGender = (rawGender && String(rawGender).trim() !== "" && String(rawGender).trim() !== "N/A")
    ? String(rawGender).trim()
    : "Not provided";

  const rawBloodGroup = st.bloodGroup || st.blood_group;
  const studentBloodGroup = (rawBloodGroup && String(rawBloodGroup).trim() !== "" && String(rawBloodGroup).trim() !== "N/A")
    ? String(rawBloodGroup).trim()
    : "Not provided";

  const rawHouse = st.house || st.houseGroup;
  const studentHouse = (rawHouse && String(rawHouse).trim() !== "" && String(rawHouse).trim() !== "N/A")
    ? String(rawHouse).trim()
    : "Not provided";

  const rawAdmissionDate = st.admissionDate || st.joinedOn || st.created_at || st.admission_date;
  const studentJoinedOn = (rawAdmissionDate && String(rawAdmissionDate).trim() !== "" && String(rawAdmissionDate).trim() !== "N/A")
    ? String(rawAdmissionDate).trim().slice(0, 10)
    : "Not provided";

  const rawAcademicYear = st.academicYear || st.academic_year || activeYear;
  const studentAcademicYear = (rawAcademicYear && String(rawAcademicYear).trim() !== "" && String(rawAcademicYear).trim() !== "N/A")
    ? String(rawAcademicYear).trim()
    : "Not provided";

  const rollNo = st.rollNo ?? st.roll_no;
  const assignedClass = st.className ? `${st.className}${st.section ? `-${st.section}` : ""}` : "Not provided";

  const teacherObj = getClassTeacher(st.className || "Nursery", st.section || "A");
  const rawClassTeacher = teacherObj?.teacherName || st.classTeacher;
  const classTeacherName = (rawClassTeacher && String(rawClassTeacher).trim() !== "" && String(rawClassTeacher).trim() !== "Unassigned" && String(rawClassTeacher).trim() !== "N/A")
    ? String(rawClassTeacher).trim()
    : "Not provided";

  const avatarUrl = st.avatar || st.avatarSeed || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(st.name || "Student")}`;

  const promotionHistory = getPromotionHistory().filter((p) =>
    p.studentId === st.id ||
    p.studentId === canonicalAdmNo ||
    (p as any).studentName?.toLowerCase() === st.name?.toLowerCase()
  );

  let activityTimeline = getActivityTimeline(st.id);
  if (activityTimeline.length === 0) {
    activityTimeline = getActivityTimeline(canonicalAdmNo);
  }
  if (activityTimeline.length === 0) {
    const allTimeline = getActivityTimeline();
    activityTimeline = allTimeline.filter((item) =>
      item.studentId === st.id ||
      item.studentId === canonicalAdmNo ||
      (item.description && item.description.toLowerCase().includes(st.name.toLowerCase()))
    );
  }
  if (activityTimeline.length === 0 && st.name) {
    activityTimeline = [{
      id: `act-${st.id}-init`,
      studentId: st.id,
      title: "Student Enrolled & Registered",
      description: `Student ${st.name} was formally registered in Class ${assignedClass} for Academic Session ${studentAcademicYear}.`,
      timestamp: studentJoinedOn !== "Not provided" ? new Date(studentJoinedOn).toISOString() : new Date().toISOString(),
      category: "Admission",
      performedBy: "Office Staff",
    }];
  }

  const attachedDocs = (st.documents && st.documents.length > 0)
    ? st.documents
    : (docRecord?.documents && docRecord.documents.length > 0)
      ? docRecord.documents
      : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-14 w-14 border-2 border-indigo-100 shadow-md">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="font-bold text-indigo-700 bg-indigo-50">{st.name ? st.name[0] : "S"}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">{st.name}</DialogTitle>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Admission No: <span className="font-mono font-bold text-slate-700">{canonicalAdmNo}</span> {rollNo ? `· Roll #${rollNo}` : ""} · Class {assignedClass}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEditStudent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEditStudent(st);
                  }}
                  className="rounded-xl border-slate-200 text-xs font-semibold hover:bg-slate-50 text-indigo-700"
                >
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit Details & Certificates
                </Button>
              )}
              <Badge className={cn("text-xs px-3 py-1 font-semibold rounded-full shrink-0 border", st.status === "Graduated" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-emerald-100 text-emerald-800 border-emerald-200")}>
                {st.status || "Enrolled"}
              </Badge>
            </div>
          </div>

          {/* Modal Tabs */}
          <div className="flex items-center gap-2 border-b pt-3">
            <button
              onClick={() => setActiveTab("profile")}
              className={cn("px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5", activeTab === "profile" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900")}
            >
              <GraduationCap className="h-3.5 w-3.5" /> Profile Overview
            </button>
            <button
              onClick={() => setActiveTab("promotion")}
              className={cn("px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5", activeTab === "promotion" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900")}
            >
              <History className="h-3.5 w-3.5" /> Promotion History ({promotionHistory.length})
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={cn("px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5", activeTab === "timeline" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900")}
            >
              <Clock className="h-3.5 w-3.5" /> Activity Timeline ({activityTimeline.length})
            </button>
          </div>
        </DialogHeader>

        {activeTab === "profile" && (
          <div className="space-y-4 text-xs mt-3">
            {/* 1. Student Details */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" /> Student Profile Details
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div><span className="text-slate-400 block font-medium">Date of Birth</span><span className="font-semibold text-slate-800">{studentDob}</span></div>
                <div><span className="text-slate-400 block font-medium">Gender</span><span className="font-semibold text-slate-800">{studentGender}</span></div>
                <div><span className="text-slate-400 block font-medium">Blood Group</span><span className="font-semibold text-slate-800">{studentBloodGroup}</span></div>
                <div><span className="text-slate-400 block font-medium">House / Group</span><span className="font-semibold text-slate-800">{studentHouse}</span></div>
                <div><span className="text-slate-400 block font-medium">Admission Date</span><span className="font-semibold text-slate-800">{studentJoinedOn}</span></div>
                <div><span className="text-slate-400 block font-medium">Academic Year</span><span className="font-semibold text-slate-800">{studentAcademicYear}</span></div>
              </div>
            </div>

            {/* 2. Parent Details */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-sky-600" /> Parent & Guardian Contact
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div><span className="text-slate-400 block font-medium">Parent / Guardian</span><span className="font-semibold text-slate-800">{parentName}</span></div>
                <div><span className="text-slate-400 block font-medium">Phone Number</span><span className="font-semibold text-slate-800">{parentPhone}</span></div>
                <div><span className="text-slate-400 block font-medium">Email Address</span><span className="font-semibold text-slate-800">{studentEmail}</span></div>
                <div><span className="text-slate-400 block font-medium">Residential Address</span><span className="font-semibold text-slate-800">{studentAddress}</span></div>
              </div>
            </div>

            {/* 3. Class & Teacher Assignments */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" /> Academic, Class & Subject Teachers
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div><span className="text-slate-400 block font-medium">Assigned Class</span><span className="font-semibold text-slate-800">{assignedClass}</span></div>
                <div>
                  <span className="text-slate-400 block font-medium">Class Teacher</span>
                  <span className="font-bold text-indigo-700">{classTeacherName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Attendance Rate</span>
                  <span className={cn("font-bold", attendanceStats.percentage !== null ? "text-emerald-600" : "text-slate-500 font-semibold")}>
                    {attendanceStats.displayStr}
                  </span>
                  {attendanceStats.breakdownStr && (
                    <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                      {attendanceStats.breakdownStr}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Documents */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" /> Attached Documents
              </div>
              <div className="pt-1">
                {attachedDocs && attachedDocs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {attachedDocs.map((doc: any, i: number) => {
                      const docName = typeof doc === "string" ? doc : doc.name;
                      const docStatus = typeof doc === "object" && doc.status ? doc.status : undefined;
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-xs">
                          <CheckCircle2 className={cn("w-3.5 h-3.5", docStatus === "Pending" ? "text-amber-500" : "text-emerald-500")} />
                          {docName} {docStatus ? `(${docStatus})` : ""}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs italic">No attached documents available.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROMOTION HISTORY TAB */}
        {activeTab === "promotion" && (
          <div className="space-y-3 text-xs mt-3">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-indigo-950 text-xs">Academic Progression Log</h4>
                <p className="text-[11px] text-slate-600">Permanent record of class transitions across academic years</p>
              </div>
              <Badge className="bg-indigo-600 text-white font-bold text-xs">{promotionHistory.length} Transitions</Badge>
            </div>

            {promotionHistory.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-md text-slate-700 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="px-3 py-2">Academic Year</th>
                      <th className="px-3 py-2">Source Class</th>
                      <th className="px-3 py-2">Target Class</th>
                      <th className="px-3 py-2">Promoted By</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promotionHistory.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50 transition">
                        <td className="px-3 py-2 font-bold text-slate-900">{p.fromAcademicYear} → {p.toAcademicYear}</td>
                        <td className="px-3 py-2 font-semibold text-slate-700">{p.fromClass}</td>
                        <td className="px-3 py-2 font-bold text-indigo-700">{p.toClass}</td>
                        <td className="px-3 py-2 text-slate-700">{p.promotedBy}</td>
                        <td className="px-3 py-2 text-slate-600">{p.promotedOn}</td>
                        <td className="px-3 py-2">
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No promotion history recorded yet for this student.
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TIMELINE TAB */}
        {activeTab === "timeline" && (
          <div className="space-y-3 text-xs mt-3">
            <div className="p-3.5 rounded-2xl bg-slate-100 border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Permanent Student Lifecycle Activity Log</h4>
                <p className="text-[11px] text-slate-600">Chronological history of enrollment, fees, attendance & promotions</p>
              </div>
              <Badge variant="outline" className="bg-white font-bold">{activityTimeline.length} Events</Badge>
            </div>

            {activityTimeline.length > 0 ? (
              <div className="relative border-l-2 border-indigo-200 ml-4 pl-4 space-y-3 py-2">
                {activityTimeline.map((item, idx) => (
                  <div key={item.id || idx} className="relative">
                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-100" />
                    <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <Badge variant="outline" className="text-[9px] bg-white">{item.category}</Badge>
                        <span>• By {item.performedBy}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No activity timeline records found.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} variant="outline" className="rounded-xl border-slate-200">
            Close Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

