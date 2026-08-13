import { createFileRoute } from "@tanstack/react-router";
import { PasswordResetQueue } from "@/components/PasswordResetQueue";

export const Route = createFileRoute("/office/password-resets")({
  head: () => ({
    meta: [
      { title: "Password Reset Requests — Office" },
      { name: "description", content: "Manage and approve password reset requests for teachers and parents." },
    ],
  }),
  component: () => (
    <PasswordResetQueue
      queue="office"
      title="Staff & Parent Password Resets"
      description="Review and issue secure temporary login credentials for verified staff and parents."
    />
  ),
});
