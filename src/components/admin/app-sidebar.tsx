import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Users, UserRound, GraduationCap, CalendarCheck,
  Wallet, PartyPopper, Boxes, BarChart3, ChevronRight, Sparkles,
  UserCog, LogOut, KeyRound,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { adminSignOut } from "@/lib/admin-auth";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; icon: React.ComponentType<{ className?: string }>; items: Item[] };
type OperationEntry = Item | Group;

const operations: OperationEntry[] = [
  {
    title: "Attendance",
    icon: CalendarCheck,
    items: [
      { title: "Student Attendance", url: "/admin/attendance/students", icon: UserRound },
      { title: "Staff Attendance", url: "/admin/attendance/staff", icon: UserCog },
    ],
  },
  { title: "Events", url: "/admin/events", icon: PartyPopper },
  { title: "Inventory", url: "/admin/inventory", icon: Boxes },
  { title: "Password Reset Requests", url: "/admin/password-resets", icon: KeyRound },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
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
  const isActive = (url: string) => pathname === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">TinySteps ERP</div>
            <div className="truncate text-xs text-muted-foreground">Play School Suite</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/admin")}>
                  <Link to="/admin"><LayoutDashboard /><span>Dashboard</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {groups.map((g) => (
                <NavGroup key={g.title} group={g} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operations.map((entry) =>
                isGroup(entry) ? (
                  <NavGroup key={entry.title} group={entry} pathname={pathname} />
                ) : (
                  <SidebarMenuItem key={entry.url}>
                    <SidebarMenuButton asChild isActive={isActive(entry.url)}>
                      <Link to={entry.url}><entry.icon /><span>{entry.title}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={adminSignOut}
              tooltip="Sign out"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut />
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
