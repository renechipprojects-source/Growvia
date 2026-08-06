import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { fetchStudents, fetchEnquiries, fetchFees } from "@/lib/supabaseService";
import { Users, ClipboardCheck, Bell, CreditCard } from "lucide-react";
import { useAlerts } from "@/lib/alertsContext";
import { RecentCircularWidget } from "@/components/circulars/RecentCircularWidget";
import { AnnualPromotionLifecycleSection } from "@/components/promotion/AnnualPromotionLifecycleSection";

import { getOfficeDashboardStats } from "@/lib/dashboardStatsService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

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
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalEnquiries: 0,
    totalFeeCollected: 0,
    pendingFeeBalance: 0,
    recentAdmissions: [] as any[],
    recentFeeCollections: [] as any[],
  });

  const loadData = () => {
    getOfficeDashboardStats().then((data) => {
      setStats(data);
    });
  };

  useAutoRefresh("admissions", loadData);
  useAutoRefresh("students", loadData);
  useAutoRefresh("fees", loadData);

  useEffect(() => {
    loadData();
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
          value={stats.totalStudents}
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
          sub="Enrolled in database"
        />
        <StatCard
          label="Active Enquiries"
          value={stats.totalEnquiries}
          icon={ClipboardCheck}
          gradient="from-orange-500 to-amber-500"
          sub="In admission pipeline"
        />
        <StatCard
          label="Fee Collection"
          value={`₹${stats.totalFeeCollected.toLocaleString()}`}
          icon={CreditCard}
          gradient="from-emerald-500 to-teal-500"
          sub="Active fee payments"
        />
        <StatCard
          label="Active alerts"
          value={alerts.length}
          icon={Bell}
          gradient="from-indigo-500 to-purple-500"
          sub="From the Principal"
        />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <AnnualPromotionLifecycleSection />
        </div>
        <div>
          <RecentCircularWidget role="office" viewAllLink="/office/circulars" />
        </div>
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
