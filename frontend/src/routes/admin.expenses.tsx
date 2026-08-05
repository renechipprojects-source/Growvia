import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader, StatusBadge } from "@/components/admin/page-primitives";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchExpenses, type Expense } from "@/lib/supabaseService";
import { Search, Receipt, Wallet, DollarSign, Lock, Building2 } from "lucide-react";

export const Route = createFileRoute("/admin/expenses")({
  head: () => ({
    meta: [
      { title: "School Expenses — Sunshine ERP" },
      { name: "description", content: "Read-only view of school-wide operating expenses." },
    ],
  }),
  component: AdminExpensesOverview,
});

function AdminExpensesOverview() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchExpenses().then(({ data }) => {
      setExpenses(data || []);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      const matchQ =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.paidTo.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      const matchC = categoryFilter === "all" || e.category === categoryFilter;
      return matchQ && matchC;
    });
  }, [expenses, query, categoryFilter]);

  const totalExpense = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const avgExpense = useMemo(() => (expenses.length > 0 ? totalExpense / expenses.length : 0), [expenses, totalExpense]);

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full max-w-none gap-4 p-3 md:p-4 bg-slate-50/50">
      <div className="shrink-0">
        <PageHeader
          title="Operating Expenses"
          subtitle="Read-only system audit of school expenditures and outlays."
          actions={
            <Badge variant="outline" className="px-3 py-1 bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" /> Read-Only View (Office Managed)
            </Badge>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 shrink-0">
        <StatCard label="Total Expenditure" value={`₹${totalExpense.toLocaleString()}`} tone="from-rose-500 to-pink-500" />
        <StatCard label="Total Records" value={expenses.length} tone="from-sky-500 to-blue-500" />
        <StatCard label="Avg Outlay / Item" value={`₹${Math.round(avgExpense).toLocaleString()}`} tone="from-amber-500 to-orange-500" />
        <StatCard label="Categories" value={categories.length} tone="from-emerald-500 to-teal-500" />
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by description, vendor, or category…"
            className="pl-9 bg-slate-50/50 border-slate-200 text-sm rounded-xl focus:bg-white"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs bg-white border-slate-200 rounded-xl font-medium">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table Container */}
      <div className="flex-1 min-h-[400px] max-h-[calc(100vh-270px)] rounded-2xl border border-slate-200/80 bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-full table-auto">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3.5 font-bold w-[15%]">Date</th>
                <th className="text-left px-4 py-3.5 font-bold w-[30%]">Description</th>
                <th className="text-left px-4 py-3.5 font-bold w-[18%]">Category</th>
                <th className="text-left px-4 py-3.5 font-bold w-[20%]">Paid To</th>
                <th className="text-right px-4 py-3.5 font-bold w-[17%]">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-slate-500">{e.date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{e.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {e.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{e.paidTo}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                    ₹{e.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                    No operating expenses match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tone} text-white p-4 shadow-sm flex flex-col justify-between`}>
      <div className="text-[11px] font-medium uppercase tracking-wider opacity-85">{label}</div>
      <div className="text-2xl font-bold mt-1 tracking-tight">{value}</div>
    </div>
  );
}
