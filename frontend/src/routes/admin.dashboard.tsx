import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAuthGuard } from "@/lib/auth";

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: async () => {
    await requireAuthGuard("super-admin");
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});
