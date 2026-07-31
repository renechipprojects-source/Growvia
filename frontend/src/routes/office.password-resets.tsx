import { createFileRoute } from "@tanstack/react-router";
import { PasswordResetQueue } from "@/components/PasswordResetQueue";

export const Route = createFileRoute("/office/password-resets")({
  head: () => ({
    meta: [
      { title: "Password Reset Requests — Office" },
      { name: "description", content: "Handle teacher and parent password reset requests." },
    ],
  }),
  component: () => (
    <PasswordResetQueue
      queue="office"
      title="Password Reset Requests"
      description="Teacher and parent password reset requests received from the sign-in page."
    />
  ),
});
