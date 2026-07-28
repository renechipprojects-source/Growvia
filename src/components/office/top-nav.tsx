import { Link, useRouterState } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NotificationPanel } from "@/components/NotificationPanel";

const labels: Record<string, string> = {
  "": "Dashboard",
  office: "Office",
  "new-enquiry": "New Enquiry",
  enquiries: "Enquiries",
  visits: "Today's Visits",
  admissions: "Admissions",
  students: "Students",
  "class-assignment": "Class Assignment",
  fees: "Fee Collection",
  receipts: "Fee Receipts",
  expenses: "Expenses",
  inventory: "Inventory",
  messages: "Messages",
  "parent-credentials": "Parent Logins",
  "teacher-credentials": "Teacher Logins",
  "password-resets": "Password Reset Requests",
  reports: "Reports",
};

export function OfficeTopNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const parts = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <SidebarTrigger />
        <div className="flex-1" />
        <NotificationPanel role="office" />
      </div>
    </header>
  );
}