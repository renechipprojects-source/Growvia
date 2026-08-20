import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export interface SystemBranding {
  schoolName: string;
  shortName: string;
  tagline: string;
  footer: string;
  primaryColor: string;
  accentColor: string;
  schoolLogoUrl?: string;
  headerLogoUrl?: string;
  sidebarLogoUrl?: string;
  projectLogo?: string;
  project_logo?: string;
  sidebarSchoolName?: string;
  sidebarTitle?: string;
  browserTitle?: string;
  faviconUrl?: string;
  reportHeader?: string;
  receiptHeader?: string;
  projectName?: string;
  project_name?: string;
  logoUrl?: string;
  motto?: string;
  address?: string;
  phone?: string;
  email?: string;
  officeHours?: string;
  erpName?: string;
  printFooter?: string;
}

export interface LoginPageConfig {
  title: string;
  subtitle?: string;
  description?: string;
  welcomeMessage?: string;
  schoolLogoUrl?: string;
  logoUrl: string;
  bgImageUrl?: string;
  backgroundImage?: string;
  badgeText: string;
  showAcademicSession: boolean;
  showFeaturesList: boolean;
}

export interface SchoolBranding {
  schoolName: string;
  schoolLogoUrl?: string;
  logoUrl?: string;
  academicYear: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  motto: string;
  officeHours: string;
}

export interface SystemSettingsConfig {
  allowParentRegistration: boolean;
  autoApproveStaffLeaves: boolean;
  enableAuditLogs: boolean;
  maintenanceMode: boolean;
  sessionTimeoutMinutes: number;
  academicYear?: string;
  workingDays?: string;
  officeHours?: string;
  feeCurrency?: string;
  dateFormat?: string;
  timeFormat?: string;
  appName?: string;
}

export interface DeveloperSettings {
  branding: SystemBranding;
  loginPage: LoginPageConfig;
  school: SchoolBranding;
  theme: {
    darkMode: boolean;
    primaryColor: string;
    secondaryColor: string;
    borderRadius: string;
    compactView: boolean;
    faviconUrl?: string;
    sidebarLogoUrl?: string;
  };
  dashboards: {
    showQuickStats: boolean;
    showRecentActivity: boolean;
    showAnnouncements: boolean;
    showCharts?: boolean;
    showWidgets?: boolean;
    showQuickActions?: boolean;
    showStatistics?: boolean;
    showCards?: boolean;
  };
  system: SystemSettingsConfig;
  notifications: {
    emailNotifications: boolean;
    smsAlerts: boolean;
    pushNotifications: boolean;
    leaveAlerts: boolean;
    feeReminderAlerts: boolean;
    realtimeEnabled?: boolean;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    roleNotifications?: boolean;
  };
  roles: {
    allowTeacherGradeEdit: boolean;
    allowOfficeFeeWaiver: boolean;
    principalCanApproveLeaves: boolean;
    permissions?: Record<string, boolean>;
  };
  features: {
    enableTransportModule: boolean;
    enableInventoryModule: boolean;
    enableOnlineFees: boolean;
    enableParentChat: boolean;
  };
}

const DEFAULT_SUNSHINE_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='28' fill='%23f59e0b'/><g stroke='%23f59e0b' stroke-width='6' stroke-linecap='round'><line x1='50' y1='10' x2='50' y2='2'/><line x1='50' y1='90' x2='50' y2='98'/><line x1='10' y1='50' x2='2' y2='50'/><line x1='90' y1='50' x2='98' y2='50'/><line x1='22' y1='22' x2='16' y2='16'/><line x1='78' y1='78' x2='84' y2='84'/><line x1='22' y1='78' x2='16' y2='84'/><line x1='78' y1='22' x2='84' y2='16'/></g></svg>";

