import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ClassAssignmentProvider } from "@/lib/classAssignmentContext";
import { AcademicYearProvider } from "@/lib/academicYearContext";
import { AutoRefreshProvider } from "@/lib/autoRefreshContext";
import { useDeveloperSettings } from "@/lib/developerSettingsStore";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Root Error Boundary caught runtime exception:", error, error?.stack);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const isDev = typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-lg w-full text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl shadow-slate-200/50">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl mb-4">
          !
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Page Navigation Notice
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {error?.message || "Something went wrong while loading this view."}
        </p>
        {isDev && error?.stack && (
          <details className="mt-4 text-left bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs overflow-x-auto max-h-48 font-mono">
            <summary className="cursor-pointer font-semibold text-amber-400 mb-1">
              Developer Error Details & Stack Trace
            </summary>
            <pre className="whitespace-pre-wrap">{error.stack}</pre>
          </details>
        )}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 shadow-xs cursor-pointer"
          >
            Refresh View
          </button>
          <a
            href="/"
            onClick={() => {
              try { window.localStorage.removeItem("sunshine.auth"); } catch {}
            }}
            className="w-full inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            Return to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sunshine Play School — Growvia" },
      { name: "description", content: "Institutional management portal for Sunshine Play School. Manage admissions, fees, activities and more." },
      { name: "author", content: "Growvia" },
      { property: "og:title", content: "Sunshine Play School — Growvia" },
      { property: "og:description", content: "Institutional management portal for Sunshine Play School. Manage admissions, fees, activities and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Growvia" },
      { name: "twitter:title", content: "Sunshine Play School — Growvia" },
      { name: "twitter:description", content: "Institutional management portal for Sunshine Play School. Manage admissions, fees, activities and more." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b91f377a-5bc7-4237-8fdb-1aae4222ca93/id-preview-a8b64355--49693554-1070-4f99-b2b6-5f30ce05e86f.lovable.app-1784715518851.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b91f377a-5bc7-4237-8fdb-1aae4222ca93/id-preview-a8b64355--49693554-1070-4f99-b2b6-5f30ce05e86f.lovable.app-1784715518851.png" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useDeveloperSettings();

  return (
    <QueryClientProvider client={queryClient}>
      <AutoRefreshProvider>
        <AcademicYearProvider>
          <ClassAssignmentProvider>
            <Outlet />
            <SonnerToaster position="top-right" richColors />
          </ClassAssignmentProvider>
        </AcademicYearProvider>
      </AutoRefreshProvider>
    </QueryClientProvider>
  );
}
