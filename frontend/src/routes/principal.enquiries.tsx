import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/admin/page-primitives";
import { DataTable, TableRow, TableCell } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Users, Sparkles, Phone, Calendar } from "lucide-react";
import { fetchEnquiries, type Enquiry } from "@/lib/supabaseService";
import { useAutoRefresh } from "@/lib/autoRefreshContext";

export const Route = createFileRoute("/principal/enquiries")({
  component: PrincipalEnquiriesPage,
  head: () => ({ meta: [{ title: "Admissions Enquiries — Sunshine Play School" }] }),
});

function PrincipalEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  const loadData = () => {
    fetchEnquiries().then(({ data }) => {
      if (data) setEnquiries(data);
    });
  };

  useAutoRefresh("enquiries", loadData);

  useEffect(() => {
    loadData();
  }, []);

  const activeEnquiries = enquiries.filter(
    (e) => e.status !== "Enrolled" && (e.status as string) !== "Converted",
  );
  const enrolledCount = enquiries.filter(
    (e) => e.status === "Enrolled" || (e.status as string) === "Converted",
  ).length;

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-3">
      <PageHeader
        title="Admission Enquiries"
        description="Principal overview of prospective student walk-ins, calls, and enquiry conversion status."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Active Enquiries" value={activeEnquiries.length} tone="info" icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="New Walk-ins" value={enquiries.filter((e) => e.status === "New").length} tone="warning" icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="Follow-ups" value={enquiries.filter((e) => e.status === "Contacted" || e.status === "Visit Scheduled").length} icon={<Phone className="h-5 w-5" />} />
        <StatCard label="Enrolled / Converted" value={enrolledCount} tone="success" icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataTable
          columns={["Child Name", "Parent Name", "Class Seeking", "Contact Phone", "Stage / Status", "Date"]}
          total={activeEnquiries.length}
        >
          {activeEnquiries.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-bold text-slate-800">{e.childName}</TableCell>
              <TableCell>{e.parentName}</TableCell>
              <TableCell>{e.targetClass || e.interestedClass}</TableCell>
              <TableCell className="font-mono text-xs">{e.phone}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 rounded-full capitalize bg-indigo-50 text-indigo-700 border-indigo-200">
                  {e.stage || e.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-500">{e.createdDate || e.createdAt?.split("T")[0]}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
