import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/office/app-sidebar";
import { OfficeTopNav } from "@/components/office/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { EnquiryProvider } from "@/lib/enquiryContext";
import { AlertsProvider } from "@/lib/alertsContext";
import { ClassAssignmentProvider } from "@/lib/classAssignmentContext";
import { StudentDocsProvider } from "@/lib/studentDocsContext";
import { InventoryProvider } from "@/lib/inventoryContext";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/office")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/" });
    if (s.role !== "office") throw redirect({ to: "/" });
    if (s.mustChangePassword) throw redirect({ to: "/change-password" });
  },
  head: () => ({
    meta: [
      { title: "Office — Sunshine ERP" },
      { name: "description", content: "Admissions, enquiries, fees, receipts and expenses." },
      { property: "og:title", content: "Office Dashboard" },
      { property: "og:description", content: "Everything administration." },
    ],
  }),
  component: OfficeLayout,
});

function OfficeLayout() {
  return (
    <AlertsProvider>
      <ClassAssignmentProvider>
        <StudentDocsProvider>
          <EnquiryProvider>
            <InventoryProvider>
              <SidebarProvider>
                <div className="flex h-screen w-full overflow-hidden bg-muted/30">
                  <OfficeSidebar />
                  <SidebarInset className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                    <OfficeTopNav />
                    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 w-full max-w-none">
                      <Outlet />
                    </main>
                  </SidebarInset>
                </div>
                <Toaster />
              </SidebarProvider>
            </InventoryProvider>
          </EnquiryProvider>
        </StudentDocsProvider>
      </ClassAssignmentProvider>
    </AlertsProvider>
  );
}
