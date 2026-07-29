import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Search, FileText, Filter, Clock, UserCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { readAuditLogs, type AuditLogEntry } from "@/lib/auditLogStore";

export const Route = createFileRoute("/admin/audit-logs")({ component: AuditLogsPage });

function AuditLogsPage() {
  const [logs] = useState<AuditLogEntry[]>(() => readAuditLogs());
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.module.toLowerCase().includes(search.toLowerCase());
      const matchModule = moduleFilter === "all" || log.module.toLowerCase() === moduleFilter.toLowerCase();
      return matchSearch && matchModule;
    });
  }, [logs, search, moduleFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centralized System Audit Logs"
        subtitle="Read-only compliance and operational audit trail tracking all key user actions across modules."
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by user, action or module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white rounded-xl border-slate-200"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="bg-white rounded-xl border-slate-200">
              <SelectValue placeholder="All Modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="System">System / Login</SelectItem>
              <SelectItem value="Fees">Fees & Payments</SelectItem>
              <SelectItem value="Circulars">Circulars</SelectItem>
              <SelectItem value="Attendance">Attendance</SelectItem>
              <SelectItem value="Staff">Staff Management</SelectItem>
              <SelectItem value="Students">Student Management</SelectItem>
              <SelectItem value="Inventory">Inventory</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SectionCard title={`Audit Log Activity Trail (${filtered.length} Entries)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 font-medium uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3 text-left">Date & Time</th>
                <th className="px-3 text-left">User & Role</th>
                <th className="px-3 text-left">Module</th>
                <th className="px-3 text-left">Action</th>
                <th className="px-3 text-left">Previous State</th>
                <th className="px-3 text-left">New State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-3">
                    <span className="font-bold text-slate-900">{log.user}</span>
                    <Badge variant="outline" className="ml-2 capitalize text-[10px]">
                      {log.role}
                    </Badge>
                  </td>
                  <td className="px-3 font-semibold text-slate-700">{log.module}</td>
                  <td className="px-3">
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 text-slate-500 max-w-[150px] truncate">{log.previousValue || "—"}</td>
                  <td className="px-3 font-medium text-emerald-700 max-w-[180px] truncate">{log.newValue || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
