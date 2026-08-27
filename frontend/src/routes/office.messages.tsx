import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/office/messages")({
  component: () => <Navigate to="/office" replace />,
});

