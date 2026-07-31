import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, UserCheck, CreditCard, FileText, CheckCircle2, History, Clock, ArrowRight } from "lucide-react";
import { useClassAssignments } from "@/lib/classAssignmentContext";
import { getPromotionHistory, getActivityTimeline } from "@/lib/promotionStore";
import { cn } from "@/lib/utils";

interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
  student: any | null;
}

export function StudentProfileModal({ open, onClose, student }: StudentProfileModalProps) {
  const { getClassTeacher, getSubjectTeachers } = useClassAssignments();
  const [activeTab, setActiveTab] = useState<"profile" | "promotion" | "timeline">("profile");

  if (!student) return null;

  const parentName = typeof student.parent === "object" ? student.parent?.name : student.parent || "Parent / Guardian";
  const parentPhone = typeof student.parent === "object" ? student.parent?.phone : student.phone || "+91 98765 43210";
  const avatarUrl = student.avatar || student.avatarSeed || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`;

  const promotionHistory = getPromotionHistory().filter((p) => p.studentId === student.id || p.studentId === "STU1001");
  const activityTimeline = getActivityTimeline(student.id || "STU1001");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-14 w-14 border-2 border-indigo-100 shadow-md">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="font-bold text-indigo-700 bg-indigo-50">{student.name ? student.name[0] : "S"}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">{student.name}</DialogTitle>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Admission #{student.admissionNo || student.id} · Roll #{student.rollNo || 1} · Class {student.className}-{student.section || "A"}
                </div>
              </div>
            </div>
            <Badge className={cn("text-xs px-3 py-1 font-semibold rounded-full shrink-0 border", student.status === "Graduated" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-emerald-100 text-emerald-800 border-emerald-200")}>
              {student.status || "Enrolled Student"}
            </Badge>
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
                <div><span className="text-slate-400 block font-medium">Date of Birth</span><span className="font-semibold text-slate-800">{student.dob || "2022-01-15"}</span></div>
                <div><span className="text-slate-400 block font-medium">Gender</span><span className="font-semibold text-slate-800">{student.gender || "Male"}</span></div>
                <div><span className="text-slate-400 block font-medium">Blood Group</span><span className="font-semibold text-slate-800">{student.bloodGroup || "O+"}</span></div>
                <div><span className="text-slate-400 block font-medium">Admission Date</span><span className="font-semibold text-slate-800">{student.joinedOn || student.admissionDate || "2024-06-01"}</span></div>
                <div><span className="text-slate-400 block font-medium">Academic Year</span><span className="font-semibold text-slate-800">{student.academicYear || "2026-2027"}</span></div>
                <div><span className="text-slate-400 block font-medium">Status</span><span className="font-semibold text-emerald-600">{student.status || "Enrolled"}</span></div>
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
                <div><span className="text-slate-400 block font-medium">Email Address</span><span className="font-semibold text-slate-800">{student.email || "parent@sunshine.edu"}</span></div>
                <div><span className="text-slate-400 block font-medium">Residential Address</span><span className="font-semibold text-slate-800">{student.address || "Bengaluru, Karnataka"}</span></div>
              </div>
            </div>

            {/* 3. Class & Teacher Assignments */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" /> Academic, Class & Subject Teachers
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div><span className="text-slate-400 block font-medium">Assigned Class</span><span className="font-semibold text-slate-800">{student.className}-{student.section || "A"}</span></div>
                <div>
                  <span className="text-slate-400 block font-medium">Class Teacher</span>
                  <span className="font-bold text-indigo-700">
                    {getClassTeacher(student.className || "Nursery", student.section || "A")?.teacherName || "Mrs. Priya"}
                  </span>
                </div>
                <div><span className="text-slate-400 block font-medium">Attendance Rate</span><span className="font-bold text-emerald-600">96% Present</span></div>
              </div>
            </div>

            {/* 4. Documents */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" /> Attached Documents
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Birth Certificate.pdf
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Parent Address Proof.pdf
                </span>
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
                  <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px]">
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
