import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, UserCheck } from "lucide-react";
import { toCanonicalAdmissionNo } from "@/lib/supabaseService";

interface ClassDetailsModalProps {
  open: boolean;
  onClose: () => void;
  classInfo: any | null;
  studentsList?: any[];
}

export function ClassDetailsModal({ open, onClose, classInfo, studentsList = [] }: ClassDetailsModalProps) {
  if (!classInfo) return null;

  const classNameStr = classInfo.name || classInfo.className || "Playgroup";
  const sectionStr = classInfo.section || "A";
  const teacherStr = classInfo.classTeacher || classInfo.teacher || "Ananya Sen";
  const roomStr = classInfo.room || "Room 101";

  const norm = (str: string) => (str || "").toLowerCase().replace(/[\s\-_]+/g, "");
  const baseNameNorm = norm(classInfo.className || classNameStr);
  const targetSec = sectionStr.trim().toUpperCase();

  const classStudents = useMemo(() => {
    if (Array.isArray(classInfo.students) && classInfo.students.length > 0) {
      return classInfo.students;
    }
    if (Array.isArray(classInfo.matchedStudents) && classInfo.matchedStudents.length > 0) {
      return classInfo.matchedStudents;
    }
    return studentsList.filter((s) => {
      const sRaw = (s.className || s.class_name || "").trim();
      const sNorm = norm(sRaw);
      const classMatches = sNorm.includes(baseNameNorm) || baseNameNorm.includes(sNorm) || sNorm.startsWith(baseNameNorm);
      let sSec = (s.section || "").trim().toUpperCase();
      if (!sSec) {
        if (/\b(b|sec-b|section-b)\b/i.test(sRaw) || sRaw.endsWith(" B")) sSec = "B";
        else if (/\b(c|sec-c|section-c)\b/i.test(sRaw) || sRaw.endsWith(" C")) sSec = "C";
        else sSec = "A";
      }
      return classMatches && sSec === targetSec;
    });
  }, [classInfo, studentsList, baseNameNorm, targetSec]);

  const strengthCount = classStudents.length || classInfo.strength || classInfo.enrolled || 0;

  const metrics = useMemo(() => {
    const totalCount = classStudents.length;

    // 1. Attendance Rate Calculation
    let attendanceRate = 95;
    if (totalCount > 0) {
      let sumAttendance = 0;
      let validAttCount = 0;

      classStudents.forEach((s: any) => {
        if (s.attendance !== undefined && s.attendance !== null && s.attendance !== "") {
          const num = typeof s.attendance === "number" ? s.attendance : parseFloat(String(s.attendance));
          if (!isNaN(num)) {
            sumAttendance += num;
            validAttCount++;
          }
        } else if (s.status === "Present" || s.attendanceStatus === "Present") {
          sumAttendance += 100;
          validAttCount++;
        } else if (s.status === "Absent" || s.attendanceStatus === "Absent") {
          sumAttendance += 0;
          validAttCount++;
        }
      });

      if (validAttCount > 0) {
        attendanceRate = Math.round(sumAttendance / validAttCount);
      } else {
        attendanceRate = 95;
      }
    } else if (classInfo.attendanceRate !== undefined) {
      attendanceRate = typeof classInfo.attendanceRate === "number" ? classInfo.attendanceRate : parseInt(classInfo.attendanceRate) || 95;
    }

    // 2. Fee Collection Rate Calculation
    let paidStudents = 0;
    let partialStudents = 0;
    let feeRate = 100;

    if (totalCount > 0) {
      classStudents.forEach((s: any) => {
        const st = (s.feeStatus || s.fee_status || "").toString().trim().toLowerCase();
        if (st === "paid") {
          paidStudents++;
        } else if (st === "partial") {
          partialStudents++;
        }
      });

      feeRate = Math.round(((paidStudents + partialStudents * 0.5) / totalCount) * 100);
    } else if (classInfo.feeRate !== undefined || classInfo.feeCollectionRate !== undefined) {
      feeRate = typeof classInfo.feeRate === "number" ? classInfo.feeRate : parseInt(classInfo.feeRate || classInfo.feeCollectionRate) || 100;
    }

    return {
      totalCount,
      attendanceRate,
      feeRate,
      paidStudents,
      partialStudents,
    };
  }, [classStudents, classInfo]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg border border-indigo-200 shadow-sm shrink-0">
                {classNameStr.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">
                  {classNameStr} — Section {sectionStr}
                </DialogTitle>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Class Teacher: {teacherStr} · {roomStr}
                </div>
              </div>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs px-3 py-1 font-semibold rounded-full shrink-0">
              Capacity: {strengthCount} / {classInfo.capacity ? classInfo.capacity : "Not Assigned"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-xs mt-3">
          {/* 1. Class Overview */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-600" /> Class Metrics & Details
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div><span className="text-slate-400 block font-medium">Class Name</span><span className="font-semibold text-slate-800">{classNameStr}</span></div>
              <div><span className="text-slate-400 block font-medium">Section</span><span className="font-semibold text-slate-800">{sectionStr}</span></div>
              <div><span className="text-slate-400 block font-medium">Classroom</span><span className="font-semibold text-slate-800">{roomStr}</span></div>
              <div><span className="text-slate-400 block font-medium">Enrolled Students</span><span className="font-semibold text-slate-800">{strengthCount} Enrolled</span></div>
            </div>
          </div>

          {/* 2. Attendance & Fee Summary */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" /> Attendance & Financial Overview
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 block font-medium">Class Attendance Rate</span>
                <span className="font-bold text-emerald-600">
                  {metrics.totalCount > 0 ? `${metrics.attendanceRate}% Present Today` : `${metrics.attendanceRate}% Present Today`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Fee Collection Rate</span>
                <span className="font-bold text-indigo-600">
                  {metrics.totalCount > 0
                    ? `${metrics.feeRate}% Fees Collected (${metrics.paidStudents}/${metrics.totalCount} Paid)`
                    : `${metrics.feeRate}% Fees Collected`}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Enrolled Student Roster (Separate Dedicated Scroll Area) */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-600" /> Enrolled Student Roster ({classStudents.length})
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 bg-white">
                Scrollable Roster
              </Badge>
            </div>
            {/* Separate Scrollable Area for Roster */}
            <div className="space-y-2 pt-1 max-h-56 overflow-y-auto pr-1">
              {classStudents.length > 0 ? (
                classStudents.map((s: any) => (
                  <div key={s.id || s.admissionNo} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs hover:border-indigo-100 transition-colors">
                    <div>
                      <span className="font-semibold text-slate-800">{s.name}</span>
                      <span className="text-[11px] text-slate-400 block">Admission #{toCanonicalAdmissionNo(s.admissionNo, s.id)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={s.feeStatus === "Paid" ? "bg-emerald-100 text-emerald-700 text-[10px]" : s.feeStatus === "Partial" ? "bg-amber-100 text-amber-700 text-[10px]" : "bg-rose-100 text-rose-700 text-[10px]"}>
                        {s.feeStatus || "Pending"}
                      </Badge>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px]">
                        Active
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 italic p-4 text-center">No students currently enrolled in this class section.</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} variant="outline" className="rounded-xl border-slate-200">
            Close Class Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

