import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/office/health")({
  beforeLoad: () => {
    throw redirect({ to: "/office" });
  },
});
