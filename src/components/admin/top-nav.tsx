import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Check, Trash2, Inbox } from "lucide-react";
import { useSyncExternalStore } from "react";
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
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  const items = useSyncExternalStore(
    subscribeAdminNotifications,
    getAdminNotifications,
    getAdminNotifications,
  );
  const unread = items.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-0">
              <div className="flex items-center justify-between px-3 py-2">
                <DropdownMenuLabel className="p-0">
                  Notifications{" "}
                  <Badge variant="secondary" className="ml-1">
                    {unread} unread
                  </Badge>
                </DropdownMenuLabel>
                <button
                  type="button"
                  onClick={markAllAdminRead}
                  disabled={unread === 0}
                  className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Mark all read
                </button>
              </div>
              <DropdownMenuSeparator className="my-0" />
              <div className="max-h-96 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-muted-foreground">
                    <Inbox className="h-6 w-6" />
                    <div className="text-sm">You're all caught up.</div>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {items.map((n) => (
                      <li
                        key={n.id}
                        className={cn(
                          "group flex items-start gap-2 px-3 py-2.5",
                          !n.read && "bg-primary/5",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => markAdminRead(n.id)}
                          className="flex-1 min-w-0 text-left"
                          aria-label={n.read ? "Notification" : "Mark as read"}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full shrink-0",
                                n.read ? "bg-transparent" : "bg-primary",
                              )}
                              aria-hidden
                            />
                            <div className={cn("text-sm truncate", !n.read && "font-medium")}>
                              {n.title}
                            </div>
                          </div>
                          <div className="ml-3.5 text-xs text-muted-foreground">{n.time}</div>
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => markAdminRead(n.id)}
                              className="rounded p-1 hover:bg-accent"
                              aria-label="Mark as read"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {n.read && (
                            <button
                              type="button"
                              onClick={() => removeAdminNotification(n.id)}
                              className="rounded p-1 hover:bg-destructive/10 text-destructive"
                              aria-label="Remove notification"
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
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
    </header>
  );
}
