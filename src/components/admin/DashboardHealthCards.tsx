import React from "react";
import { Users, UserCheck, CreditCard, Megaphone, Bus, Boxes, UserPlus, GraduationCap } from "lucide-react";

export function DashboardHealthCards() {
  const cards = [
    { title: "Total Students", value: "124", sub: "Active enrolled", icon: Users, color: "from-blue-500 to-indigo-600" },
    { title: "Present Today", value: "96.4%", sub: "119 / 124 present", icon: UserCheck, color: "from-emerald-500 to-teal-600" },
    { title: "Pending Fees", value: "₹0", sub: "100% collected", icon: CreditCard, color: "from-amber-500 to-orange-600" },
    { title: "Unread Circulars", value: "2", sub: "Pending read", icon: Megaphone, color: "from-purple-500 to-pink-600" },
    { title: "Transport Assigned", value: "48", sub: "Across 3 routes", icon: Bus, color: "from-sky-500 to-cyan-600" },
    { title: "Low Inventory", value: "1", sub: "Drawing books low", icon: Boxes, color: "from-rose-500 to-red-600" },
    { title: "New Admissions", value: "12", sub: "This academic year", icon: UserPlus, color: "from-indigo-500 to-blue-600" },
    { title: "Teacher Attendance", value: "100%", sub: "4 / 4 staff present", icon: GraduationCap, color: "from-teal-500 to-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 truncate">{c.title}</div>
              <div className="text-base font-extrabold text-slate-900 leading-tight">{c.value}</div>
              <div className="text-[10px] text-slate-400 truncate">{c.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
