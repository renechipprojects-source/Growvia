import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck,
  Megaphone,
  CalendarDays,
  Calendar,
  FileBarChart,
  LogOut,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  School,
  Wallet,
  Bus,
  Boxes,
  X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/principal-auth";
import {
  getPrincipalProfile,
  subscribePrincipalProfile,
} from "@/lib/principal-profile";
import { fetchCirculars } from "@/lib/supabaseService";
import { getUnreadCountForRole } from "@/lib/circularReadStore";

type NavItem = {
  label: string;
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; to: string }[];
};

const nav: NavItem[] = [
  { label: "Dashboard", to: "/principal/dashboard", icon: LayoutDashboard },
  { label: "Students", to: "/principal/students", icon: GraduationCap },
  { label: "Staff", to: "/principal/teachers", icon: Users },
  { label: "Classes", to: "/principal/classes", icon: BookOpen },
  {
    label: "Attendance",
    icon: CalendarCheck,
    children: [
      { label: "Student Attendance", to: "/principal/attendance/students" },
      { label: "Staff Attendance", to: "/principal/attendance/staff" },
    ],
  },
  { label: "Fees Overview", to: "/principal/fees", icon: Wallet },
  { label: "Transport", to: "/principal/transport", icon: Bus },
  { label: "Inventory", to: "/principal/inventory", icon: Boxes },
  { label: "Circulars", to: "/principal/circulars", icon: Megaphone },
];

export function PrincipalSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [attendanceOpen, setAttendanceOpen] = useState(pathname.startsWith("/principal/attendance"));
  const [unreadCirculars, setUnreadCirculars] = useState(0);
  const profile = useSyncExternalStore(
    subscribePrincipalProfile,
    getPrincipalProfile,
    getPrincipalProfile,
  );

  useEffect(() => {
    fetchCirculars().then(({ data }) => {
      if (data) {
        setUnreadCirculars(getUnreadCountForRole(data, "principal"));
      }
    });
  }, [pathname]);

  const handleLogout = () => {
    logout();
    try {
      window.history.replaceState(null, "", "/");
    } catch {
      /* ignore */
    }
    navigate({ to: "/", replace: true });
  };

  // When mobile drawer is open we always show the full sidebar (no collapse on mobile).
  const isCompact = collapsed && !open;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed z-50 inset-y-0 left-0 bg-white/95 backdrop-blur-xl text-slate-800 border-r border-slate-200/90 shadow-sm flex flex-col transition-[transform,width] duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          isCompact ? "w-20" : "w-72",
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200/80">
          <div className={cn("flex items-center gap-2.5 min-w-0", isCompact && "justify-center w-full")}>
            <div className="w-9 h-9 shrink-0 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <School className="w-5 h-5 text-white" />
            </div>
            {!isCompact && (
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 leading-tight truncate">Bright Bloom</div>
                <div className="text-[11px] font-medium text-slate-500 leading-tight">Principal Portal</div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const activeGroup = item.children.some((c) => pathname.startsWith(c.to));
              return (
                <div key={item.label}>
                  <button
                    onClick={() => {
                      if (isCompact) {
                        onToggleCollapsed();
                        setAttendanceOpen(true);
                      } else {
                        setAttendanceOpen((v) => !v);
                      }
                    }}
                    title={isCompact ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isCompact ? "justify-center" : "justify-between",
                      activeGroup
                        ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <span className={cn("flex items-center gap-3", isCompact && "justify-center")}>
                      <Icon className={cn("w-[18px] h-[18px] shrink-0", activeGroup ? "text-indigo-600" : "text-slate-600")} />
                      {!isCompact && item.label}
                    </span>
                    {!isCompact && (
                      <ChevronDown
                        className={cn("w-4 h-4 text-slate-500 transition-transform", attendanceOpen && "rotate-180")}
                      />
                    )}
                  </button>
                  {attendanceOpen && !isCompact && (
                    <div className="mt-1 ml-9 space-y-0.5 border-l border-slate-200 pl-3">
                      {item.children.map((c) => {
                        const active = pathname === c.to;
                        return (
                          <Link
                            key={c.to}
                            to={c.to}
                            onClick={onClose}
                            className={cn(
                              "block px-3 py-2 rounded-lg text-sm transition-all",
                              active
                                ? "bg-indigo-50 text-indigo-700 font-bold"
                                : "text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900",
                            )}
                          >
                            {c.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const active = pathname === item.to || (item.to !== "/principal/dashboard" && item.to && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to!}
                onClick={onClose}
                title={isCompact ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  isCompact && "justify-center",
                  active
                    ? "bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-xs"
                    : "text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-indigo-600" : "text-slate-600")} />
                {!isCompact && <span className="flex-1 truncate">{item.label}</span>}
                {!isCompact && item.label === "Circulars" && unreadCirculars > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                    {unreadCirculars}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200/80 space-y-1">
          <button
            onClick={handleLogout}
            title={isCompact ? "Sign out" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition-all",
              isCompact && "justify-center",
            )}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0 text-slate-600 group-hover:text-rose-600" />
            {!isCompact && <span>Sign out</span>}
          </button>
          <button
            onClick={onToggleCollapsed}
            title={isCompact ? "Expand" : "Collapse"}
            className={cn(
              "hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs uppercase tracking-widest font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all",
              isCompact && "justify-center",
            )}
          >
            {isCompact ? (
              <ChevronsRight className="w-4 h-4 text-slate-600" />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4 text-slate-600" />
                <span>Collapse</span>
              </>
            )}
          </button>
          {!isCompact && (
            <div className="mt-2 text-xs text-slate-600 font-medium truncate px-3">
              Signed in as {profile.name}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
