import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export interface SystemBranding {
  schoolName: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  motto: string;
  officeHours: string;
  footer: string;
  receiptHeader: string;
  reportHeader: string;
  projectName?: string;
  projectLogo?: string;
  project_name?: string;
  project_logo?: string;
  sidebarLogoUrl?: string;
  sidebarTitle?: string;
  erpName?: string;
  printFooter?: string;
  browserTitle?: string;
  copyright?: string;
}

export interface LoginPageConfig {
  title: string;
  description: string;
  welcomeMessage: string;
  logoUrl: string;
  bgImageUrl: string;
  schoolLogoUrl?: string;
}

export interface SystemThemeConfig {
  primaryColor: string;
  accentColor: string;
  sidebarLogoUrl: string;
  faviconUrl: string;
  fontFamily: string;
}

export interface DashboardControls {
  showCards: boolean;
  showCharts: boolean;
  showWidgets: boolean;
  showQuickActions: boolean;
  showAnnouncements: boolean;
  showStatistics: boolean;
}

export interface SystemSettingsConfig {
  schoolName: string;
  academicYear: string;
  workingDays: string;
  officeHours: string;
  feeCurrency: string;
  dateFormat: string;
  timeFormat: string;
  theme: string;
  appName: string;
}

export interface NotificationControls {
  realtimeEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  roleNotifications: boolean;
}

export interface RoleControls {
  roleVisibility: Record<string, boolean>;
  menuVisibility: Record<string, boolean>;
  sidebarItems: string[];
  permissions: Record<string, boolean>;
}

export interface FeatureToggles {
  transport: boolean;
  inventory: boolean;
  circulars: boolean;
  reports: boolean;
  promotions: boolean;
  attendance: boolean;
  notifications: boolean;
}

export interface SchoolSystemSettings {
  academicYear: string;
  receiptPrefix: string;
  schoolCode: string;
}

export interface DeveloperSettings {
  branding: SystemBranding;
  loginPage: LoginPageConfig;
  theme: SystemThemeConfig;
  dashboards: DashboardControls;
  system: SystemSettingsConfig;
  notifications: NotificationControls;
  roles: RoleControls;
  features: FeatureToggles;
  school: SchoolSystemSettings;
  systemVersion: string;
}

export const DEFAULT_DEV_SETTINGS: DeveloperSettings = {
  branding: {
    schoolName: "Sunshine Play School ERP",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    address: "123 Sunshine Lane, Education City, TN 600001",
    phone: "+91 98765 43210",
    email: "info@sunshineplayschool.edu",
    website: "https://sunshineplayschool.edu",
    motto: "Nurturing Little Minds for a Brighter Tomorrow",
    officeHours: "8:30 AM - 4:30 PM (Mon - Sat)",
    footer: "Renechip Private Limited\n© 2026 All Rights Reserved.",
    receiptHeader: "SUNSHINE PLAY SCHOOL — OFFICIAL FEE RECEIPT",
    reportHeader: "SUNSHINE PLAY SCHOOL — ENTERPRISE DATA REPORT",
    projectName: "Growvia",
    projectLogo: "/growvia-logo.png",
    project_name: "Growvia",
    project_logo: "/growvia-logo.png",
    sidebarLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    sidebarTitle: "Sunshine Play School",
    erpName: "Sunshine Play School ERP",
    printFooter: "Powered by Growvia ERP System",
    browserTitle: "Sunshine Play School ERP — Sign in",
    copyright: "© 2026 Sunshine Play School. All Rights Reserved.",
  },
  loginPage: {
    title: "Sunshine Play School ERP",
    description: "Enterprise Academic & Administrative Management Portal",
    welcomeMessage: "Welcome to Sunshine Play School ERP portal. Please log in with your credentials to access your dashboard.",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    bgImageUrl: "",
    schoolLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
  },
  theme: {
    primaryColor: "#f59e0b",
    accentColor: "#3b82f6",
    sidebarLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    faviconUrl: "/favicon.ico",
    fontFamily: "Plus Jakarta Sans",
  },
  dashboards: {
    showCards: true,
    showCharts: true,
    showWidgets: true,
    showQuickActions: true,
    showAnnouncements: true,
    showStatistics: true,
  },
  system: {
    schoolName: "Sunshine Play School ERP",
    academicYear: "2026-2027",
    workingDays: "Monday - Saturday",
    officeHours: "8:30 AM - 4:30 PM",
    feeCurrency: "INR (₹)",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12 Hour (AM/PM)",
    theme: "Light Theme",
    appName: "Sunshine ERP",
  },
  notifications: {
    realtimeEnabled: true,
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    roleNotifications: true,
  },
  roles: {
    roleVisibility: {
      "super-admin": true,
      principal: true,
      office: true,
      teacher: true,
      parent: true,
      developer: true,
    },
    menuVisibility: {
      admissions: true,
      fees: true,
      attendance: true,
      activities: true,
      reports: true,
    },
    sidebarItems: ["Dashboard", "Students", "Fees", "Attendance", "Activities", "Reports"],
    permissions: {
      canEditStudents: true,
      canCollectFees: true,
      canExportReports: true,
      canManageUsers: true,
    },
  },
  features: {
    transport: true,
    inventory: true,
    circulars: true,
    reports: true,
    promotions: true,
    attendance: true,
    notifications: true,
  },
  school: {
    academicYear: "2026-2027",
    receiptPrefix: "SUN/26-27/",
    schoolCode: "SUN-ERP-2026",
  },
  systemVersion: "v2.8.4-PROD",
};

