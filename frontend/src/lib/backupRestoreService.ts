import { logAuditEvent } from "./auditLogStore";

export function generateFullBackupJSON(): string {
  const backupData: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    storageKeys: {},
  };

  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sunshine") || key.startsWith("erp"))) {
        try {
          backupData.storageKeys[key] = JSON.parse(localStorage.getItem(key) || "{}");
        } catch {
          backupData.storageKeys[key] = localStorage.getItem(key);
        }
      }
    }
  }

  return JSON.stringify(backupData, null, 2);
}

export function downloadBackupFile() {
  const jsonStr = generateFullBackupJSON();
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Sunshine_ERP_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  logAuditEvent({
    user: "Super Admin",
    role: "admin",
    module: "System Settings",
    action: "Database Backup Created",
    previousValue: "N/A",
    newValue: "Full JSON Snapshot Downloaded",
  });
}

export function restoreBackupFromJSON(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.storageKeys || typeof data.storageKeys !== "object") return false;

    if (typeof window !== "undefined") {
      Object.entries(data.storageKeys).forEach(([key, val]) => {
        const valStr = typeof val === "string" ? val : JSON.stringify(val);
        localStorage.setItem(key, valStr);
      });
    }

    logAuditEvent({
      user: "Super Admin",
      role: "admin",
      module: "System Settings",
      action: "Database Restored",
      previousValue: "Previous State",
      newValue: `Restored from snapshot ${data.exportedAt}`,
    });

    return true;
  } catch {
    return false;
  }
}
