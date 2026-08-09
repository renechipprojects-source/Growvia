import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, Upload, Save, Building2, MapPin, Phone, Mail, Clock, RefreshCw } from "lucide-react";
import { useDeveloperSettings, saveDeveloperSettings } from "@/lib/developerSettingsStore";
import { validateIndianMobile } from "@/lib/utils";
import { requireAuthGuard } from "@/lib/auth";

export const Route = createFileRoute("/admin/school-branding")({
  beforeLoad: () => {
    requireAuthGuard("super-admin");
  },
  head: () => ({
    meta: [
      { title: "School Branding & Login Settings — Admin Portal" },
      { name: "description", content: "Configure school identity, logo, login page branding, and contact details." },
    ],
  }),
  component: SchoolBrandingPage,
});

function SchoolBrandingPage() {
  const { settings } = useDeveloperSettings();
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(
    settings.branding.schoolLogoUrl || settings.school.schoolLogoUrl || ""
  );

  useEffect(() => {
    setForm({ ...settings });
    setLogoPreview(settings.branding.schoolLogoUrl || settings.school.schoolLogoUrl || "");
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type (images only)
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    // Validate file size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setForm((prev) => ({
        ...prev,
        branding: {
          ...prev.branding,
          schoolLogoUrl: dataUrl,
          logoUrl: dataUrl,
        },
        school: {
          ...prev.school,
          schoolLogoUrl: dataUrl,
          logoUrl: dataUrl,
        },
        loginPage: {
          ...prev.loginPage,
          schoolLogoUrl: dataUrl,
          logoUrl: dataUrl,
        },
      }));
      toast.success("New school logo selected. Click 'Save Branding Settings' to apply.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.school.schoolName.trim()) {
      toast.error("School Name is required.");
      return;
    }

    if (form.school.phone.trim()) {
      const phoneCheck = validateIndianMobile(form.school.phone);
      if (!phoneCheck.valid) {
        toast.error(phoneCheck.error || "Please enter a valid 10-digit school mobile number.");
        return;
      }
      form.school.phone = phoneCheck.formatted;
    }

    setSaving(true);
    try {
      await saveDeveloperSettings(form);
      toast.success("School branding & Login Page configuration saved successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Branding & Login Page Settings"
        subtitle="Manage authoritative school identity, logo, login page branding, and contact details."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: School Identity & Logo */}
        <SectionCard title="School Identity & Logo">
          <div className="grid md:grid-cols-12 gap-6 items-start">
            {/* Logo Preview & Upload Box */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-4">
              <div className="w-32 h-32 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-3 overflow-hidden">
                {logoPreview && !logoPreview.includes("data:image/svg") ? (
                  <img src={logoPreview} alt="School Logo Preview" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-semibold text-slate-700">School Logo</div>
                <div className="text-[11px] text-muted-foreground">PNG, JPG, SVG, or WebP (max 2MB)</div>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
                <Upload className="w-3.5 h-3.5" /> Upload New Logo
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* School Text Fields */}
            <div className="md:col-span-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>School Full Name</Label>
                  <Input
                    value={form.school.schoolName}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        school: { ...p.school, schoolName: e.target.value },
                        branding: { ...p.branding, schoolName: e.target.value },
                      }))
                    }
                    placeholder="e.g. Sunshine Play School"
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label>Academic Session</Label>
                  <Input
                    value={form.school.academicYear}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        school: { ...p.school, academicYear: e.target.value },
                      }))
                    }
                    placeholder="e.g. 2026-2027"
                    className="mt-1 bg-white"
                  />
                </div>
              </div>

              <div>
                <Label>School Motto / Tagline</Label>
                <Input
                  value={form.school.motto}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      school: { ...p.school, motto: e.target.value },
                      branding: { ...p.branding, tagline: e.target.value },
                    }))
                  }
                  placeholder="e.g. Play, Learn & Grow Together"
                  className="mt-1 bg-white"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Login Page Customization */}
        <SectionCard title="Login Page Branding">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Login Page Title</Label>
                <Input
                  value={form.loginPage.title}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      loginPage: { ...p.loginPage, title: e.target.value },
                    }))
                  }
                  placeholder="e.g. Sunshine Play School"
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label>Login Subtitle / Badge</Label>
                <Input
                  value={form.loginPage.subtitle}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      loginPage: { ...p.loginPage, subtitle: e.target.value },
                    }))
                  }
                  placeholder="e.g. Play School Operations"
                  className="mt-1 bg-white"
                />
              </div>
            </div>

            <div>
              <Label>Welcome Message / Description</Label>
              <Textarea
                value={form.loginPage.welcomeMessage || form.loginPage.description || ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    loginPage: { ...p.loginPage, welcomeMessage: e.target.value, description: e.target.value },
                  }))
                }
                rows={3}
                placeholder="Welcome text displayed on the login page..."
                className="mt-1 bg-white"
              />
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Contact & Campus Details */}
        <SectionCard title="School Contact Details">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Campus Address</Label>
              <Input
                value={form.school.address}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    school: { ...p.school, address: e.target.value },
                  }))
                }
                placeholder="123 Sunshine Lane, Playtown, India"
                className="mt-1 bg-white"
              />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input
                value={form.school.phone}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    school: { ...p.school, phone: e.target.value },
                  }))
                }
                placeholder="+91 98765 43210"
                className="mt-1 bg-white"
              />
            </div>

            <div>
              <Label>Official Email</Label>
              <Input
                type="email"
                value={form.school.email}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    school: { ...p.school, email: e.target.value },
                  }))
                }
                placeholder="contact@sunshineplayschool.edu"
                className="mt-1 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Office Operating Hours</Label>
              <Input
                value={form.school.officeHours}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    school: { ...p.school, officeHours: e.target.value },
                  }))
                }
                placeholder="8:00 AM - 4:00 PM (Mon - Sat)"
                className="mt-1 bg-white"
              />
            </div>
          </div>
        </SectionCard>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl px-6 py-2.5 shadow-lg"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving to Supabase..." : "Save Branding Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
