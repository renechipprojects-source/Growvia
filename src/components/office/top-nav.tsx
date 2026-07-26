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
      <div className="hidden border-t px-6 py-2 sm:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/office">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {parts.slice(1).map((p, i, arr) => {
              const isLast = i === arr.length - 1;
              return (
                <span key={p + i} className="flex items-center gap-1.5">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="capitalize">
                        {labels[p] ?? p}
                      </BreadcrumbPage>
                    ) : (
                      <span className="capitalize text-muted-foreground">
                        {labels[p] ?? p}
                      </span>
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