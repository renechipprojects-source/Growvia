import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search, LogOut, Sparkles, Menu, ChevronDown, X } from "lucide-react";
import { ROLES, type NavItem, type Role } from "@/lib/roleConfig";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { NotificationPanel } from "@/components/NotificationPanel";
import { SupabaseStatus } from "@/components/SupabaseStatus";
import { SearchProvider, useSearch } from "@/lib/searchContext";
import { fetchCirculars } from "@/lib/supabaseService";
import { getUnreadCountForRole } from "@/lib/circularReadStore";
import { useDeveloperSettings } from "@/lib/developerSettingsStore";

export function RoleShell({ role }: { role: Role }) {
  return (
    <SearchProvider>
      <RoleShellInner role={role} />
    </SearchProvider>
  );
}

function RoleShellInner({ role }: { role: Role }) {
  const { settings } = useDeveloperSettings();
  const theme = ROLES[role];
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { query, setQuery } = useSearch();

  // Hide the search bar on each role's dashboard/home page. Module-level
  // search bars inside individual routes remain untouched.
  const isDashboard = pathname === `/${role}` || pathname === `/${role}/`;

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const isItemActive = (item: NavItem): boolean => {
    const base = item.to === `/${role}` ? pathname === item.to : pathname.startsWith(item.to);
    if (base) return true;
    return item.children?.some((c) => pathname === c.to || pathname.startsWith(c.to)) ?? false;
  };

  const initialGroupsOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    theme.nav.forEach((it) => {
      if (it.children) map[it.to] = it.children.some((c) => pathname === c.to || pathname.startsWith(c.to));
    });
    return map;
  }, [theme.nav, pathname]);
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>(initialGroupsOpen);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchCirculars().then(({ data }) => {
      if (data && Array.isArray(data)) {
        setUnreadCount(getUnreadCountForRole(data, role));
      }
    });
  }, [role, pathname]);

  const sidebarContent = (compact: boolean) => (
    <div className="h-full rounded-3xl bg-white/70 backdrop-blur-xl shadow-xl shadow-black/5 border border-white/60 p-4 flex flex-col">
      <div className="flex items-center gap-3 px-2 py-3 shrink-0">
        <div className={cn("h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br grid place-items-center text-white shadow-lg overflow-hidden", theme.gradient)}>
          {settings.branding.sidebarLogoUrl ? (
            <img src={settings.branding.sidebarLogoUrl} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <theme.icon className="h-5 w-5" />
          )}
        </div>
        {!compact && (
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground truncate">
              {settings.branding.sidebarSchoolName || settings.branding.sidebarTitle || settings.school.schoolName}
            </div>
            <div className="font-semibold truncate">{theme.name}</div>
          </div>
        )}
      </div>
      <nav className="mt-4 space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
        {theme.nav.map((item) => {
          const active = isItemActive(item);
          const isCirculars = item.label === "Circulars" || item.to.includes("circulars");
          if (item.children && !compact) {
            const isOpen = groupsOpen[item.to] ?? active;
            return (
              <div key={item.to}>
                <button
                  type="button"
                  onClick={() => setGroupsOpen((s) => ({ ...s, [item.to]: !isOpen }))}
                  className={cn(
                    "w-full group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                    active
                      ? cn("bg-gradient-to-r text-white shadow-md", theme.gradient)
                      : "text-slate-600 hover:bg-white hover:shadow-sm",
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-500")} />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1">
                    {item.children.map((child) => {
                      const cActive = pathname === child.to;
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all",
                            cActive
                              ? cn("bg-gradient-to-r text-white shadow", theme.gradient)
                              : "text-slate-600 hover:bg-white",
                          )}
                        >
                          <child.icon className={cn("h-3.5 w-3.5 shrink-0", cActive ? "text-white" : "text-slate-400")} />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? cn("bg-gradient-to-r text-white shadow-md", theme.gradient)
                  : "text-slate-600 hover:bg-white hover:shadow-sm",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-500")} />
              {!compact && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {isCirculars && unreadCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px] shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="pt-4 shrink-0">
        <button
          type="button"
          onClick={() => {
            import("@/lib/auth").then(({ signOut }) => {
              signOut();
              window.location.replace("/");
            });
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-white transition"
        >
          <LogOut className="h-4 w-4" />
          {!compact && <span>Sign out</span>}
        </button>
        <button
          onClick={() => setDesktopOpen((v) => !v)}
          className="mt-2 w-full text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hidden lg:block"
        >
          {desktopOpen ? "Collapse" : "Expand"}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn("h-screen w-full overflow-hidden bg-gradient-to-br", theme.softBg)}>
      <div className="flex h-screen w-full">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-col h-screen sticky top-0 shrink-0 transition-[width] duration-300 ease-in-out p-4 pr-0",
            desktopOpen ? "w-64" : "w-24",
          )}
        >
          {sidebarContent(!desktopOpen)}
        </aside>

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
        <aside
          className={cn(
            "lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] p-3 transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-hidden={!mobileOpen}
        >
          <div className="relative h-full">
            <button
              className="absolute top-6 right-6 z-10 rounded-full p-1.5 bg-white/80 shadow hover:bg-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent(false)}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col h-screen px-3 sm:px-4 pt-4 lg:pr-6 pb-4">
          <header className="shrink-0 mb-4 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 px-3 sm:px-6 py-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
            <button
              className="lg:hidden rounded-full p-2 hover:bg-white/60 shrink-0"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 lg:col-start-1">
              <div className="text-xs text-muted-foreground truncate">{theme.title}</div>
              <div className="font-semibold truncate">{theme.subtitle}</div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 justify-end">
              {!isDashboard && role !== "teacher" && (
              <div className="relative hidden md:block">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="pl-9 w-48 xl:w-64 bg-white/70 border-white/60"
                />
              </div>
              )}
              {role !== "teacher" && <SupabaseStatus />}
              <NotificationPanel role={role} />
              <Badge className={cn("hidden sm:inline-flex", theme.chip)}>
                <Sparkles className="h-3 w-3 mr-1" /> {theme.name}
              </Badge>
              {role !== "office" && (
                <Avatar className="h-9 w-9 ring-2 ring-white shadow shrink-0">
                  <AvatarImage src={`https://api.dicebear.com/9.x/notionists/svg?seed=${role}`} />
                  <AvatarFallback>{theme.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </header>

          {/* Mobile search row */}
          {!isDashboard && role !== "teacher" && (
          <div className="md:hidden mb-3 relative shrink-0">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="pl-9 bg-white/70 border-white/60"
            />
          </div>
          )}

          {/*
            Bounded scroll container. Pages that opt into internal scrolling
            with `h-full min-h-0` fill this height exactly and manage their
            own list/table scroll — the outer overflow-y-auto only kicks in
            for legacy pages whose content exceeds the available height.
          */}
          <div className="flex-1 min-w-0 overflow-y-auto w-full max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
