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
}

export interface LoginPageConfig {
  title: string;
  description: string;
  welcomeMessage: string;
  logoUrl: string;
  bgImageUrl: string;
}

export interface SystemThemeConfig {
  primaryColor: string;
  accentColor: string;
  sidebarLogoUrl: string;
  faviconUrl: string;
  fontFamily: string;
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
  features: FeatureToggles;
  school: SchoolSystemSettings;
  systemVersion: string;
}

export const DEFAULT_DEV_SETTINGS: DeveloperSettings = {
  branding: {
    schoolName: "Sunshine Play School",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    address: "123 Sunshine Lane, Education City, TN 600001",
    phone: "+91 98765 43210",
    email: "info@sunshineplayschool.edu",
    website: "https://sunshineplayschool.edu",
    motto: "Nurturing Little Minds for a Brighter Tomorrow",
  },
  loginPage: {
    title: "Sunshine Play School ERP",
    description: "Enterprise Academic & Administrative Management Portal",
    welcomeMessage: "Welcome back! Please login with your institutional credentials.",
    logoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    bgImageUrl: "",
  },
  theme: {
    primaryColor: "#f59e0b",
    accentColor: "#3b82f6",
    sidebarLogoUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=SunshineLogo",
    faviconUrl: "/favicon.ico",
    fontFamily: "Plus Jakarta Sans",
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

const KEY = "sunshine.dev_settings.v2";

export function getDeveloperSettings(): DeveloperSettings {
  if (typeof window === "undefined") return DEFAULT_DEV_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_DEV_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DEV_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_DEV_SETTINGS;
  }
}

export function saveDeveloperSettings(settings: DeveloperSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("sunshine-dev-settings", { detail: settings }));

    // Async save to Supabase system_settings table
    Promise.resolve(
      supabase.from("system_settings").upsert({
        id: "PRIMARY",
        content: JSON.stringify(settings),
        updated_at: new Date().toISOString(),
      })
    ).catch(() => {});
  } catch {}
}

export function useDeveloperSettings() {
  const [settings, setSettings] = useState<DeveloperSettings>(getDeveloperSettings);

  useEffect(() => {
    const handleUpdate = () => setSettings(getDeveloperSettings());
    window.addEventListener("sunshine-dev-settings", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("sunshine-dev-settings", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return {
    settings,
    updateSettings: (newSettings: Partial<DeveloperSettings>) => {
      const merged = { ...settings, ...newSettings };
      saveDeveloperSettings(merged);
    },
    resetToDefaults: () => {
      saveDeveloperSettings(DEFAULT_DEV_SETTINGS);
    },
  };
}
