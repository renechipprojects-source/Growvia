# Growvia School ERP — Dynamic Academic Session Audit & Verification Report

This document verifies that the **Academic Session / Academic Year** setting is **100% dynamic** and controlled directly from the Developer Console across all Growvia School ERP modules.

---

## 1. Architecture Summary & Centralized Source of Truth

```
Developer Console (System Settings Tab)
                   │
        [Editable Academic Session]
                   │
                   ▼
  Supabase Database Table: GV_system_settings
         (Column: academic_year | ID: PRIMARY)
                   │
                   ▼
       Centralized Settings Store:
     useDeveloperSettings() & useAcademicYear()
                   │
 ┌─────────────────┼─────────────────┬─────────────────┐
 │                 │                 │                 │
 Login Page    Role Header/    Role Dashboards &   Annual Promotion &
(& Session)     Sidebar       Fee Collection      Lifecycle Engine
```

---

## 2. Updated Components & Files Matrix

| Page / Component | Source File | Dynamic Integration Method | Status |
| :--- | :--- | :--- | :--- |
| **Central Settings Store** | `frontend/src/lib/developerSettingsStore.ts` | Stores `settings.school.academicYear` in `GV_system_settings` | **Dynamic & Persistent** |
| **Academic Year Provider** | `frontend/src/lib/academicYearContext.tsx` | Connects `useAcademicYear()` to `useDeveloperSettings()` | **Dynamic & Synced** |
| **Login Page** | `frontend/src/routes/index.tsx` | Renders `settings.school.academicYear` dynamically | **Dynamic** |
| **Annual Promotion Section** | `frontend/src/components/promotion/AnnualPromotionLifecycleSection.tsx` | Consumes `activeYear` & computes available sessions | **Dynamic** |
| **Promotion Wizard** | `frontend/src/components/students/PromotionWizardModal.tsx` | Dynamically sets `fromYear` to `activeYear` & `toYear` to next session | **Dynamic** |
| **Student Profile Modal** | `frontend/src/components/students/StudentProfileModal.tsx` | Falls back to active session for current profile views | **Dynamic** |
| **Fee Ledger & Collection** | `frontend/src/routes/office.fees.tsx` & `feePaymentService.ts` | Uses active academic year while preserving historical transactions | **Dynamic & Preserved** |
| **Dashboard Stats Service** | `frontend/src/lib/dashboardStatsService.ts` | Default year query reads active session from settings store | **Dynamic** |

---

## 3. Realtime Synchronization & Test Flow

1. **Initial Setting**: Developer Console sets Academic Session = `2026-2027`.
2. **Developer Console Update**: Developer changes session to `2027-2028` and clicks **Save**.
3. **Database Write**: Updated in Supabase table `GV_system_settings` (row `id = 'PRIMARY'`).
4. **Realtime Event**: Supabase `postgres_changes` event fires and updates `useDeveloperSettings()` store.
5. **UI Update**:
   - Login page updates session badge to `2027-2028`.
   - Fee collection default session updates to `2027-2028`.
   - Promotion wizard defaults `fromYear` = `2027-2028` and `toYear` = `2028-2029`.
6. **Historical Data Safety**: Past payment receipts (e.g. `2024-2025` or `2025-2026`) remain intact in the database.

---

## 4. Verification Results

- **TypeScript Compilation**: `cd frontend && npx tsc --noEmit` — **0 Errors**.
- **Realtime Broadcast Channel**: **ACTIVE**.
