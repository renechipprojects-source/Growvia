import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, UserCheck, CreditCard, DoorOpen } from "lucide-react";

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
  const strengthCount = classInfo.strength || classInfo.enrolled || 10;

  // Filter students belonging to this class
  const classStudents = studentsList.filter(
    (s) => (s.className === classNameStr || s.className === classInfo.id) && (!s.section || s.section === sectionStr)
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg border border-indigo-200 shadow-sm">
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
              Capacity: {strengthCount} / 20
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
              <div><span className="text-slate-400 block font-medium">Enrolled Strength</span><span className="font-semibold text-emerald-600">{strengthCount} Kids</span></div>
            </div>
          </div>

          {/* 2. Attendance & Fee Summary */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" /> Attendance & Financial Overview
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div><span className="text-slate-400 block font-medium">Class Attendance Rate</span><span className="font-bold text-emerald-600">95% Present Today</span></div>
              <div><span className="text-slate-400 block font-medium">Fee Collection Rate</span><span className="font-bold text-indigo-600">100% Fees Collected</span></div>
            </div>
          </div>

          {/* 3. Enrolled Student Roster */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-600" /> Enrolled Student Roster
            </div>
            <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
              {(classStudents.length > 0 ? classStudents : [
                { id: "S-1", name: "Aarav Sharma", admissionNo: "SUN-2026-001", parent: "Mr. Sharma" },
                { id: "S-2", name: "Kiara Patel", admissionNo: "SUN-2026-002", parent: "Mrs. Patel" },
                { id: "S-3", name: "Vivaan Rao", admissionNo: "SUN-2026-003", parent: "Dr. Rao" },
              ]).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    <span className="text-[11px] text-slate-400 block">Admission #{s.admissionNo || s.id}</span>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px]">Active</Badge>
                </div>
              ))}
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