const KEY = "sunshine.dev_settings.v3";

export function applyDynamicHeadAndTheme(settings: DeveloperSettings) {
  if (typeof window === "undefined") return;
  try {
    // Dynamic Browser Title
    const bTitle = settings.branding.browserTitle || settings.loginPage.title || "Sunshine Play School ERP";
    if (bTitle) {
      document.title = bTitle;
    }

    // Dynamic Favicon Update
    const favUrl = settings.theme.faviconUrl || "/favicon.ico";
    let iconElem = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!iconElem) {
      iconElem = document.createElement("link");
      iconElem.rel = "icon";
      document.head.appendChild(iconElem);
    }
    iconElem.href = favUrl.includes("?") ? favUrl : `${favUrl}?v=${Date.now()}`;

    // Dynamic Theme Color Injection
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
    const mergedBranding = { ...DEFAULT_DEV_SETTINGS.branding, ...parsed.branding };

    // Keep project aliases synchronized
    const projName = mergedBranding.projectName || mergedBranding.project_name || "Growvia";
    const projLogo = mergedBranding.projectLogo || mergedBranding.project_logo || "/growvia-logo.png";
    mergedBranding.projectName = projName;
    mergedBranding.project_name = projName;
    mergedBranding.projectLogo = projLogo;
    mergedBranding.project_logo = projLogo;

    const merged: DeveloperSettings = {
      ...DEFAULT_DEV_SETTINGS,
      ...parsed,
      branding: mergedBranding,
      loginPage: { ...DEFAULT_DEV_SETTINGS.loginPage, ...parsed.loginPage },
      theme: { ...DEFAULT_DEV_SETTINGS.theme, ...parsed.theme },
      dashboards: { ...DEFAULT_DEV_SETTINGS.dashboards, ...parsed.dashboards },
      system: { ...DEFAULT_DEV_SETTINGS.system, ...parsed.system },
      notifications: { ...DEFAULT_DEV_SETTINGS.notifications, ...parsed.notifications },
      roles: { ...DEFAULT_DEV_SETTINGS.roles, ...parsed.roles },
      features: { ...DEFAULT_DEV_SETTINGS.features, ...parsed.features },
      school: { ...DEFAULT_DEV_SETTINGS.school, ...parsed.school },
    };

    applyDynamicHeadAndTheme(merged);
    return merged;
  } catch {
    return DEFAULT_DEV_SETTINGS;
  }
}

