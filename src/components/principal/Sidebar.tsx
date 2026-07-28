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
  X,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/principal-auth";
import {
  getPrincipalProfile,
  subscribePrincipalProfile,
} from "@/lib/principal-profile";

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
  const profile = useSyncExternalStore(
    subscribePrincipalProfile,
    getPrincipalProfile,
    getPrincipalProfile,
  );

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
          "fixed z-50 inset-y-0 left-0 bg-sidebar text-sidebar-foreground flex flex-col transition-[transform,width] duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          isCompact ? "w-20" : "w-72",
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          <div className={cn("flex items-center gap-2.5 min-w-0", isCompact && "justify-center w-full")}>
            <div className="w-9 h-9 shrink-0 rounded-lg gradient-primary flex items-center justify-center shadow-lg">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            {!isCompact && (
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">Bright Bloom</div>
                <div className="text-[11px] text-sidebar-foreground/60 leading-tight">Principal Portal</div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-sidebar-accent"
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
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isCompact ? "justify-center" : "justify-between",
                      activeGroup
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60",
                    )}
                  >
                    <span className={cn("flex items-center gap-3", isCompact && "justify-center")}>
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {!isCompact && item.label}
                    </span>
                    {!isCompact && (
                      <ChevronDown
                        className={cn("w-4 h-4 transition-transform", attendanceOpen && "rotate-180")}
                      />
                    )}
                  </button>
                  {attendanceOpen && !isCompact && (
                    <div className="mt-1 ml-9 space-y-0.5 border-l border-sidebar-border pl-3">
                      {item.children.map((c) => {
                        const active = pathname === c.to;
                        return (
                          <Link
                            key={c.to}
                            to={c.to}
                            onClick={onClose}
                            className={cn(
                              "block px-3 py-2 rounded-md text-sm transition-colors",
                              active
                                ? "bg-sidebar-primary/20 text-sidebar-primary-foreground font-medium"
                                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isCompact && "justify-center",
                  active
                    ? "bg-sidebar-primary/20 text-white shadow-inner"
                    : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!isCompact && item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={handleLogout}
            title={isCompact ? "Sign out" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/85 hover:bg-destructive/20 hover:text-white transition-colors",
              isCompact && "justify-center",
            )}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!isCompact && <span>Sign out</span>}
          </button>
          <button
            onClick={onToggleCollapsed}
            title={isCompact ? "Expand" : "Collapse"}
            className={cn(
              "hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs uppercase tracking-widest text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors",
              isCompact && "justify-center",
            )}
          >
            {isCompact ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronsLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
          {!isCompact && (
            <div className="mt-2 text-[10px] text-sidebar-foreground/40 truncate px-3">
              Signed in as {profile.name}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
