import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { TopNav } from "@/components/admin/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/" });
    if (s.role !== "super-admin") throw redirect({ to: "/" });
    if (s.mustChangePassword) throw redirect({ to: "/change-password" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-muted/30">
        <AppSidebar />
        <SidebarInset className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
