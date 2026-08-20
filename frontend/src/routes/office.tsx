import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { OfficeSidebar } from "@/components/office/app-sidebar";
import { OfficeTopNav } from "@/components/office/top-nav";
import { EnquiryProvider } from "@/lib/enquiryContext";
import { AlertsProvider } from "@/lib/alertsContext";
import { StudentDocsProvider } from "@/lib/studentDocsContext";
import { InventoryProvider } from "@/lib/inventoryContext";
import { requireAuthGuard } from "@/lib/auth";

export const Route = createFileRoute("/office")({
  beforeLoad: () => {
    requireAuthGuard(["office", "super-admin", "principal"]);
  },
  head: () => ({
    meta: [
      { title: "Office — Sunshine Play School" },
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
      <StudentDocsProvider>
        <EnquiryProvider>
          <InventoryProvider>
            <SidebarProvider>
              <div className="flex h-screen w-full overflow-hidden bg-muted/30">
                <OfficeSidebar />
                <SidebarInset className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                  <OfficeTopNav />
                  <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 w-full max-w-none">
                    <Outlet />
                  </main>
                </SidebarInset>
              </div>
            </SidebarProvider>
          </InventoryProvider>
        </EnquiryProvider>
      </StudentDocsProvider>
    </AlertsProvider>
  );
}
