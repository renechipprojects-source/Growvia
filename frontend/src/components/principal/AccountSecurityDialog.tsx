import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Camera, Upload, X } from "lucide-react";
import {
  getPrincipalPassword, setPrincipalPassword,
  getPrincipalNotifPrefs, setPrincipalNotifPrefs,
  getPrincipalProfile, updatePrincipalProfile,
  type PrincipalNotifPrefs, type PrincipalProfile,
} from "@/lib/principal-profile";

export function AccountSecurityDialog({
  open, onOpenChange, initialTab = "profile",
}: { open: boolean; onOpenChange: (o: boolean) => void; initialTab?: "profile" | "password" | "notifications" }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [prefs, setPrefs] = useState<PrincipalNotifPrefs>(() => getPrincipalNotifPrefs());
  const [profile, setProfile] = useState<PrincipalProfile>(() => getPrincipalProfile());
  const [tab, setTab] = useState<"profile" | "password" | "notifications">(initialTab);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setProfile(getPrincipalProfile());
      setPrefs(getPrincipalNotifPrefs());
      setTab(initialTab);
      setPw({ current: "", next: "", confirm: "" });
    }
  }, [open, initialTab]);

  const changePassword = () => {
    if (!pw.current || !pw.next || !pw.confirm) return toast.error("All fields are required.");
    if (pw.current !== getPrincipalPassword()) return toast.error("Current password is incorrect.");
    if (pw.next.length < 6) return toast.error("Password must be at least 6 characters.");
    if (pw.next !== pw.confirm) return toast.error("New passwords do not match.");
    if (pw.next === pw.current) return toast.error("New password must differ from current.");
    setPrincipalPassword(pw.next);
    setPw({ current: "", next: "", confirm: "" });
    toast.success("Password updated");
  };

  const savePref = (patch: Partial<PrincipalNotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setPrincipalNotifPrefs(next);
  };

  const saveProfile = () => {
    if (!profile.name.trim()) return toast.error("Name is required.");
    if (!profile.email.trim()) return toast.error("Email is required.");
    updatePrincipalProfile(profile);
    toast.success("Profile updated");
  };

  const onPhoto = (file: File) => {
    if (file.size > 2 * 1024 * 1024) return toast.error("Photo must be under 2 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfile((p) => ({ ...p, photo: dataUrl }));
      updatePrincipalProfile({ photo: dataUrl });
      toast.success("Photo updated");
    };
    reader.readAsDataURL(file);
  };

  const initials = (profile.name || "P").split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
            <TabsTrigger value="password" className="flex-1">Password</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile.photo ? (
                  <img src={profile.photo} alt={profile.name}
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="h-20 w-20 rounded-full gradient-primary text-primary-foreground grid place-items-center text-xl font-semibold">
                    {initials}
                  </div>
                )}
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background hover:opacity-90"
                  aria-label="Change photo">
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden
                  onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload photo
                </Button>
                {profile.photo && (
                  <Button type="button" size="sm" variant="ghost"
                    onClick={() => { setProfile((p) => ({ ...p, photo: null })); updatePrincipalProfile({ photo: null }); }}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Full name</Label>
                <Input id="p-name" value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-des">Designation</Label>
                <Input id="p-des" value={profile.designation}
                  onChange={(e) => setProfile({ ...profile, designation: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-mob">Mobile</Label>
                <Input id="p-mob" value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" type="email" value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-addr">Address</Label>
                <Textarea id="p-addr" rows={2} value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" onClick={saveProfile}>Save Profile</Button>
          </TabsContent>

          <TabsContent value="password" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cur">Current password</Label>
              <Input id="cur" type="password" value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf">Confirm new password</Label>
              <Input id="conf" type="password" value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
            <Button className="w-full" onClick={changePassword}>Update Password</Button>
            <p className="text-[11px] text-muted-foreground">Demo password: <code>demo</code></p>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 space-y-2">
            <PrefRow title="Circulars" checked={prefs.circulars} onChange={(v) => savePref({ circulars: v })} />
            <PrefRow title="Attendance" checked={prefs.attendance} onChange={(v) => savePref({ attendance: v })} />
            <PrefRow title="Leave Requests" checked={prefs.leaves} onChange={(v) => savePref({ leaves: v })} />
            <PrefRow title="Events" checked={prefs.events} onChange={(v) => savePref({ events: v })} />
            <PrefRow title="Weekly Email Digest" checked={prefs.emailDigest} onChange={(v) => savePref({ emailDigest: v })} />
            <p className="text-[11px] text-muted-foreground pt-2">Changes save immediately.</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PrefRow({ title, checked, onChange }: { title: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="text-sm font-medium">{title}</div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
