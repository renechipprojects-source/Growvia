import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Check, Trash2, Inbox, Clock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  getAdminNotifications, markAdminRead, markAllAdminRead,
  removeAdminNotification, subscribeAdminNotifications,
} from "@/lib/admin-notifications";
import { NotificationPanel } from "@/components/NotificationPanel";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  "": "Dashboard", students: "Students", parents: "Parents", classes: "Classes",
  activities: "Daily Activities", homework: "Homework", attendance: "Attendance",
  fees: "Fee Management", structure: "Fee Structure", payments: "Payments",
  receipts: "Receipts", due: "Due List", health: "Health", medical: "Medical Records",
  meals: "Meal Tracker", nap: "Nap Tracker", pickup: "Pickup", transport: "Transport",
  vehicles: "Vehicles", routes: "Routes", events: "Events", communication: "Communication",
  inventory: "Inventory", reports: "Reports", users: "User Management", settings: "Settings",
};

export function TopNav() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  const items = useSyncExternalStore(
    subscribeAdminNotifications,
    getAdminNotifications,
    getAdminNotifications,
  );
  const unread = items.filter((n) => !n.read).length;

  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
        </div>
        <div className="flex-1" />
        
        {/* Live Real-Time Date & Time Clock */}
        {time && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border bg-card/60 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs">
            <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>
              {time.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="font-mono text-primary">
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationPanel role="super-admin" />
        </div>
      </div>
      {!pathname.includes("admission") && (
        <div className="hidden border-t px-6 py-2 sm:block">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              {parts.map((p, i) => {
                const isLast = i === parts.length - 1;
                return (
                  <span key={p + i} className="flex items-center gap-1.5">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="capitalize">{labels[p] ?? p}</BreadcrumbPage>
                      ) : (
                        <span className="capitalize text-muted-foreground">{labels[p] ?? p}</span>
                      )}
                    </BreadcrumbItem>
                  </span>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
    </header>
  );
}