export const DEFAULT_DEV_SETTINGS: DeveloperSettings = {
  branding: {
    schoolName: "Sunshine Play School",
    shortName: "Sunshine Play School",
    tagline: "Nurturing Little Minds with Love & Joy",
    footer: "© 2026 Sunshine Play School. Powered by Growvia.",
    primaryColor: "#0f172a",
    accentColor: "#f59e0b",
    schoolLogoUrl: DEFAULT_SUNSHINE_LOGO,
    headerLogoUrl: "/renechip-logo.png",
    sidebarLogoUrl: DEFAULT_SUNSHINE_LOGO,
    sidebarSchoolName: "Sunshine Play School",
    sidebarTitle: "Sunshine Play School",
    browserTitle: "Sunshine Play School — Growvia",
    faviconUrl: "/favicon.ico",
    reportHeader: "Sunshine Play School — Official Document",
    receiptHeader: "Sunshine Play School — Payment Receipt",
    projectName: "Growvia",
    projectLogo: "/growvia-logo.png",
    project_logo: "/growvia-logo.png",
    logoUrl: DEFAULT_SUNSHINE_LOGO,
  },
  loginPage: {
    title: "Sunshine Play School",
    subtitle: "Play School Operations",
    description: "Welcome to Sunshine Play School portal. Secure single portal access for Admin, Principal, Office, Teachers, and Parents.",
    schoolLogoUrl: DEFAULT_SUNSHINE_LOGO,
    logoUrl: DEFAULT_SUNSHINE_LOGO,
    bgImageUrl: "",
    backgroundImage: "",
    badgeText: "GROWVIA v2.4",
    showAcademicSession: true,
    showFeaturesList: true,
  },
  school: {
    schoolName: "Sunshine Play School",
    schoolLogoUrl: DEFAULT_SUNSHINE_LOGO,
    logoUrl: DEFAULT_SUNSHINE_LOGO,
    academicYear: "2026-2027",
    address: "123 Sunshine Lane, Playtown, India",
    phone: "+91 98765 43210",
    email: "contact@sunshineplayschool.edu",
    website: "https://sunshineplayschool.edu",
    motto: "Play, Learn & Grow Together",
    officeHours: "8:00 AM - 4:00 PM (Mon - Sat)",
  },
  theme: {
    darkMode: false,
    primaryColor: "#0f172a",
    secondaryColor: "#3b82f6",
    borderRadius: "0.75rem",
    compactView: false,
    faviconUrl: "/favicon.ico",
  },
  dashboards: {
    showCards: true,
    showCharts: true,
    showWidgets: true,
    showQuickActions: true,
    showStatistics: true,
    showQuickStats: true,
    showRecentActivity: true,
    showAnnouncements: true,
  },
  system: {
    allowParentRegistration: false,
    autoApproveStaffLeaves: false,
    enableAuditLogs: true,
    maintenanceMode: false,
    sessionTimeoutMinutes: 60,
  },
  notifications: {
    emailNotifications: true,
    smsAlerts: true,
    pushNotifications: true,
    leaveAlerts: true,
    feeReminderAlerts: true,
  },
  roles: {
    allowTeacherGradeEdit: true,
    allowOfficeFeeWaiver: true,
    principalCanApproveLeaves: true,
  },
  features: {
    enableTransportModule: true,
    enableInventoryModule: true,
    enableOnlineFees: true,
    enableParentChat: true,
  },
};

const KEY = "sunshine_dev_settings";

/**
 * Ensures all logo properties in the settings object are synchronized to a single source of truth.
 */
export function synchronizeLogoFields(settings: DeveloperSettings, targetLogoUrl: string): DeveloperSettings {
  if (!targetLogoUrl) return settings;

  return {
    ...settings,
    branding: {
      ...settings.branding,
      schoolLogoUrl: targetLogoUrl,
      logoUrl: targetLogoUrl,
      headerLogoUrl: targetLogoUrl,
      sidebarLogoUrl: targetLogoUrl,
    },
    school: {
      ...settings.school,
      schoolLogoUrl: targetLogoUrl,
      logoUrl: targetLogoUrl,
    },
    loginPage: {
      ...settings.loginPage,
      schoolLogoUrl: targetLogoUrl,
      logoUrl: targetLogoUrl,
    },
    theme: {
      ...settings.theme,
      sidebarLogoUrl: targetLogoUrl,
    },
  };
}

