import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, UserCheck, CreditCard, FileText, Download, CheckCircle2 } from "lucide-react";
import { useClassAssignments } from "@/lib/classAssignmentContext";

interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
  student: any | null;
}

export function StudentProfileModal({ open, onClose, student }: StudentProfileModalProps) {
  const { getClassTeacher, getSubjectTeachers } = useClassAssignments();
  if (!student) return null;

  const parentName = typeof student.parent === "object" ? student.parent?.name : student.parent || "Parent / Guardian";
  const parentPhone = typeof student.parent === "object" ? student.parent?.phone : student.phone || "+91 98765 43210";
  const avatarUrl = student.avatar || student.avatarSeed || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`;

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
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs px-3 py-1 font-semibold rounded-full shrink-0">
              Active Student
            </Badge>
          </div>
        </DialogHeader>

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
              <div><span className="text-slate-400 block font-medium">House</span><span className="font-semibold text-slate-800">{student.house || "Sunshine Yellow"}</span></div>
              <div><span className="text-slate-400 block font-medium">Status</span><span className="font-semibold text-emerald-600">Enrolled</span></div>
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
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 block font-medium text-[11px] mb-1">Subject Teachers (Office Managed)</span>
              <div className="flex flex-wrap gap-1.5">
                {(getSubjectTeachers(student.className || "Nursery", student.section || "A").length > 0
                  ? getSubjectTeachers(student.className || "Nursery", student.section || "A")
                  : [
                      { subject: "English", teacherName: "Mrs. Priya" },
                      { subject: "Mathematics", teacherName: "Mr. Rakesh" },
                      { subject: "Rhymes", teacherName: "Mrs. Priya" },
                    ]
                ).map((st, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px]">
                    <span className="font-semibold text-slate-800">{st.subject}:</span> {st.teacherName}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Fee Status */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-600" /> Fee Ledger Summary
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs pt-1">
              <div><span className="text-slate-400 block font-medium">Annual Expected</span><span className="font-semibold text-slate-800">₹8,500</span></div>
              <div><span className="text-slate-400 block font-medium">Amount Paid</span><span className="font-semibold text-emerald-600">₹8,500</span></div>
              <div><span className="text-slate-400 block font-medium">Pending Balance</span><span className="font-bold text-slate-800">₹0</span></div>
            </div>
          </div>

          {/* 5. Documents */}
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

        <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} variant="outline" className="rounded-xl border-slate-200">
            Close Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
