import type { ReactNode } from "react";

export function StatCard({
  label, value, delta, icon, tone = "default",
}: {
  label: string; value: string | number; delta?: string; icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneMap: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700",
    info: "bg-sky-100 text-sky-700",
  };
  const deltaPositive = delta?.startsWith("+");
  return (
    <div className="group rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="min-w-0">
        <div className="text-xs sm:text-sm font-medium text-muted-foreground leading-snug whitespace-normal break-normal">{label}</div>
        <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        {delta && (
          <div
            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              deltaPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {delta} vs last month
          </div>
        )}
      </div>
    </div>
  );
}