export function applyDynamicHeadAndTheme(settings: DeveloperSettings) {
  if (typeof window === "undefined") return;
  try {
    const bTitle = settings.branding.browserTitle || settings.loginPage.title || "Sunshine Play School — Growvia";
    if (bTitle) {
      document.title = bTitle;
    }

    const favUrl = settings.branding.faviconUrl || settings.theme.faviconUrl || "/favicon.ico";
    let iconElem = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!iconElem) {
      iconElem = document.createElement("link");
      iconElem.rel = "icon";
      document.head.appendChild(iconElem);
    }
    iconElem.href = favUrl.includes("?") ? favUrl : `${favUrl}?v=${Date.now()}`;

    if (settings.theme.primaryColor) {
      document.documentElement.style.setProperty("--primary-color", settings.theme.primaryColor);
    }
  } catch {}
}

export function getDeveloperSettings(): DeveloperSettings {
  if (typeof window === "undefined") return DEFAULT_DEV_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_DEV_SETTINGS;
    const parsed = JSON.parse(raw);

    const mergedBranding: SystemBranding = {
      ...DEFAULT_DEV_SETTINGS.branding,
      ...(parsed.branding || {}),
    };

    const mergedLoginPage: LoginPageConfig = {
      ...DEFAULT_DEV_SETTINGS.loginPage,
      ...(parsed.loginPage || {}),
    };

    const mergedSchool: SchoolBranding = {
      ...DEFAULT_DEV_SETTINGS.school,
      ...(parsed.school || {}),
    };

    let merged: DeveloperSettings = {
      ...DEFAULT_DEV_SETTINGS,
      ...parsed,
      branding: mergedBranding,
      loginPage: mergedLoginPage,
      school: mergedSchool,
      theme: { ...DEFAULT_DEV_SETTINGS.theme, ...(parsed.theme || {}) },
      dashboards: { ...DEFAULT_DEV_SETTINGS.dashboards, ...(parsed.dashboards || {}) },
      system: { ...DEFAULT_DEV_SETTINGS.system, ...(parsed.system || {}) },
      notifications: { ...DEFAULT_DEV_SETTINGS.notifications, ...(parsed.notifications || {}) },
      roles: { ...DEFAULT_DEV_SETTINGS.roles, ...(parsed.roles || {}) },
      features: { ...DEFAULT_DEV_SETTINGS.features, ...(parsed.features || {}) },
    };

    // Purge legacy dark box dicebear shape URLs if cached
    if (mergedBranding.schoolLogoUrl?.includes("dicebear.com")) {
      mergedBranding.schoolLogoUrl = DEFAULT_SUNSHINE_LOGO;
      mergedBranding.sidebarLogoUrl = DEFAULT_SUNSHINE_LOGO;
      mergedBranding.logoUrl = DEFAULT_SUNSHINE_LOGO;
    }

    const logoUrl =
      merged.branding.schoolLogoUrl ||
      merged.school.schoolLogoUrl ||
      merged.school.logoUrl ||
      merged.loginPage.schoolLogoUrl ||
      merged.loginPage.logoUrl ||
      "";

    if (logoUrl) {
      merged = synchronizeLogoFields(merged, logoUrl);
    }

    applyDynamicHeadAndTheme(merged);
    return merged;
  } catch {
    return DEFAULT_DEV_SETTINGS;
  }
}

