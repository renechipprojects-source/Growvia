import { createFileRoute } from "@tanstack/react-router";
import { PasswordResetQueue } from "@/components/PasswordResetQueue";

export const Route = createFileRoute("/office/password-resets")({
  head: () => ({
    meta: [
      { title: "Password Reset Requests — Office" },
      { name: "description", content: "Password reset section disabled." },
    ],
  }),
  component: () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-8 max-w-md space-y-3">
        <h2 className="text-lg font-bold text-slate-800">Password Reset Section Removed</h2>
        <p className="text-xs text-slate-600">
          Password resets have been removed from this page. You can generate or issue login credentials directly with custom passwords under Parent Logins and Teacher Logins.
        </p>
      </div>
    </div>
  ),
});
