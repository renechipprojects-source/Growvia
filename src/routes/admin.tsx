import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { TopNav } from "@/components/admin/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { requireAuthGuard } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    requireAuthGuard("super-admin");
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/20 to-indigo-50/20">
        <AppSidebar />
        <SidebarInset className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-6 py-5 w-full max-w-none">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