export async function uploadBase64DataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return dataUrl;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9\+\-]+);base64,(.+)$/);
  if (!match) return dataUrl;
  const mimeType = match[1];
  const base64Data = match[2];
  const ext = mimeType.split("/")[1]?.replace("+xml", "") || "png";
  const fileName = `logo_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `system_branding/${fileName}`;

  try {
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    const { error: uploadError } = await supabase.storage
      .from("system-assets")
      .upload(filePath, blob, { upsert: true, cacheControl: "3600", contentType: mimeType });

    if (!uploadError) {
      const { data } = supabase.storage.from("system-assets").getPublicUrl(filePath);
      if (data?.publicUrl) {
        return `${data.publicUrl}?v=${Date.now()}`;
      }
    }
  } catch (err) {
    console.warn("Base64 auto-upload notice:", err);
  }
  return dataUrl;
}

export async function saveDeveloperSettings(settings: DeveloperSettings): Promise<void> {
  if (typeof window === "undefined") return;

  let targetLogoUrl =
    settings.branding.schoolLogoUrl ||
    settings.school.schoolLogoUrl ||
    settings.school.logoUrl ||
    settings.loginPage.schoolLogoUrl ||
    settings.loginPage.logoUrl ||
    "";

  if (targetLogoUrl && targetLogoUrl.startsWith("data:image/")) {
    targetLogoUrl = await uploadBase64DataUrl(targetLogoUrl);
  }

  const syncedSettings = synchronizeLogoFields(settings, targetLogoUrl);

  const payload = {
    id: "PRIMARY",
    content: JSON.stringify(syncedSettings),
    school_name: syncedSettings.school.schoolName,
    school_logo_url: targetLogoUrl,
    header_logo: syncedSettings.branding.headerLogoUrl || targetLogoUrl,
    sidebar_logo: syncedSettings.branding.sidebarLogoUrl || targetLogoUrl,
    sidebar_logo_url: syncedSettings.branding.sidebarLogoUrl || targetLogoUrl,
    sidebar_school_name: syncedSettings.branding.sidebarSchoolName || syncedSettings.school.schoolName,
    login_logo: targetLogoUrl,
    login_bg: syncedSettings.loginPage.backgroundImage || syncedSettings.loginPage.bgImageUrl,
    favicon: syncedSettings.branding.faviconUrl,
    school_address: syncedSettings.school.address,
    phone: syncedSettings.school.phone,
    email: syncedSettings.school.email,
    website: syncedSettings.school.website,
    motto: syncedSettings.school.motto,
    office_hours: syncedSettings.school.officeHours,
    login_title: syncedSettings.loginPage.title,
    login_subtitle: syncedSettings.loginPage.subtitle || syncedSettings.loginPage.description,
    footer_text: syncedSettings.branding.footer,
    theme_color: syncedSettings.theme.primaryColor,
    report_header: syncedSettings.branding.reportHeader,
    receipt_header: syncedSettings.branding.receiptHeader,
    academic_year: syncedSettings.school.academicYear,
    project_name: syncedSettings.branding.projectName,
    project_logo: syncedSettings.branding.projectLogo,
    updated_at: new Date().toISOString(),
  };

  let isSaved = false;
  let saveErr = null;

  try {
    const { error } = await supabase.from("gv_system_settings").upsert([payload], { onConflict: "id" });
    if (!error) {
      isSaved = true;
    } else {
      saveErr = error.message;
    }
  } catch (err: any) {
    saveErr = err?.message;
  }

  if (!isSaved) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/system-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        isSaved = true;
        saveErr = null;
      }
    } catch (backendErr: any) {
      if (!saveErr) saveErr = backendErr?.message || "Failed to sync settings with backend server.";
    }
  }

  // Always update localStorage and apply dynamic theme so UI updates immediately
  try {
    localStorage.setItem(KEY, JSON.stringify(syncedSettings));
  } catch (err) {
    console.warn("localStorage save warning:", err);
  }

  applyDynamicHeadAndTheme(syncedSettings);
  window.dispatchEvent(new CustomEvent("sunshine-dev-settings", { detail: syncedSettings }));

  if (!isSaved && saveErr) {
    throw new Error(`Failed to persist settings to Supabase: ${saveErr}`);
  }
}

import { subscribeToRealtimeTable } from "./realtimeService";

export function subscribeToDeveloperSettingsRealtime(onUpdate: (settings: DeveloperSettings) => void): () => void {
  return subscribeToRealtimeTable({
    table: "gv_system_settings",
    onPayload: (payload: any) => {
      let remoteSettings: DeveloperSettings | null = null;
      if (payload?.new?.content) {
        try {
          remoteSettings = JSON.parse(payload.new.content) as DeveloperSettings;
        } catch {}
      }

      const logoUrl =
        payload?.new?.school_logo_url ||
        payload?.new?.sidebar_logo_url ||
        payload?.new?.header_logo ||
        payload?.new?.login_logo ||
        remoteSettings?.branding?.schoolLogoUrl;

      if (remoteSettings && logoUrl) {
        remoteSettings = synchronizeLogoFields(remoteSettings, logoUrl);
        try {
          localStorage.setItem(KEY, JSON.stringify(remoteSettings));
        } catch {}
        applyDynamicHeadAndTheme(remoteSettings);
        window.dispatchEvent(new CustomEvent("sunshine-dev-settings", { detail: remoteSettings }));
        onUpdate(remoteSettings);
      }
    },
  });
}

import { API_URL as BACKEND_URL } from "./api";

export async function uploadSystemAsset(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `asset_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `system_branding/${fileName}`;

  // 1. Convert file to Base64 for server-privileged upload
  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  // 2. Try server-privileged API upload endpoint
  try {
    const res = await fetch(`${BACKEND_URL}/api/storage/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        fileBase64,
        contentType: file.type || "image/png",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.publicUrl) {
        return `${data.publicUrl}?v=${Date.now()}`;
      }
    }
  } catch {}

  // 3. Fallback to direct client Supabase Storage upload
  try {
    const { error: uploadError } = await supabase.storage
      .from("system-assets")
      .upload(filePath, file, { upsert: true, cacheControl: "3600" });

    if (!uploadError) {
      const { data } = supabase.storage.from("system-assets").getPublicUrl(filePath);
      if (data?.publicUrl) {
        return `${data.publicUrl}?v=${Date.now()}`;
      }
    } else {
      console.warn("Direct Supabase Storage upload notice:", uploadError.message);
    }
  } catch (err) {
    console.warn("Supabase storage upload exception:", err);
  }

  // If storage upload is restricted by RLS or network, return base64 preview for immediate UI rendering & saving
  return fileBase64;
}

export function useDeveloperSettings() {
  const [settings, setSettings] = useState<DeveloperSettings>(getDeveloperSettings);

  useEffect(() => {
    const handleUpdate = () => {
      const current = getDeveloperSettings();
      setSettings(current);
    };

    window.addEventListener("sunshine-dev-settings", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    // Initial Supabase Sync: Primary DB row is authoritative
    supabase
      .from("gv_system_settings")
      .select("*")
      .eq("id", "PRIMARY")
      .maybeSingle()
      .then((res) => {
        if (res.data) {
          try {
            let parsedSettings: DeveloperSettings = res.data.content
              ? JSON.parse(res.data.content)
              : getDeveloperSettings();

            const dbLogoUrl =
              res.data.school_logo_url ||
              res.data.sidebar_logo_url ||
              res.data.header_logo ||
              res.data.login_logo ||
              parsedSettings.branding?.schoolLogoUrl;

            if (dbLogoUrl) {
              parsedSettings = synchronizeLogoFields(parsedSettings, dbLogoUrl);
            }

            try {
              localStorage.setItem(KEY, JSON.stringify(parsedSettings));
            } catch {}
            applyDynamicHeadAndTheme(parsedSettings);
            setSettings((prev) => (JSON.stringify(prev) === JSON.stringify(parsedSettings) ? prev : parsedSettings));
          } catch {}
        }
      });

    const unsubRealtime = subscribeToDeveloperSettingsRealtime((remoteSettings) => {
      setSettings((prev) => (JSON.stringify(prev) === JSON.stringify(remoteSettings) ? prev : remoteSettings));
    });

    return () => {
      window.removeEventListener("sunshine-dev-settings", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      unsubRealtime();
    };
  }, []);

  const updateSettings = async (newSettings: DeveloperSettings) => {
    try {
      await saveDeveloperSettings(newSettings);
      setSettings(getDeveloperSettings());
    } catch (err: any) {
      throw err;
    }
  };

  const resetToDefaults = async () => {
    try {
      await saveDeveloperSettings(DEFAULT_DEV_SETTINGS);
      setSettings(getDeveloperSettings());
    } catch (err: any) {
      throw err;
    }
  };

  return {
    settings,
    updateSettings,
    resetToDefaults,
  };
}
