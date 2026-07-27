import { createFileRoute } from "@tanstack/react-router";
import { HealthModule } from "@/modules/health";

export const Route = createFileRoute("/office/health")({
  component: () => <HealthModule />,
  head: () => ({ meta: [{ title: "Student Health & Medical Records — Sunshine ERP" }] }),
});
