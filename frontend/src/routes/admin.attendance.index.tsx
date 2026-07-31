import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/attendance/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/attendance/students" });
  },
});
