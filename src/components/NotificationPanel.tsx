import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  listForRole,
  markAllRead,
  markRead,
  subscribe,
  syncLiveDatabaseNotifications,
  unreadCountForRole,
  type AppNotification,
} from "@/lib/notifications";
import type { Role } from "@/lib/roleConfig";

function useNotifications(role: Role) {
  const items = useSyncExternalStore(
    (l) => subscribe(l),
    () => listForRole(role),
    () => listForRole(role),
  );
  const unread = useSyncExternalStore(
    (l) => subscribe(l),
    () => unreadCountForRole(role),
    () => unreadCountForRole(role),
  );
  return { items, unread };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const priorityDot: Record<AppNotification["priority"], string> = {
  low: "bg-slate-300",
  medium: "bg-amber-400",
  high: "bg-rose-500",
};

export function NotificationPanel({ role }: { role: Role }) {
  const { items, unread } = useNotifications(role);
  const [open, setOpen] = useState(false);
  // Sync live notifications from database on mount & interval tick
  useEffect(() => {
    syncLiveDatabaseNotifications();
    const t = setInterval(() => syncLiveDatabaseNotifications(), 20_000);
    return () => clearInterval(t);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="rounded-full relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white/80">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Notifications</div>
            {unread > 0 && (
              <span className="text-[10px] font-semibold rounded-full bg-rose-100 text-rose-700 px-2 py-0.5">
                {unread} new
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={() => markAllRead(role)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[26rem] overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Inbox className="h-6 w-6 mx-auto mb-2 opacity-60" />
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const body = (
                  <div
                    className={cn(
                      "px-4 py-3 flex gap-3 items-start hover:bg-slate-50 transition-colors",
                      !n.read && "bg-rose-50/40",
                    )}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", priorityDot[n.priority])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn("text-sm truncate", !n.read ? "font-semibold" : "font-medium text-slate-700")}>
                          {n.title}
                        </div>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.description}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                        {n.module} · {timeAgo(n.timestamp)}
                      </div>
                    </div>
                    {!n.read && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markRead(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700"
                        aria-label="Mark read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
                return (
                  <li key={n.id} className="group">
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="w-full text-left"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
