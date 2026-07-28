import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/principal/health")({
  beforeLoad: () => {
    throw redirect({ to: "/principal" });
  },
});
