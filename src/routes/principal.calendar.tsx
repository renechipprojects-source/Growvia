import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/principal/calendar")({
  beforeLoad: () => {
    throw redirect({ to: "/principal/dashboard" });
  },
  component: () => null,
});
