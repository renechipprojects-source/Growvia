import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { fetchStudents, fetchEnquiries, fetchFees } from "@/lib/supabaseService";
import { Users, ClipboardCheck, Bell, CreditCard } from "lucide-react";
import { useAlerts } from "@/lib/alertsContext";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";

export const Route = createFileRoute("/office/")({ component: Dash });

const priorityChip: Record<string, string> = {
  Urgent: "bg-rose-100 text-rose-700",
  High: "bg-amber-100 text-amber-700",
  Normal: "bg-emerald-100 text-emerald-700",
  Low: "bg-slate-100 text-slate-700",
};

function Dash() {
  const { liveFor } = useAlerts();
  const alerts = liveFor("office");
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalEnquiries, setTotalEnquiries] = useState(0);
  const [totalFees, setTotalFees] = useState(0);

  useEffect(() => {
    fetchStudents().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setTotalStudents(data.length);
    });
    fetchEnquiries().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setTotalEnquiries(data.length);
    });
    fetchFees().then(({ data, isFromSupabase }) => {
      if (isFromSupabase) setTotalFees(data.length);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="Office Command Center"
        subtitle="Focused on admissions and administrative work."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={totalStudents}
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
          sub="Enrolled in database"
        />
        <StatCard
          label="Active Enquiries"
          value={totalEnquiries}
          icon={ClipboardCheck}
          gradient="from-orange-500 to-amber-500"
          sub="In admission pipeline"
        />
        <StatCard
          label="Fee Ledgers"
          value={totalFees}
          icon={CreditCard}
          gradient="from-emerald-500 to-teal-500"
          sub="Active fee records"
        />
        <StatCard
          label="Active alerts"
          value={alerts.length}
          icon={Bell}
          gradient="from-indigo-500 to-purple-500"
          sub="From the Principal"
        />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <SectionCard title="Annual Promotion & Lifecycle Summary" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Promoted</div>
              <div className="text-xl font-bold text-emerald-900 mt-1">27</div>
              <div className="text-[10px] text-emerald-700">Academic Year 2026-27</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Retained</div>
              <div className="text-xl font-bold text-amber-900 mt-1">2</div>
              <div className="text-[10px] text-amber-700">Same Class Progression</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200">
              <div className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider">Graduated</div>
              <div className="text-xl font-bold text-purple-900 mt-1">5</div>
              <div className="text-[10px] text-purple-700">Alumni Directory</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
              <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Transferred</div>
              <div className="text-xl font-bold text-rose-900 mt-1">1</div>
              <div className="text-[10px] text-rose-700">TC Issued History</div>
            </div>
          </div>
        </SectionCard>

        <RecentCircularWidget role="office" viewAllLink="/office/circulars" />
      </div>

      <div className="mt-4">
        <SectionCard title="Quick actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <QuickLink to="/office/new-enquiry" label="New Enquiry" hint="Capture a walk-in or call" />
            <QuickLink to="/office/enquiries" label="Enquiry Kanban" hint="Move through the pipeline" />
            <QuickLink to="/office/admissions" label="Admissions" hint="Approve & enroll" />
            <QuickLink to="/office/students" label="Students & Promotion Wizard" hint="Manage enrolled kids & promotions" />
            <QuickLink to="/office/promotion-mapping" label="Promotion Mapping" hint="Configure progression rules" />
            <QuickLink to="/office/class-assignment" label="Class Assignment" hint="Assign teachers" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function QuickLink({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white/70 border border-white/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </Link>
  );
}