export function saveDeveloperSettings(settings: DeveloperSettings) {
  if (typeof window === "undefined") return;
  try {
    const projName = settings.branding.projectName || settings.branding.project_name || "Growvia";
    const projLogo = settings.branding.projectLogo !== undefined ? settings.branding.projectLogo : (settings.branding.project_logo !== undefined ? settings.branding.project_logo : "/growvia-logo.png");

    settings.branding.projectName = projName;
    settings.branding.project_name = projName;
    settings.branding.projectLogo = projLogo;
    settings.branding.project_logo = projLogo;

    localStorage.setItem(KEY, JSON.stringify(settings));
    applyDynamicHeadAndTheme(settings);
    window.dispatchEvent(new CustomEvent("sunshine-dev-settings", { detail: settings }));

    // Async save to Supabase system_settings table
    Promise.resolve(
      supabase.from("system_settings").upsert({
        id: "PRIMARY",
        content: JSON.stringify(settings),
        school_name: settings.branding.schoolName,
        school_logo: settings.branding.logoUrl,
        school_address: settings.branding.address,
        phone: settings.branding.phone,
        email: settings.branding.email,
        website: settings.branding.website,
        motto: settings.branding.motto,
        office_hours: settings.branding.officeHours,
        login_title: settings.loginPage.title,
        login_subtitle: settings.loginPage.description,
        footer_text: settings.branding.footer,
        theme_color: settings.theme.primaryColor,
        favicon: settings.theme.faviconUrl,
        report_header: settings.branding.reportHeader,
        receipt_header: settings.branding.receiptHeader,
        academic_year: settings.school.academicYear,
        project_name: projName,
        project_logo: projLogo,
        updated_at: new Date().toISOString(),
      })
    ).catch(() => {});
  } catch {}
}

export function subscribeToDeveloperSettingsRealtime(onUpdate: (settings: DeveloperSettings) => void): () => void {
  try {
    const channel = supabase
      .channel("system_settings_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        (payload: any) => {
          if (payload?.new?.content) {
            try {
              const remote = JSON.parse(payload.new.content) as DeveloperSettings;
              saveDeveloperSettings(remote);
              onUpdate(remote);
            } catch {}
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

export async function uploadSystemAsset(file: File): Promise<string> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `asset_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `system_branding/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("system-assets")
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from("system-assets").getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch {}

  // Fallback to Data URL if Supabase storage bucket is not configured
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.readAsDataURL(file);
  });
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

    // Initial Supabase Sync & Realtime Subscription
    supabase
      .from("system_settings")
      .select("content")
      .eq("id", "PRIMARY")
      .maybeSingle()
      .then((res) => {
        if (res.data?.content) {
          try {
            const remoteSettings = JSON.parse(res.data.content) as DeveloperSettings;
            saveDeveloperSettings(remoteSettings);
            setSettings(remoteSettings);
          } catch {}
        }
      });

    const unsubscribe = subscribeToDeveloperSettingsRealtime((updated) => {
      setSettings(updated);
    });

    return () => {
      window.removeEventListener("sunshine-dev-settings", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      unsubscribe();
    };
  }, []);

  return {
    settings,
    updateSettings: (newSettings: Partial<DeveloperSettings>) => {
      const merged = {
        ...settings,
        ...newSettings,
        branding: { ...settings.branding, ...(newSettings.branding || {}) },
        loginPage: { ...settings.loginPage, ...(newSettings.loginPage || {}) },
        theme: { ...settings.theme, ...(newSettings.theme || {}) },
        dashboards: { ...settings.dashboards, ...(newSettings.dashboards || {}) },
        system: { ...settings.system, ...(newSettings.system || {}) },
        notifications: { ...settings.notifications, ...(newSettings.notifications || {}) },
        roles: { ...settings.roles, ...(newSettings.roles || {}) },
        features: { ...settings.features, ...(newSettings.features || {}) },
        school: { ...settings.school, ...(newSettings.school || {}) },
      };
      saveDeveloperSettings(merged);
      setSettings(merged);
    },
    resetToDefaults: () => {
      saveDeveloperSettings(DEFAULT_DEV_SETTINGS);
      setSettings(DEFAULT_DEV_SETTINGS);
    },
  };
}
