import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { requireAuthGuard, signOut } from "@/lib/auth";
import {
  useDeveloperSettings,
  DEFAULT_DEV_SETTINGS,
  uploadSystemAsset,
  type DeveloperSettings,
} from "@/lib/developerSettingsStore";
import { getAuditLogs } from "@/lib/auditLogStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Code2, Building2, Layout, Palette, ToggleLeft, Settings, Database,
  Save, RotateCcw, Download, Upload, LogOut, ShieldCheck, Activity,
  Bell, Lock, Image as ImageIcon, Sparkles, RefreshCw, FileText, CheckCircle2
} from "lucide-react";

export const Route = createFileRoute("/developer-console")({
  beforeLoad: () => {
    requireAuthGuard("developer");
  },
  component: DeveloperConsolePage,
});

function DeveloperConsolePage() {
  const navigate = useNavigate();
  const { settings, updateSettings, resetToDefaults } = useDeveloperSettings();

  const [draft, setDraft] = useState<DeveloperSettings>(settings);
  const [logs] = useState(getAuditLogs());
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(draft);
    toast.success("Developer Console Settings saved to Supabase & updated across ERP in real-time!");
  };

  const handleReset = () => {
    resetToDefaults();
    setDraft(DEFAULT_DEV_SETTINGS);
    toast.info("Settings reset to factory production defaults.");
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldSetter: (url: string) => void,
    fieldName: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(fieldName);
    try {
      const url = await uploadSystemAsset(file);
      fieldSetter(url);
      toast.success(`${fieldName} uploaded successfully!`);
    } catch {
      toast.error(`Failed to upload ${fieldName}`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleBackupExport = () => {
    const jsonStr = JSON.stringify(draft, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sunshine-erp-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success("System configuration exported as JSON backup.");
  };

  const handleRestoreImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        updateSettings(parsed);
        setDraft(parsed);
        toast.success("System settings restored successfully.");
      } catch {
        toast.error("Invalid configuration backup JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Code2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-white">Developer Command Console</h1>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                CONFIDENTIAL · DEV ACCESS ONLY
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1">
                <Activity className="h-3 w-3 animate-pulse" /> LIVE SUPABASE REALTIME
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Central Configuration Engine · Real-time Dynamic Updates Across ERP
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Defaults
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-lg shadow-amber-500/20"
          >
            <Save className="h-4 w-4 mr-1.5" /> Save All & Sync Realtime
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="text-slate-400 hover:text-white hover:bg-slate-900"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="login" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl grid grid-cols-2 md:grid-cols-6 gap-1">
          <TabsTrigger value="login" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs font-semibold py-2">
            <Layout className="h-3.5 w-3.5 mr-1.5" /> Login Page
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs font-semibold py-2">
            <Palette className="h-3.5 w-3.5 mr-1.5" /> Branding & Head
          </TabsTrigger>
          <TabsTrigger value="dashboards" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs font-semibold py-2">
            <Building2 className="h-3.5 w-3.5 mr-1.5" /> Dashboards
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs font-semibold py-2">
            <Settings className="h-3.5 w-3.5 mr-1.5" /> System Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs font-semibold py-2">
            <Bell className="h-3.5 w-3.5 mr-1.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 text-xs font-semibold py-2">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* 1. LOGIN PAGE MANAGEMENT */}
        <TabsContent value="login" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" /> Login Page Live Configuration
              </h2>
              <span className="text-xs text-slate-400">Updates / index route in real-time</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Login Page Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft.loginPage.logoUrl}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        loginPage: { ...draft.loginPage, logoUrl: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md border border-slate-700 shrink-0">
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadingField === "Login Logo" ? "..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) =>
                            setDraft({
                              ...draft,
                              loginPage: { ...draft.loginPage, logoUrl: url },
                            }),
                          "Login Logo"
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Login Page Background Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft.loginPage.backgroundImage || draft.loginPage.bgImageUrl || ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        loginPage: { ...draft.loginPage, backgroundImage: e.target.value, bgImageUrl: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md border border-slate-700 shrink-0">
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadingField === "Login Background" ? "..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) =>
                            setDraft({
                              ...draft,
                              loginPage: { ...draft.loginPage, backgroundImage: url, bgImageUrl: url },
                            }),
                          "Login Background"
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs text-slate-300">Welcome Message</Label>
                <Textarea
                  value={draft.loginPage.welcomeMessage}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      loginPage: { ...draft.loginPage, welcomeMessage: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white h-20"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs text-slate-300">Login Page Subtitle</Label>
                <Input
                  value={draft.loginPage.subtitle || draft.loginPage.description || ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      loginPage: { ...draft.loginPage, subtitle: e.target.value, description: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 2. BRANDING & HEAD */}
        <TabsContent value="branding" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-400" /> Application & Head Branding
              </h2>
              <span className="text-xs text-slate-400">Independent header, sidebar, favicon & project assets</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Application Header Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft.branding.headerLogoUrl}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        branding: { ...draft.branding, headerLogoUrl: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md border border-slate-700 shrink-0">
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadingField === "Header Logo" ? "..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) =>
                            setDraft({
                              ...draft,
                              branding: { ...draft.branding, headerLogoUrl: url },
                            }),
                          "Header Logo"
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Sidebar Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft.branding.sidebarLogoUrl}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        branding: { ...draft.branding, sidebarLogoUrl: e.target.value },
                        theme: { ...draft.theme, sidebarLogoUrl: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md border border-slate-700 shrink-0">
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadingField === "Sidebar Logo" ? "..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) =>
                            setDraft({
                              ...draft,
                              branding: { ...draft.branding, sidebarLogoUrl: url },
                              theme: { ...draft.theme, sidebarLogoUrl: url },
                            }),
                          "Sidebar Logo"
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Browser Favicon URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft.branding.faviconUrl || draft.theme.faviconUrl}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        branding: { ...draft.branding, faviconUrl: e.target.value },
                        theme: { ...draft.theme, faviconUrl: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md border border-slate-700 shrink-0">
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadingField === "Favicon" ? "..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*,.ico"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) =>
                            setDraft({
                              ...draft,
                              branding: { ...draft.branding, faviconUrl: url },
                              theme: { ...draft.theme, faviconUrl: url },
                            }),
                          "Favicon"
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Project / Developer Name (Growvia)</Label>
                <Input
                  value={draft.branding.projectName || "Growvia"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: {
                        ...draft.branding,
                        projectName: e.target.value,
                        project_name: e.target.value,
                      },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Project Logo URL (Growvia Logo)</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft.branding.projectLogo || "/growvia-logo.png"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        branding: {
                          ...draft.branding,
                          projectLogo: e.target.value,
                          project_logo: e.target.value,
                        },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                  <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md border border-slate-700 shrink-0">
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploadingField === "Project Logo" ? "..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) =>
                            setDraft({
                              ...draft,
                              branding: {
                                ...draft.branding,
                                projectLogo: url,
                                project_logo: url,
                              },
                            }),
                          "Project Logo"
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Browser Window Title</Label>
                <Input
                  value={draft.branding.browserTitle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, browserTitle: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Sidebar Title</Label>
                <Input
                  value={draft.branding.sidebarTitle || draft.branding.schoolName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, sidebarTitle: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">ERP Application Name</Label>
                <Input
                  value={draft.branding.erpName || draft.system.appName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, erpName: e.target.value },
                      system: { ...draft.system, appName: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Fee Receipt Header Text</Label>
                <Input
                  value={draft.branding.receiptHeader}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, receiptHeader: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Data Report Header Text</Label>
                <Input
                  value={draft.branding.reportHeader}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, reportHeader: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Primary Theme Color Accent</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    value={draft.theme.primaryColor}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        theme: { ...draft.theme, primaryColor: e.target.value },
                      })
                    }
                    className="w-12 h-10 p-1 bg-slate-950 border-slate-800 cursor-pointer rounded-lg"
                  />
                  <Input
                    value={draft.theme.primaryColor}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        theme: { ...draft.theme, primaryColor: e.target.value },
                      })
                    }
                    className="bg-slate-950 border-slate-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Print Footer Text</Label>
                <Input
                  value={draft.branding.printFooter || "Powered by Growvia ERP"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, printFooter: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. DASHBOARD SETTINGS */}
        <TabsContent value="dashboards" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" /> Dashboard Module Visibility Toggles
              </h2>
              <span className="text-xs text-slate-400">Instantly controls layout elements across roles</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Summary Cards</div>
                  <div className="text-xs text-slate-400">KPI metric counters & cards</div>
                </div>
                <Switch
                  checked={draft.dashboards.showCards}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      dashboards: { ...draft.dashboards, showCards: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Charts & Analytics</div>
                  <div className="text-xs text-slate-400">Bar charts, fee trends & graphs</div>
                </div>
                <Switch
                  checked={draft.dashboards.showCharts}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      dashboards: { ...draft.dashboards, showCharts: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Widgets & Tables</div>
                  <div className="text-xs text-slate-400">Recent activities & quick data grids</div>
                </div>
                <Switch
                  checked={draft.dashboards.showWidgets}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      dashboards: { ...draft.dashboards, showWidgets: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Quick Action Buttons</div>
                  <div className="text-xs text-slate-400">Shortcuts to common operations</div>
                </div>
                <Switch
                  checked={draft.dashboards.showQuickActions}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      dashboards: { ...draft.dashboards, showQuickActions: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Announcements Board</div>
                  <div className="text-xs text-slate-400">Live circulars & notice board</div>
                </div>
                <Switch
                  checked={draft.dashboards.showAnnouncements}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      dashboards: { ...draft.dashboards, showAnnouncements: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Statistics Stream</div>
                  <div className="text-xs text-slate-400">Attendance & financial stats stream</div>
                </div>
                <Switch
                  checked={draft.dashboards.showStatistics}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      dashboards: { ...draft.dashboards, showStatistics: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. SYSTEM SETTINGS */}
        <TabsContent value="system" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-400" /> Core System Specifications
              </h2>
              <span className="text-xs text-slate-400">Academic year, currency, working hours & formats</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Active Academic Year</Label>
                <Input
                  value={draft.system.academicYear}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      system: { ...draft.system, academicYear: e.target.value },
                      school: { ...draft.school, academicYear: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Working Days</Label>
                <Input
                  value={draft.system.workingDays}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      system: { ...draft.system, workingDays: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Office Hours</Label>
                <Input
                  value={draft.system.officeHours}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      system: { ...draft.system, officeHours: e.target.value },
                      branding: { ...draft.branding, officeHours: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Fee Currency</Label>
                <Input
                  value={draft.system.feeCurrency}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      system: { ...draft.system, feeCurrency: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Date Format</Label>
                <Input
                  value={draft.system.dateFormat}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      system: { ...draft.system, dateFormat: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Time Format</Label>
                <Input
                  value={draft.system.timeFormat}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      system: { ...draft.system, timeFormat: e.target.value },
                    })
                  }
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-400" /> Notification Channels & Delivery Controls
              </h2>
              <span className="text-xs text-slate-400">Enable or disable communication gateways</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Supabase Realtime</div>
                  <div className="text-xs text-slate-400">Postgres live change streaming</div>
                </div>
                <Switch
                  checked={draft.notifications.realtimeEnabled}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      notifications: { ...draft.notifications, realtimeEnabled: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Email Dispatch</div>
                  <div className="text-xs text-slate-400">Automated fee receipts & circulars</div>
                </div>
                <Switch
                  checked={draft.notifications.emailEnabled}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      notifications: { ...draft.notifications, emailEnabled: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Web Push Alerts</div>
                  <div className="text-xs text-slate-400">Browser push notification alerts</div>
                </div>
                <Switch
                  checked={draft.notifications.pushEnabled}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      notifications: { ...draft.notifications, pushEnabled: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">SMS Gateway</div>
                  <div className="text-xs text-slate-400">Cellular SMS notification dispatch</div>
                </div>
                <Switch
                  checked={draft.notifications.smsEnabled}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      notifications: { ...draft.notifications, smsEnabled: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="text-sm font-medium text-white">Role-based Messaging</div>
                  <div className="text-xs text-slate-400">Targeted broadcast channels</div>
                </div>
                <Switch
                  checked={draft.notifications.roleNotifications}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      notifications: { ...draft.notifications, roleNotifications: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 6. ROLES & PERMISSIONS */}
        <TabsContent value="roles" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" /> Role & Permission Controls
              </h2>
              <span className="text-xs text-slate-400">Manage accessibility without source code modifications</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(draft.roles.permissions).map(([permKey, isAllowed]) => (
                <div key={permKey} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-sm font-medium text-white capitalize">{permKey.replace(/([A-Z])/g, " $1")}</div>
                    <div className="text-xs text-slate-400">RBAC permission switch</div>
                  </div>
                  <Switch
                    checked={isAllowed}
                    onCheckedChange={(checked) =>
                      setDraft({
                        ...draft,
                        roles: {
                          ...draft.roles,
                          permissions: { ...draft.roles.permissions, [permKey]: checked },
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Backup & System Health Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-400" /> System Backup, Restore & Configuration JSON
          </h2>
          <span className="text-xs text-slate-400 font-mono">ID: PRIMARY</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackupExport}
            className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-1.5" /> Export Configuration JSON
          </Button>

          <label className="cursor-pointer inline-flex items-center px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-md border border-slate-800">
            <Upload className="h-4 w-4 mr-1.5" /> Restore from JSON
            <input type="file" accept=".json" className="hidden" onChange={handleRestoreImport} />
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" /> Sync All Changes to Supabase
          </Button>
        </div>
      </div>
    </div>
  );
}
