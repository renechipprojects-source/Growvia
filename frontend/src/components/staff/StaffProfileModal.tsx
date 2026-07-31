import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, UserCheck, Phone, Mail, Award, Calendar } from "lucide-react";

interface StaffProfileModalProps {
  open: boolean;
  onClose: () => void;
  staff: any | null;
}

export function StaffProfileModal({ open, onClose, staff }: StaffProfileModalProps) {
  if (!staff) return null;

  const avatarUrl = staff.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(staff.name)}`;
  const classesList = Array.isArray(staff.classesAssigned) ? staff.classesAssigned.join(", ") : staff.classesAssigned || "Playgroup A";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-white/60 bg-white/95 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-14 w-14 border-2 border-indigo-100 shadow-md">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="font-bold text-indigo-700 bg-indigo-50">{staff.name ? staff.name[0] : "T"}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">{staff.name}</DialogTitle>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  Emp ID #{staff.empId || staff.id} · {staff.subject || "Early Childhood Education"}
                </div>
              </div>
            </div>
            <Badge className={staff.status === "On Leave" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"} variant="outline">
              {staff.status || "Active"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-xs mt-3">
          {/* 1. Contact & Employment */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" /> Employment & Contact Details
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div><span className="text-slate-400 block font-medium">Qualification</span><span className="font-semibold text-slate-800">{staff.qualification || "B.Ed / Early Learning Certified"}</span></div>
              <div><span className="text-slate-400 block font-medium">Experience</span><span className="font-semibold text-slate-800">{staff.experience || 5} Years</span></div>
              <div><span className="text-slate-400 block font-medium">Phone Number</span><span className="font-semibold text-slate-800">{staff.phone || "+91 98765 43210"}</span></div>
              <div><span className="text-slate-400 block font-medium">Email Address</span><span className="font-semibold text-slate-800">{staff.email || "teacher@sunshine.edu"}</span></div>
            </div>
          </div>

          {/* 2. Class & Subject Assignments */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-600" /> Teaching & Class Assignments
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div><span className="text-slate-400 block font-medium">Primary Subject</span><span className="font-semibold text-slate-800">{staff.subject || "Phonics & General Knowledge"}</span></div>
              <div><span className="text-slate-400 block font-medium">Classes Assigned</span><span className="font-bold text-indigo-600">{classesList}</span></div>
            </div>
          </div>

          {/* 3. Attendance Summary */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-sky-600" /> Staff Attendance Summary
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs pt-1">
              <div><span className="text-slate-400 block font-medium">Check-In Time</span><span className="font-semibold text-slate-800">08:30 AM</span></div>
              <div><span className="text-slate-400 block font-medium">Monthly Attendance</span><span className="font-bold text-emerald-600">98% Present</span></div>
              <div><span className="text-slate-400 block font-medium">Working Hours</span><span className="font-semibold text-slate-800">7.5 hrs/day</span></div>
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
