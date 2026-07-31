export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Underweight: "bg-amber-50 text-amber-700 border-amber-200",
    Overweight: "bg-amber-50 text-amber-700 border-amber-200",
    Obese: "bg-rose-50 text-rose-700 border-rose-200",
    Critical: "bg-rose-50 text-rose-700 border-rose-200",
    Monitoring: "bg-sky-50 text-sky-700 border-sky-200",
    Resolved: "bg-slate-100 text-slate-600 border-slate-200",
    Allergy: "bg-rose-50 text-rose-700 border-rose-200",
    "Chronic Disease": "bg-amber-50 text-amber-700 border-amber-200",
    "Emergency Note": "bg-rose-50 text-rose-700 border-rose-200",
    "Special Care": "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
