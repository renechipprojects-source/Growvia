import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { checkSupabaseConnection } from "@/lib/supabaseService";

export function SupabaseStatus() {
  const [status, setStatus] = useState<{
    loading: boolean;
    connected: boolean;
    profileCount: number;
    message: string;
  }>({
    loading: true,
    connected: false,
    profileCount: 0,
    message: "Checking database status...",
  });

  const runCheck = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    const res = await checkSupabaseConnection();
    setStatus({
      loading: false,
      connected: res.connected,
      profileCount: res.profileCount,
      message: res.message,
    });
  };

  useEffect(() => {
    runCheck();
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <Database className="h-3.5 w-3.5 text-slate-500" />
      <span className="hidden sm:inline">Supabase:</span>

      {status.loading ? (
        <span className="inline-flex items-center gap-1 text-slate-400">
          <RefreshCw className="h-3 w-3 animate-spin" /> Checking...
        </span>
      ) : status.connected ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold" title={status.message}>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Live
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold" title={status.message}>
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Mock Fallback
        </span>
      )}

      <button
        onClick={runCheck}
        disabled={status.loading}
        title="Refresh connection status"
        className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <RefreshCw className={`h-3 w-3 ${status.loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
