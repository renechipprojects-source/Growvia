import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Baby, NotebookPen, DollarSign, MessageSquare, Plane, MoreHorizontal, X, ImageIcon, UserCheck, BookOpen, Bell, Globe, LogOut } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useT, type Lang } from "@/lib/i18n";
import { useAlerts } from "@/lib/alertsContext";
import { useLeave } from "@/lib/leaveContext";
import { useParent } from "@/lib/parentContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationPanel } from "@/components/NotificationPanel";

type IconType = ComponentType<{ className?: string }>;

export function ParentShell() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { t, lang, setLang } = useT();
  const alerts = useAlerts();
  const parent = useParent();
  const leave = useLeave();

  function handleLogout() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("sunshine.parent.activeChildId");
      } catch {}
    }
    import("@/lib/auth").then(({ signOut }) => {
      signOut();
      navigate({ to: "/" });
    });
  }


  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const messagesBadge = 2; // demo
  const pendingLeaves = leave.forStudent(parent.activeChild.id).filter((r) => r.status === "Pending").length;
  const parentCirculars = alerts.liveFor("teachers").length; // parents see teacher-audience + both

  const tabs: { to: string; label: string; icon: IconType; match: (p: string) => boolean }[] = [
    { to: "/parent", label: t("nav.home"), icon: Home, match: (p) => p === "/parent" },
    { to: "/parent/child", label: t("nav.child"), icon: Baby, match: (p) => p.startsWith("/parent/child") || p.startsWith("/parent/attendance") },
    { to: "/parent/diary", label: t("nav.diary"), icon: NotebookPen, match: (p) => p.startsWith("/parent/diary") },
    { to: "/parent/fees", label: t("nav.fees"), icon: DollarSign, match: (p) => p.startsWith("/parent/fees") },
  ];

  const moreItems: { to: string; label: string; icon: IconType }[] = [
    { to: "/parent/homework", label: t("nav.homework"), icon: BookOpen },
    { to: "/parent/attendance", label: t("nav.attendance"), icon: UserCheck },
    { to: "/parent/gallery", label: t("nav.gallery"), icon: ImageIcon },
    { to: "/parent/messages", label: t("nav.messages"), icon: MessageSquare },
    { to: "/parent/leave", label: t("nav.leave"), icon: Plane },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50">
      <div className="w-full max-w-7xl mx-auto min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("app.sunshine")}</div>
              <div className="font-semibold truncate">{t("app.parent")}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <IconBtn to="/parent/messages" ariaLabel={t("nav.messages")} badge={messagesBadge}>
                <MessageSquare className="h-5 w-5" />
              </IconBtn>
              <IconBtn to="/parent/leave" ariaLabel={t("nav.leave")} badge={pendingLeaves}>
                <Plane className="h-5 w-5" />
              </IconBtn>
              <NotificationPanel role="parent" />
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("nav.language")}
                  className="relative h-9 min-w-9 px-2 grid grid-flow-col auto-cols-max items-center gap-1 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-white/60"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">{lang === "en" ? "EN" : "த"}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground font-normal">
                    <Globe className="h-3.5 w-3.5" /> {t("nav.language")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(["en", "ta"] as Lang[]).map((l) => (
                    <DropdownMenuItem key={l} onClick={() => setLang(l)}>
                      <span className={cn("mr-2", lang === l ? "text-pink-600" : "text-transparent")}>●</span>
                      {l === "en" ? "English" : "தமிழ் (Tamil)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 px-3 sm:px-4 py-4 pb-24 w-full max-w-none">
          <Outlet />
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/60 bg-white/85 backdrop-blur-xl">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-5">
            {tabs.map((tab) => {
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <Link key={tab.to} to={tab.to} className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                  active ? "text-pink-600 font-semibold" : "text-slate-500",
                )}>
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", moreOpen ? "text-pink-600 font-semibold" : "text-slate-500")}
            >
              <MoreHorizontal className="h-5 w-5" />
              {t("nav.more")}
            </button>
          </div>
        </nav>

        {/* More sheet */}
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMoreOpen(false)} aria-hidden />
            <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl p-4 w-full max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">{t("nav.more")}</div>
                <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full hover:bg-slate-100" aria-label={t("app.close")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((m) => {
                  const Icon = m.icon;
                  return (
                    <Link key={m.to} to={m.to} className="rounded-2xl bg-pink-50/70 border border-pink-100 p-3 flex flex-col items-center gap-1 text-center">
                      <Icon className="h-5 w-5 text-pink-600" />
                      <div className="text-xs">{m.label}</div>
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl bg-rose-50 border border-rose-200 p-3 flex flex-col items-center gap-1 text-center hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="h-5 w-5 text-rose-600" />
                  <div className="text-xs text-rose-700 font-medium">{t("nav.logout")}</div>
                </button>
              </div>

            </div>

          </>
        )}
      </div>
    </div>
  );
}

function IconBtn({ to, ariaLabel, badge, children }: { to: string; ariaLabel: string; badge?: number; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="relative h-9 w-9 grid place-items-center rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-white/60"
    >
      {children}
      {badge && badge > 0 ? (
        <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-pink-500 text-white">{badge}</Badge>
      ) : null}
    </Link>
  );
}
