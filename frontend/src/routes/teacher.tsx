import { createFileRoute, redirect } from "@tanstack/react-router";
import { RoleShell } from "@/components/RoleShell";
import { AlertsProvider } from "@/lib/alertsContext";
import { ClassAssignmentProvider } from "@/lib/classAssignmentContext";
import { LeaveProvider } from "@/lib/leaveContext";
import { requireAuthGuard } from "@/lib/auth";

export const Route = createFileRoute("/teacher")({
  beforeLoad: () => {
    requireAuthGuard("teacher");
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
        <LeaveProvider>
          <RoleShell role="teacher" />
        </LeaveProvider>
      </ClassAssignmentProvider>
    </AlertsProvider>
  ),
});
