import { createFileRoute } from "@tanstack/react-router";
import { HealthModule } from "@/modules/health";

export const Route = createFileRoute("/admin/health")({
  component: () => <HealthModule />,
  head: () => ({ meta: [{ title: "Health Module — Admin View" }] }),
});
