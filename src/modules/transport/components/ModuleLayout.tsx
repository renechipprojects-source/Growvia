import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/admin/page-primitives";

export type NavItem = { key: string; label: string; icon?: ReactNode; page: ReactNode };

export function ModuleLayout({ title, subtitle, nav }: { title: string; subtitle?: string; nav: NavItem[] }) {
  const [active, setActive] = useState(nav[0].key);
  const current = nav.find((n) => n.key === active) ?? nav[0];

  return (
    <div className="flex h-full min-h-0 flex-col w-full max-w-none space-y-4">
      {/* Top Header & Tab Navigation */}
      <div className="shrink-0 space-y-3">
        <PageHeader title={title} description={subtitle} />

        {/* Clean Horizontal Tab Bar (No nested sidebar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setActive(n.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                active === n.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {n.icon}
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {current.page}
      </div>
    </div>
  );
}