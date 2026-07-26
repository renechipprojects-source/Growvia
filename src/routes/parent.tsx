import { createFileRoute, redirect } from "@tanstack/react-router";
import { ParentShell } from "@/components/ParentShell";
import { ParentProvider } from "@/lib/parentContext";
import { I18nProvider } from "@/lib/i18n";
import { AlertsProvider } from "@/lib/alertsContext";
import { LeaveProvider } from "@/lib/leaveContext";
import { StudentDocsProvider } from "@/lib/studentDocsContext";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/parent")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const s = getSession();
    if (!s) throw redirect({ to: "/" });
    if (s.role !== "parent") throw redirect({ to: "/" });
    if (s.mustChangePassword) throw redirect({ to: "/change-password" });
  },
  head: () => ({
    meta: [
      { title: "Parent — Sunshine ERP" },
      { name: "description", content: "Stay close to your little one — attendance, diary, photos and fees." },
      { property: "og:title", content: "Parent Portal" },
      { property: "og:description", content: "Every step of the day." },
    ],
  }),
  component: () => (
    <I18nProvider>
      <ParentProvider>
        <AlertsProvider>
          <StudentDocsProvider>
            <LeaveProvider>
              <ParentShell />
            </LeaveProvider>
          </StudentDocsProvider>
        </AlertsProvider>
      </ParentProvider>
    </I18nProvider>
  ),
});
