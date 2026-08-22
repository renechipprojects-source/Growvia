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
  SidebarMenuSubButton, SidebarMenuSubItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminSignOut } from "@/lib/admin-auth";
import { listForQueue, subscribeResets } from "@/lib/passwordResets";
import { useDeveloperSettings } from "@/lib/developerSettingsStore";
import { cn } from "@/lib/utils";

function getPendingPasswordResetsCount() {
  return listForQueue("admin").filter((r) => r.status === "Pending").length;
}

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; icon: React.ComponentType<{ className?: string }>; items: Item[] };
type OperationEntry = Item | Group;

const operations: OperationEntry[] = [
  { title: "Circulars", url: "/admin/circulars", icon: Megaphone },
  { title: "Messages", url: "/admin/messages", icon: Megaphone },
  { title: "Inventory", url: "/admin/inventory", icon: Boxes },
  { title: "Transport", url: "/admin/transport", icon: Bus },
];

const groups: Group[] = [
  {
    title: "Admissions", icon: Users,
    items: [
      { title: "Students", url: "/admin/students", icon: UserRound },
      { title: "Parents", url: "/admin/parents", icon: Users },
      { title: "Staff / Teachers", url: "/admin/teachers", icon: GraduationCap },
    ],
  },
  {
    title: "Academics", icon: GraduationCap,
    items: [
      { title: "Classes", url: "/admin/classes", icon: GraduationCap },
    ],
  },
  {
    title: "Attendance", icon: CalendarCheck,
    items: [
      { title: "Student Attendance", url: "/admin/attendance/students", icon: UserRound },
      { title: "Staff Attendance", url: "/admin/attendance/staff", icon: UserCog },
    ],
  },
  {
    title: "Fee Management", icon: Wallet,
    items: [
      { title: "Payments", url: "/admin/fees/payments", icon: Wallet },
      { title: "Operating Expenses", url: "/admin/expenses", icon: Wallet },
    ],
  },
];

function isGroup(entry: OperationEntry): entry is Group {
  return "items" in entry;
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { settings } = useDeveloperSettings();
  const [pendingResets, setPendingResets] = useState(
    () => getPendingPasswordResetsCount(),
  );

  useEffect(() => {
    const update = () =>
      setPendingResets(getPendingPasswordResetsCount());
    update();
    return subscribeResets(update);
  }, []);

  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200/90 bg-white/95 backdrop-blur-xl text-slate-800 shadow-sm">
      <SidebarHeader className="border-b border-slate-200/80 px-3 py-3">
        <div className="flex items-center gap-3">
          {(() => {
            const logo = settings.branding.sidebarLogoUrl || settings.theme.sidebarLogoUrl || settings.branding.schoolLogoUrl || "";
            const hasCustomLogo = Boolean(logo) && !logo.includes("data:image/svg");
            return hasCustomLogo ? (
              <div className="flex shrink-0 items-center justify-center">
                <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm">
                {(settings.school.schoolName || "S")[0]}
              </div>
            );
          })()}
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 truncate">
              {settings.branding.sidebarSchoolName || settings.branding.sidebarTitle || settings.school.schoolName}
            </div>
            <div className="text-[11px] font-medium text-slate-500 truncate">
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
                <SidebarMenuButton asChild isActive={isActive("/admin")} tooltip="Dashboard">
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
                    <SidebarMenuButton asChild isActive={isActive(entry.url)} tooltip={entry.title}>
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
              onClick={async () => { await adminSignOut(); }}
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
  const { state } = useSidebar();
  const hasActive = group.items.some((i) => pathname === i.url || pathname.startsWith(i.url + "/"));
  const [open, setOpen] = useState(hasActive);

  if (state === "collapsed") {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton isActive={hasActive} tooltip={group.title} aria-label={group.title}>
              <group.icon className="text-slate-600" />
              <span className="sr-only">{group.title}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48 rounded-2xl p-1.5 shadow-xl bg-white border border-slate-200 z-50">
            <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              {group.title}
            </DropdownMenuLabel>
            {group.items.map((item) => (
              <DropdownMenuItem key={item.url} asChild>
                <Link
                  to={item.url}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer w-full",
                    pathname === item.url ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-slate-600" />
                  <span>{item.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

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

