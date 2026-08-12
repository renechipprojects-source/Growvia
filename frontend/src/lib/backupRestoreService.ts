import { logAuditEvent } from "./auditLogStore";
import { supabase } from "./supabase";

const ERP_TABLES = [
  "gv_users",
  "gv_requests",
  "gv_communications",
  "gv_fees_payments",
  "gv_inventory_expenses",
  "gv_system_settings",
] as const;

/**
 * Generates a full backup JSON containing:
 * 1. Local application state (localStorage keys matching sunshine* or erp*)
 * 2. All ERP database tables (via Supabase client)
 *
 * NOTE: Restore only restores localStorage. Database tables are included
 * for archival/audit purposes and must be restored via Supabase dashboard.
 */
export async function generateFullBackupJSON(): Promise<string> {
  const backupData: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    version: "2.0",
    backupType: "full",
    contents: ["localStorage", "supabaseTables"],
    localStorageKeys: {},
    databaseTables: {},
    databaseExportErrors: [],
  };

  // 1. Local application state
  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sunshine") || key.startsWith("erp"))) {
        try {
          backupData.localStorageKeys[key] = JSON.parse(localStorage.getItem(key) || "{}");
        } catch {
          backupData.localStorageKeys[key] = localStorage.getItem(key);
        }
      }
    }
  }

  // 2. Supabase ERP tables
  for (const table of ERP_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        backupData.databaseExportErrors.push({ table, error: error.message });
        backupData.databaseTables[table] = [];
      } else {
        backupData.databaseTables[table] = data || [];
      }
    } catch (err: any) {
      backupData.databaseExportErrors.push({ table, error: err?.message || "Fetch failed" });
      backupData.databaseTables[table] = [];
    }
  }

  // Summary metadata
  backupData.summary = {
    localStorageKeyCount: Object.keys(backupData.localStorageKeys).length,
    databaseTableCount: ERP_TABLES.length,
    databaseRowCounts: Object.fromEntries(
      ERP_TABLES.map((t) => [t, Array.isArray(backupData.databaseTables[t]) ? backupData.databaseTables[t].length : 0])
    ),
    errorsEncountered: backupData.databaseExportErrors.length,
  };

  return JSON.stringify(backupData, null, 2);
}

export async function downloadBackupFile() {
  const jsonStr = await generateFullBackupJSON();
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Growvia_ERP_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  logAuditEvent({
    user: "Super Admin",
    role: "admin",
    module: "System Settings",
    action: "Full ERP Backup Created",
    previousValue: "N/A",
    newValue: "Exported localStorage + database tables (gv_users, gv_requests, gv_communications, gv_fees_payments, gv_inventory_expenses, gv_system_settings)",
  });
}

/**
 * Restores local application state from a backup JSON file.
 *
 * IMPORTANT: This restores ONLY localStorage keys. Database table data
 * included in the backup is for archival purposes and must be restored
 * via the Supabase dashboard or direct SQL import.
 */
export function restoreFromBackup(jsonStr: string): { success: boolean; localKeysRestored: number; dbTablesSkipped: number } {
  try {
    const data = JSON.parse(jsonStr);

    // Support both v1 (storageKeys) and v2 (localStorageKeys) formats
    const keys = data.localStorageKeys || data.storageKeys;
    if (!keys || typeof keys !== "object") {
      return { success: false, localKeysRestored: 0, dbTablesSkipped: 0 };
    }

    let restoredCount = 0;
    if (typeof window !== "undefined") {
      Object.entries(keys).forEach(([key, val]) => {
        const valStr = typeof val === "string" ? val : JSON.stringify(val);
        localStorage.setItem(key, valStr);
        restoredCount++;
      });
    }

    const dbTablesSkipped = data.databaseTables ? Object.keys(data.databaseTables).length : 0;

    logAuditEvent({
      user: "Super Admin",
      role: "admin",
      module: "System Settings",
      action: "Application State Restored",
      previousValue: "Previous local state",
      newValue: `Restored ${restoredCount} localStorage keys from snapshot ${data.exportedAt || "unknown"}. ${dbTablesSkipped} database tables in backup (not auto-restored — use Supabase dashboard).`,
    });

    return { success: true, localKeysRestored: restoredCount, dbTablesSkipped };
  } catch {
    return { success: false, localKeysRestored: 0, dbTablesSkipped: 0 };
  }
}

// Backward-compatible alias for existing code that may reference the old name
export const restoreBackupFromJSON = (jsonStr: string) => restoreFromBackup(jsonStr).success;
