import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, UserRound, GraduationCap, CalendarCheck,
  Wallet, PartyPopper, Boxes, BarChart3, ChevronRight, Sparkles,
  UserCog, LogOut, KeyRound, Bus, HeartPulse, Megaphone,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { adminSignOut } from "@/lib/admin-auth";
import { listForQueue, subscribeResets } from "@/lib/passwordResets";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; icon: React.ComponentType<{ className?: string }>; items: Item[] };
type OperationEntry = Item | Group;

const operations: OperationEntry[] = [
  { title: "Circulars", url: "/admin/circulars", icon: Megaphone },
  {
    title: "Attendance",
    icon: CalendarCheck,
    items: [
      { title: "Student Attendance", url: "/admin/attendance/students", icon: UserRound },
      { title: "Staff Attendance", url: "/admin/attendance/staff", icon: UserCog },
    ],
  },
  { title: "Inventory", url: "/admin/inventory", icon: Boxes },
  { title: "Transport", url: "/admin/transport", icon: Bus },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: Sparkles },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: UserCog },
];

const groups: Group[] = [
  {
    title: "Admissions", icon: Users,
    items: [
      { title: "Students", url: "/admin/students", icon: UserRound },
      { title: "Parents", url: "/admin/parents", icon: Users },
    ],
  },
  {
    title: "Academics", icon: GraduationCap,
    items: [
      { title: "Classes", url: "/admin/classes", icon: GraduationCap },
    ],
  },
  {
    title: "Fee Management", icon: Wallet,
    items: [
      { title: "Payments", url: "/admin/fees/payments", icon: Wallet },
    ],
  },
];

function isGroup(entry: OperationEntry): entry is Group {
  return "items" in entry;
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const [pendingResets, setPendingResets] = useState(
    () => listForQueue("admin").filter((r) => r.status === "Pending").length,
  );

  useEffect(() => {
    const update = () =>
      setPendingResets(listForQueue("admin").filter((r) => r.status === "Pending").length);
    update();
    return subscribeResets(update);
  }, []);

  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname.startsWith(url);

  return (
    <Sidebar className="border-r border-slate-200/90 bg-white/95 backdrop-blur-xl text-slate-800 shadow-sm">
      <SidebarHeader className="border-b border-slate-200/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900">
              Sunshine ERP
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Admin Portal
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-bold text-xs text-slate-500 uppercase tracking-wider">Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin")}>
                  <Link to="/admin">
                    <LayoutDashboard className="text-slate-600" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-bold text-xs text-slate-500 uppercase tracking-wider">Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groups.map((g) => (
                <NavGroup key={g.title} group={g} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-bold text-xs text-slate-500 uppercase tracking-wider">Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operations.map((entry) =>
                isGroup(entry) ? (
                  <NavGroup key={entry.title} group={entry} pathname={pathname} />
                ) : (
                  <SidebarMenuItem key={entry.url}>
                    <SidebarMenuButton asChild isActive={isActive(entry.url)}>
                      <Link to={entry.url} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <entry.icon className="text-slate-600" />
                          <span className="font-medium">{entry.title}</span>
                        </div>
                        {entry.url === "/admin/password-resets" && pendingResets > 0 && (
                          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" title={`${pendingResets} pending resets`} />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200/80">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={adminSignOut}
              tooltip="Sign out"
              className="text-slate-700 font-medium hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="text-slate-600 group-hover:text-rose-600" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({ group, pathname }: { group: Group; pathname: string }) {
  const hasActive = group.items.some((i) => pathname === i.url || pathname.startsWith(i.url + "/"));
  const [open, setOpen] = useState(hasActive);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="justify-between">
            <span className="flex items-center gap-2">
              <group.icon />
              <span>{group.title}</span>
            </span>
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.items.map((item) => (
              <SidebarMenuSubItem key={item.url}>
                <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                  <Link to={item.url}><item.icon /><span>{item.title}</span></Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
