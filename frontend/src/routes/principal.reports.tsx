import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/principal/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/principal/dashboard" });
  },
  component: () => null,
});
