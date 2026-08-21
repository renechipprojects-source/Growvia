import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/school-branding")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});
