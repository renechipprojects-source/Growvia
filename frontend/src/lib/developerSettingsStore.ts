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

export const DEFAULT_DEV_SETTINGS: DeveloperSettings = {
  branding: {
    schoolName: "Sunshine Play School",
    shortName: "Sunshine Play School",
    tagline: "Nurturing Little Minds with Love & Joy",
    footer: "© 2026 Sunshine Play School ERP. Powered by Growvia.",
    primaryColor: "#0f172a",
    accentColor: "#f59e0b",
    schoolLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    headerLogoUrl: "/renechip-logo.png",
    sidebarLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    sidebarSchoolName: "Sunshine Play School",
    sidebarTitle: "Sunshine Play School",
    browserTitle: "Sunshine Play School ERP",
    faviconUrl: "/favicon.ico",
    reportHeader: "Sunshine Play School — Official ERP Document",
    receiptHeader: "Sunshine Play School — Payment Receipt",
    projectName: "Growvia ERP",
    projectLogo: "/growvia-logo.png",
    project_logo: "/growvia-logo.png",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
  },
  loginPage: {
    title: "Sunshine Play School",
    subtitle: "Complete Play School ERP",
    description: "Welcome to Sunshine Play School ERP. Secure single portal access for Admin, Principal, Office, Teachers, and Parents.",
    schoolLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    bgImageUrl: "",
    backgroundImage: "",
    badgeText: "GROWVIA SCHOOL ERP v2.4",
    showAcademicSession: true,
    showFeaturesList: true,
  },
  school: {
    schoolName: "Sunshine Play School",
    schoolLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
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

  const urlWithCacheBuster = targetLogoUrl.includes("?") ? targetLogoUrl : `${targetLogoUrl}?v=${Date.now()}`;

  return {
    ...settings,
    branding: {
      ...settings.branding,
      schoolLogoUrl: urlWithCacheBuster,
      logoUrl: urlWithCacheBuster,
      headerLogoUrl: urlWithCacheBuster,
      sidebarLogoUrl: urlWithCacheBuster,
    },
    school: {
      ...settings.school,
      schoolLogoUrl: urlWithCacheBuster,
      logoUrl: urlWithCacheBuster,
    },
    loginPage: {
      ...settings.loginPage,
      schoolLogoUrl: urlWithCacheBuster,
      logoUrl: urlWithCacheBuster,
    },
    theme: {
      ...settings.theme,
      sidebarLogoUrl: urlWithCacheBuster,
    },
  };
}

export function applyDynamicHeadAndTheme(settings: DeveloperSettings) {
  if (typeof window === "undefined") return;
  try {
    const bTitle = settings.branding.browserTitle || settings.loginPage.title || "Sunshine Play School ERP";
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

export async function saveDeveloperSettings(settings: DeveloperSettings): Promise<void> {
  if (typeof window === "undefined") return;

  const targetLogoUrl =
    settings.branding.schoolLogoUrl ||
    settings.school.schoolLogoUrl ||
    settings.school.logoUrl ||
    settings.loginPage.schoolLogoUrl ||
    settings.loginPage.logoUrl ||
    "";

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

  // 1. Supabase persistence is the AUTHORITATIVE source of truth. Must succeed before localStorage/state update.
  const { error } = await supabase.from("gv_system_settings").upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to save settings to Supabase DB: ${error.message}`);
  }

  // 2. Update localStorage only after successful DB persistence
  try {
    localStorage.setItem(KEY, JSON.stringify(syncedSettings));
  } catch (err) {
    console.warn("localStorage save warning:", err);
  }

  applyDynamicHeadAndTheme(syncedSettings);
  window.dispatchEvent(new CustomEvent("sunshine-dev-settings", { detail: syncedSettings }));
}

export function subscribeToDeveloperSettingsRealtime(onUpdate: (settings: DeveloperSettings) => void): () => void {
  try {
    const channel = supabase
      .channel("system_settings_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "GV_system_settings" },
        (payload: any) => {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}

const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "https://growvia-backend-2u2p.onrender.com").replace(/\/$/, "");

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
  const { error: uploadError } = await supabase.storage
    .from("system-assets")
    .upload(filePath, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    throw new Error(`Logo upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("system-assets").getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL for uploaded logo.");
  }

  return `${data.publicUrl}?v=${Date.now()}`;
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
            setSettings(parsedSettings);
          } catch {}
        }
      });

    const unsubRealtime = subscribeToDeveloperSettingsRealtime((remoteSettings) => {
      setSettings(remoteSettings);
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
