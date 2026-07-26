import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, SectionCard } from "@/components/ui-blocks";
import { REVENUE_MONTHLY } from "@/lib/mockData";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DollarSign, Wallet, Receipt as ReceiptIcon, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/office/reports")({ component: () => (
  <div>
    <PageHeader title="Reports" subtitle="Financial and operational reports." />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Collections MTD" value="₹7.12L" icon={DollarSign} gradient="from-orange-500 to-amber-500" />
      <StatCard label="Expenses MTD" value="₹2.37L" icon={Wallet} gradient="from-rose-500 to-orange-500" />
      <StatCard label="Receipts issued" value={128} icon={ReceiptIcon} gradient="from-amber-500 to-yellow-500" />
      <StatCard label="Net" value="₹4.75L" icon={TrendingUp} gradient="from-emerald-500 to-teal-500" />
    </div>
    <div className="mt-6">
      <SectionCard title="Collections trend">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={REVENUE_MONTHLY}>
            <defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.6} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" /><YAxis tickFormatter={(v) => `₹${v / 1000}k`} />
            <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
            <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#og)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  </div>
) });
