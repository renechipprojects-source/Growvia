import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  label, value, icon: Icon, trend, gradient, sub,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  gradient: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden rounded-3xl border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 p-4 sm:p-5">
      <div className={cn("absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-20 bg-gradient-to-br blur-2xl pointer-events-none", gradient)} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-snug">{label}</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">{value}</div>
          {sub && <div className="mt-1 text-xs text-muted-foreground truncate">{sub}</div>}
        </div>
        <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md shadow-black/5", gradient)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <ArrowUpRight className="h-3.5 w-3.5" /> {trend}
        </div>
      )}
    </Card>
  );
}

export function SectionCard({
  title, action, children, className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("w-full max-w-none rounded-3xl border-white/60 bg-white/70 backdrop-blur-xl shadow-lg shadow-black/5 p-5", className)}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
