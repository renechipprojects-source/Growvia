import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { PrincipalSidebar } from "@/components/principal/Sidebar";
import { PrincipalHeader } from "@/components/principal/Header";
import { InventoryProvider } from "@/lib/inventoryContext";
import { getSession } from "@/lib/auth";

const titleMap: Record<string, string> = {
  "/principal/dashboard": "Dashboard",
  "/principal/students": "Students",
  "/principal/teachers": "Teachers",
  "/principal/classes": "Classes",
  "/principal/attendance/students": "Student Attendance",
  "/principal/attendance/staff": "Staff Attendance",
  "/principal/circulars": "Circular Management",
  "/principal/events": "Events",
  "/principal/calendar": "Calendar",
  "/principal/inventory": "Inventory",
  "/principal/reports": "Reports",
};

export const Route = createFileRoute("/principal")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/" });
    if (s.role !== "principal") throw redirect({ to: "/" });
    if (s.mustChangePassword) throw redirect({ to: "/change-password" });
  },
  component: PrincipalLayout,
});

function PrincipalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleMap[pathname] ?? "Principal Portal";

  return (
    <InventoryProvider>
      <div className="principal-shell min-h-screen flex bg-background">
        <PrincipalSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <PrincipalHeader onMenu={() => setMobileOpen(true)} title={title} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </InventoryProvider>
  );
}
