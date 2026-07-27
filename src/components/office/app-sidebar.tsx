import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  Calendar,
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
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { signOut } from "@/lib/auth";

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
  title: "Students",
  icon: Baby,
  items: [
    { title: "Students", url: "/office/students", icon: Baby },
    { title: "Class Assignment", url: "/office/class-assignment", icon: UserCheck },
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
    { title: "Password Reset Requests", url: "/office/password-resets", icon: KeyRound },
  ],
};

const operations: Item[] = [
  { title: "Inventory", url: "/office/inventory", icon: Boxes },
  { title: "Transport", url: "/office/transport", icon: Bus },
  { title: "Messages", url: "/office/messages", icon: MessageSquare },
  { title: "Reports", url: "/office/reports", icon: FileText },
];

export function OfficeSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => pathname === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/office" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold">Office Suite</div>
            <div className="truncate text-xs text-muted-foreground">Administration Hub</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/office")}>
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
                  <SidebarMenuButton asChild isActive={isActive(entry.url)}>
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
              onClick={() => {
                signOut();
                window.location.replace("/");
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
  const hasActive = group.items.some(
    (i) => pathname === i.url || pathname.startsWith(i.url + "/"),
  );
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