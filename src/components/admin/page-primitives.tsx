import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="shrink-0 w-full max-w-none grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 pb-4">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "default",
  sub,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "rose" | "indigo";
  sub?: string;
}) {
  const gradientMap: Record<string, string> = {
    default: "from-blue-500 to-sky-500 text-blue-600 bg-blue-50/80 border-blue-100",
    success: "from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50/80 border-emerald-100",
    warning: "from-amber-500 to-orange-500 text-amber-600 bg-amber-50/80 border-amber-100",
    danger: "from-rose-500 to-pink-500 text-rose-600 bg-rose-50/80 border-rose-100",
    info: "from-sky-500 to-cyan-500 text-sky-600 bg-sky-50/80 border-sky-100",
    purple: "from-purple-500 to-indigo-500 text-purple-600 bg-purple-50/80 border-purple-100",
    rose: "from-rose-500 to-pink-500 text-rose-600 bg-rose-50/80 border-rose-100",
    indigo: "from-indigo-500 to-violet-500 text-indigo-600 bg-indigo-50/80 border-indigo-100",
  };
  const iconGradients: Record<string, string> = {
    default: "from-blue-500 to-sky-500",
    success: "from-emerald-500 to-teal-500",
    warning: "from-amber-500 to-orange-500",
    danger: "from-rose-500 to-pink-500",
    info: "from-sky-500 to-cyan-500",
    purple: "from-purple-500 to-indigo-500",
    rose: "from-rose-500 to-pink-500",
    indigo: "from-indigo-500 to-violet-500",
  };

  const deltaPositive = delta?.startsWith("+");

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-lg shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30">
      <div className={`absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-10 bg-gradient-to-br ${iconGradients[tone] || iconGradients.default} blur-2xl pointer-events-none group-hover:opacity-25 transition-opacity duration-300`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-snug">{label}</div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
          {sub && <div className="mt-1 text-xs text-slate-500 font-medium truncate">{sub}</div>}
          {delta && (
            <div
              className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                deltaPositive ? "bg-emerald-100/80 text-emerald-700" : "bg-rose-100/80 text-rose-700"
              }`}
            >
              {delta} vs last month
            </div>
          )}
        </div>
        {icon && (
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${iconGradients[tone] || iconGradients.default} text-white shadow-md shadow-slate-900/10 group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-12 text-center">
      {icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div>
        <div className="text-base font-semibold">{title}</div>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-600 border-slate-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Partial: "bg-amber-50 text-amber-700 border-amber-200",
    Due: "bg-rose-50 text-rose-700 border-rose-200",
    Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Absent: "bg-rose-50 text-rose-700 border-rose-200",
    Late: "bg-amber-50 text-amber-700 border-amber-200",
    Leave: "bg-sky-50 text-sky-700 border-sky-200",
    Success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Failed: "bg-rose-50 text-rose-700 border-rose-200",
    Upcoming: "bg-sky-50 text-sky-700 border-sky-200",
    Completed: "bg-slate-100 text-slate-600 border-slate-200",
    Maintenance: "bg-amber-50 text-amber-700 border-amber-200",
    "On Leave": "bg-amber-50 text-amber-700 border-amber-200",
    "On Time": "bg-emerald-50 text-emerald-700 border-emerald-200",
    Graduated: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
