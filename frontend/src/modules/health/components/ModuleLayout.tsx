import { useState, type ReactNode } from "react";

export type NavItem = { key: string; label: string; icon?: ReactNode; page: ReactNode };

export function ModuleLayout({ title, subtitle, nav }: { title: string; subtitle?: string; nav: NavItem[] }) {
  const [active, setActive] = useState(nav[0].key);
  const current = nav.find((n) => n.key === active) ?? nav[0];
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:block">
        <div className="border-b p-5">
          <div className="text-lg font-semibold tracking-tight">{title}</div>
          {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setActive(n.key)}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active === n.key
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-6 py-3 md:hidden">
          <div className="font-semibold">{title}</div>
          <select
            value={active}
            onChange={(e) => setActive(e.target.value)}
            className="ml-auto rounded-md border bg-background px-2 py-1 text-sm"
          >
            {nav.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
          </select>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">{current.page}</main>
      </div>
    </div>
  );
}
