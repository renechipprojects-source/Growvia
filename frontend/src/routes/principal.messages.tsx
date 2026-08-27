import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/principal/messages")({
  component: () => <Navigate to="/principal" replace />,
});

