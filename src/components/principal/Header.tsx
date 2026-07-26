import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Menu, Check, Trash2, Inbox, Shield } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AccountSecurityDialog } from "@/components/principal/AccountSecurityDialog";
import {
  getPrincipalProfile,
  subscribePrincipalProfile,
  getPrincipalNotifPrefs,
} from "@/lib/principal-profile";
import {
  listForRole,
  markRead,
  markAllRead,
  subscribe as subscribeNotifications,
  unreadCountForRole,
  type AppNotification,
} from "@/lib/notifications";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const MODULE_PREF_KEY: Partial<Record<AppNotification["module"], keyof ReturnType<typeof getPrincipalNotifPrefs>>> = {
  announcement: "circulars",
  attendance: "attendance",
  leave: "leaves",
  system: "circulars",
};

// Local per-user dismissed set so removals only affect the current user.
const DISMISS_KEY = "sunshine.principal.notif-dismissed";
function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeDismissed(s: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify([...s]));
}

export function PrincipalHeader({ onMenu, title }: { onMenu: () => void; title: string }) {
  const profile = useSyncExternalStore(
    subscribePrincipalProfile,
    getPrincipalProfile,
    getPrincipalProfile,
  );
  const items = useSyncExternalStore(
    (l) => subscribeNotifications(l),
    () => listForRole("principal"),
    () => listForRole("principal"),
  );
  const unread = useSyncExternalStore(
    (l) => subscribeNotifications(l),
    () => unreadCountForRole("principal"),
    () => unreadCountForRole("principal"),
  );

  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());
  useEffect(() => {
    writeDismissed(dismissed);
  }, [dismissed]);
  const [securityOpen, setSecurityOpen] = useState(false);

  const prefs = getPrincipalNotifPrefs();
  const filtered = items.filter((n) => {
    if (dismissed.has(n.id)) return false;
    const key = MODULE_PREF_KEY[n.module];
    if (key && prefs[key] === false) return false;
    return true;
  });
  const visibleUnread = Math.max(0, unread - items.filter((n) => dismissed.has(n.id) && !n.read).length);

  const initials = (profile.name || "P")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border h-16 flex items-center gap-3 px-4 md:px-6">
      <button
        onClick={onMenu}
        className="lg:hidden p-2 rounded-md hover:bg-muted"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="min-w-0">
        <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block truncate">
          Welcome back, {profile.name}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-md hover:bg-muted" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              {visibleUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold grid place-items-center">
                  {visibleUnread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="text-sm font-semibold">
                Notifications{" "}
                <Badge variant="secondary" className="ml-1">
                  {visibleUnread} unread
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => markAllRead("principal")}
                disabled={visibleUnread === 0}
                className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-muted-foreground">
                  <Inbox className="h-6 w-6" />
                  <div className="text-sm">You're all caught up.</div>
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((n) => (
                    <li
                      key={n.id}
                      className={cn("group flex items-start gap-2 px-3 py-2.5", !n.read && "bg-primary/5")}
                    >
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="flex-1 min-w-0 text-left"
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
                        <div className="ml-3.5 text-xs text-muted-foreground truncate">
                          {n.description}
                        </div>
                        <div className="ml-3.5 text-[11px] text-muted-foreground/80">
                          {timeAgo(n.timestamp)}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            className="rounded p-1 hover:bg-accent"
                            aria-label="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {n.read && (
                          <button
                            type="button"
                            onClick={() =>
                              setDismissed((d) => {
                                const next = new Set(d);
                                next.add(n.id);
                                return next;
                              })
                            }
                            className="rounded p-1 hover:bg-destructive/10 text-destructive"
                            aria-label="Remove notification"
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
          </PopoverContent>
        </Popover>
        <button
          onClick={() => setSecurityOpen(true)}
          className="p-2 rounded-md hover:bg-muted"
          aria-label="Account security"
          title="Account Security"
        >
          <Shield className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setSecurityOpen(true)}
          className="flex items-center gap-2.5 rounded-full pr-2 hover:bg-muted"
          aria-label="Edit profile"
          title="Edit profile"
        >
          {profile.photo ? (
            <img
              src={profile.photo}
              alt={profile.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="w-9 h-9 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
          )}
          <div className="hidden sm:block leading-tight min-w-0 text-left">
            <div className="text-sm font-medium truncate">{profile.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{profile.designation}</div>
          </div>
        </button>
      </div>
      <AccountSecurityDialog open={securityOpen} onOpenChange={setSecurityOpen} />
    </header>
  );
}
