import { createFileRoute } from "@tanstack/react-router";
import { TransportModule } from "@/modules/transport";

export const Route = createFileRoute("/office/transport")({
  component: () => <TransportModule readOnly={false} />,
  head: () => ({ meta: [{ title: "Transport — Office Management" }] }),
});
