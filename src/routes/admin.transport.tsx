import { createFileRoute } from "@tanstack/react-router";
import { TransportModule } from "@/modules/transport";

export const Route = createFileRoute("/admin/transport")({
  component: () => <TransportModule readOnly={true} />,
  head: () => ({ meta: [{ title: "Transport — Admin View" }] }),
});
