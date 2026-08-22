import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  Baby,
  UserCheck,
  DollarSign,
  Receipt,
  Wallet,
  Boxes,
  MessageSquare,
  KeyRound,
  ShieldCheck,
  FileText,
  ChevronRight,
  LogOut,
  Building2,
  Bus,
  HeartPulse,
  Megaphone,
  GraduationCap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";
import { useDeveloperSettings } from "@/lib/developerSettingsStore";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; icon: React.ComponentType<{ className?: string }>; items: Item[] };

const admissions: Group = {
  title: "Admissions",
  icon: ClipboardCheck,
  items: [
    { title: "New Enquiry", url: "/office/new-enquiry", icon: Sparkles },
    { title: "Enquiries", url: "/office/enquiries", icon: ClipboardList },
    { title: "Today's Visits", url: "/office/visits", icon: Calendar },
    { title: "Admissions", url: "/office/admissions", icon: ClipboardCheck },
  ],
};

const students: Group = {
  title: "Students & Staff",
  icon: Baby,
  items: [
    { title: "Students", url: "/office/students", icon: Baby },
    { title: "Classes", url: "/office/classes", icon: GraduationCap },
    { title: "Class Assignment", url: "/office/class-assignment", icon: UserCheck },
    { title: "Promotion Mapping", url: "/office/promotion-mapping", icon: GraduationCap },
  ],
};

const attendance: Group = {
  title: "Attendance",
  icon: CalendarCheck,
  items: [
    { title: "Staff Attendance", url: "/office/staff-attendance", icon: UserCheck },
  ],
};

const fees: Group = {
  title: "Fees & Finance",
  icon: DollarSign,
  items: [
    { title: "Fee Collection", url: "/office/fees", icon: DollarSign },
    { title: "Receipts", url: "/office/receipts", icon: Receipt },
    { title: "Expenses", url: "/office/expenses", icon: Wallet },
  ],
};

const access: Group = {
  title: "Access & Security",
  icon: KeyRound,
  items: [
    { title: "Parent Logins", url: "/office/parent-credentials", icon: KeyRound },
    { title: "Teacher Logins", url: "/office/teacher-credentials", icon: ShieldCheck },
  ],
};

const operations: Item[] = [
  { title: "Circulars", url: "/office/circulars", icon: Megaphone },
  { title: "Inventory", url: "/office/inventory", icon: Boxes },
  { title: "Transport", url: "/office/transport", icon: Bus },
  { title: "Messages", url: "/office/messages", icon: MessageSquare },
];

export function OfficeSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings } = useDeveloperSettings();

  const isActive = (url: string) => {
    if (url === "/office") return pathname === "/office" || pathname === "/office/";
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/office" className="flex items-center gap-3 px-2 py-2">
          <div className="flex shrink-0 items-center justify-center h-10 w-10">
            {settings.branding.sidebarLogoUrl || settings.theme.sidebarLogoUrl || settings.branding.schoolLogoUrl ? (
              <img
                src={settings.branding.sidebarLogoUrl || settings.theme.sidebarLogoUrl || settings.branding.schoolLogoUrl}
                alt="Logo"
                className="h-8 w-8 object-contain"
              />
            ) : (
              <Building2 className="h-7 w-7 text-amber-600" />
            )}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">{settings.branding.sidebarSchoolName || settings.branding.sidebarTitle || settings.school.schoolName}</div>
            <div className="truncate text-xs text-muted-foreground">Office Portal</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/office")} tooltip="Dashboard">
                  <Link to="/office">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavGroup group={admissions} pathname={pathname} />
              <NavGroup group={students} pathname={pathname} />
              <NavGroup group={attendance} pathname={pathname} />
              <NavGroup group={fees} pathname={pathname} />
              <NavGroup group={access} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operations.map((entry) => (
                <SidebarMenuItem key={entry.url}>
                  <SidebarMenuButton asChild isActive={isActive(entry.url)} tooltip={entry.title}>
                    <Link to={entry.url}>
                      <entry.icon />
                      <span>{entry.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await signOut();
              }}
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
  const { state } = useSidebar();
  const hasActive = group.items.some(
    (i) => pathname === i.url || pathname.startsWith(i.url + "/"),
  );
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
                    pathname === item.url ? "bg-amber-50 text-amber-700 font-bold" : "text-slate-700 hover:bg-slate-100"
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
            <ChevronRight
              className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.items.map((item) => (
              <SidebarMenuSubItem key={item.url}>
                <SidebarMenuSubButton asChild isActive={pathname === item.url}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}