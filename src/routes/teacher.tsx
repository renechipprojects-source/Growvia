import { createFileRoute, redirect } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { AlertsProvider } from "@/lib/alertsContext";
import { ClassAssignmentProvider } from "@/lib/classAssignmentContext";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/teacher")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/" });
    if (s.role !== "teacher") throw redirect({ to: "/" });
    if (s.mustChangePassword) throw redirect({ to: "/change-password" });
  },
  head: () => ({
    meta: [
      { title: "Teacher — Sunshine ERP" },
      { name: "description", content: "Attendance, diary, homework, gallery and progress." },
      { property: "og:title", content: "Teacher Dashboard" },
      { property: "og:description", content: "Every child, every moment." },
    ],
  }),
  component: () => (
    <AlertsProvider>
      <ClassAssignmentProvider>
        <RoleShell role="teacher" />
      </ClassAssignmentProvider>
    </AlertsProvider>
  ),
});
