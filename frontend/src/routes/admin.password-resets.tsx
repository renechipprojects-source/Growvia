import { createFileRoute } from "@tanstack/react-router";
import { PasswordResetQueue } from "@/components/PasswordResetQueue";

export const Route = createFileRoute("/admin/password-resets")({
  head: () => ({
    meta: [
      { title: "Password Reset Requests — Admin" },
      { name: "description", content: "Handle principal and office staff password reset requests." },
    ],
  }),
  component: () => (
    <PasswordResetQueue
      queue="admin"
      title="Password Reset Requests"
      description="Principal and Office Staff password reset requests."
    />
  ),
});
