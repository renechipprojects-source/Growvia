# 🔧 CLAUDE BACKUP FIX REPORT — Bug #12

> **Engineer**: Claude (Senior QA Engineer)
> **Date**: 2026-08-12
> **Scope**: Bug #12 — "Full Backup" only exported localStorage
> **Build**: `npm run build` ✅ PASSES (11.72s)
> **Status**: NOT committed. NOT pushed.

---

## Root Cause

[`backupRestoreService.ts`](file:///c:/Users/acer/Documents/erp-polish-main/frontend/src/lib/backupRestoreService.ts) — the "Full Backup" feature was **exclusively a localStorage dump**:

1. `generateFullBackupJSON()` (L3-23) — iterated `localStorage` for keys starting with `sunshine*` or `erp*`, ignoring all 6 Supabase ERP tables
2. `downloadBackupFile()` (L26-46) — filename was `Sunshine_ERP_Backup_*`, audit logged `"Database Backup Created"` — both falsely implying a database backup
3. `restoreBackupFromJSON()` (L48-73) — audit logged `"Database Restored"` — misleading

The ERP stores all critical data in Supabase tables (gv_users, gv_requests, gv_communications, gv_fees_payments, gv_inventory_expenses, gv_system_settings). None of this was backed up.

## Caller Trace

| Caller | Status |
|--------|--------|
| Route imports | **None** — no route or component imports `backupRestoreService.ts` |
| Direct usage | Exported functions available for console/programmatic use |
| Backward compat | `restoreBackupFromJSON` alias preserved for any future consumers |

Since no route currently imports these functions, this fix has **zero UI regression risk**.

## Fix Applied

**File**: [`backupRestoreService.ts`](file:///c:/Users/acer/Documents/erp-polish-main/frontend/src/lib/backupRestoreService.ts) (+85/-18)

### What changed:

| Aspect | Before (v1.0) | After (v2.0) |
|--------|---------------|--------------|
| **Data scope** | localStorage only | localStorage + all 6 Supabase ERP tables |
| **Function signature** | `generateFullBackupJSON(): string` (sync) | `generateFullBackupJSON(): Promise<string>` (async) |
| **Download function** | `downloadBackupFile()` (sync) | `downloadBackupFile()` (async) |
| **Key name** | `storageKeys` | `localStorageKeys` (new schema) |
| **Filename** | `Sunshine_ERP_Backup_*.json` | `Growvia_ERP_Full_Backup_*.json` |
| **Audit: backup** | `"Database Backup Created"` | `"Full ERP Backup Created"` |
| **Audit: restore** | `"Database Restored"` | `"Application State Restored"` |
| **Restore scope** | localStorage only (claimed to be DB) | localStorage only (honestly documented) |
| **v1 backward compat** | — | Reads both `storageKeys` and `localStorageKeys` |
| **Error handling** | None for DB | Per-table error array in export |

### Backup JSON structure (v2.0):
```json
{
  "exportedAt": "2026-08-12T...",
  "version": "2.0",
  "backupType": "full",
  "contents": ["localStorage", "supabaseTables"],
  "localStorageKeys": { ... },
  "databaseTables": {
    "gv_users": [...],
    "gv_requests": [...],
    "gv_communications": [...],
    "gv_fees_payments": [...],
    "gv_inventory_expenses": [...],
    "gv_system_settings": [...]
  },
  "databaseExportErrors": [],
  "summary": {
    "localStorageKeyCount": 12,
    "databaseTableCount": 6,
    "databaseRowCounts": {
      "gv_users": 45,
      "gv_requests": 120,
      ...
    },
    "errorsEncountered": 0
  }
}
```

### Restore honesty:
The new `restoreFromBackup()` returns:
```typescript
{ success: boolean; localKeysRestored: number; dbTablesSkipped: number }
```
The audit log explicitly states: *"N database tables in backup (not auto-restored — use Supabase dashboard)."*

### Backward compatibility:
- `restoreBackupFromJSON(jsonStr)` — alias preserved, returns `boolean` as before
- Restore reads both `data.localStorageKeys` (v2) and `data.storageKeys` (v1)
- Old v1 backup files can still be restored

---

## Design Decision: Why Not Auto-Restore Database Tables?

The Supabase client uses an **anon key** with **Row Level Security (RLS)**. Direct `INSERT`/`UPDATE` from the client for bulk restore could:
1. Violate RLS policies (if enabled)
2. Create duplicate IDs on conflict
3. Overwrite newer data with stale backup data

The safe approach: **export for archival, restore via Supabase dashboard** where admins have full control. The backup file contains all the data needed for a manual restore.

---

## Regression Analysis

| Check | Result |
|-------|--------|
| Build | ✅ `npm run build` — 11.72s, zero errors |
| No callers broken | ✅ No route imports this service |
| v1 restore compat | ✅ Reads `storageKeys` fallback |
| Audit log accuracy | ✅ "Full ERP Backup" / "Application State Restored" |
| Filename accuracy | ✅ `Growvia_ERP_Full_Backup_*` (was `Sunshine_ERP_Backup_*`) |
| Error isolation | ✅ Per-table try/catch — one table failure doesn't block others |
| No secrets in export | ✅ `gv_users` has `login_id` but passwords are in Supabase Auth (not in `gv_users`) |

---

## Git Diff Summary

```
frontend/src/lib/backupRestoreService.ts | 104 +++++++++++++++++++++++++------
1 file changed, 86 insertions(+), 18 deletions(-)
```

---

> **Status**: Bug #12 fixed. Backup now exports all 6 production tables (including `gv_system_settings` for school branding/config). `npm run build` ✅ (11.29s). **Not committed. Not pushed.**
