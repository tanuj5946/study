import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Palette, Bell, Shield, LogOut, Save, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  updateProfile,
  changePassword,
  deleteAccount,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/api";

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_notifications: true,
  study_reminders: true,
  weekly_digest: false,
  progress_alerts: true,
};

const NOTIFICATION_ITEMS: Array<{ key: keyof NotificationPreferences; label: string; sub: string }> = [
  { key: "email_notifications", label: "Email Notifications", sub: "Receive updates via email" },
  { key: "study_reminders", label: "Study Reminders", sub: "Get reminded about your study schedule" },
  { key: "weekly_digest", label: "Weekly Digest", sub: "Receive a weekly summary of your progress" },
  { key: "progress_alerts", label: "Progress Alerts", sub: "Get notified when you reach milestones" },
];

export function SettingsContent() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [saving, setSaving]           = useState(false);

  // password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // appearance
  const [theme, setTheme] = useState<string>(() =>
    typeof window !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  // notifications (local state only — no DB for these yet)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting]           = useState(false);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    const loadNotificationPreferences = async () => {
      setLoadingNotifications(true);

      try {
        const preferences = await getNotificationPreferences();
        if (!cancelled) {
          setNotificationPrefs(preferences);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      } finally {
        if (!cancelled) {
          setLoadingNotifications(false);
        }
      }
    };

    loadNotificationPreferences();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleThemeChange = (value: string) => {
    setTheme(value);
    document.documentElement.classList.toggle("dark", value === "dark");
    toast({ title: "Theme updated", description: `Switched to ${value} mode.` });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(displayName);
      toast({ title: "Profile saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast({ title: "New passwords don't match", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      toast({ title: "Password changed successfully" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setChangingPw(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      signOut();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      const updatedPreferences = await updateNotificationPreferences(notificationPrefs);
      setNotificationPrefs(updatedPreferences);
      toast({ title: "Notification preferences saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingNotifications(false);
    }
  };

  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email ?? "").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-secondary">
          <TabsTrigger value="profile"       className="gap-2 text-xs sm:text-sm"><User size={14} /> Profile</TabsTrigger>
          <TabsTrigger value="appearance"    className="gap-2 text-xs sm:text-sm"><Palette size={14} /> Appearance</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 text-xs sm:text-sm"><Bell size={14} /> Notifications</TabsTrigger>
          <TabsTrigger value="account"       className="gap-2 text-xs sm:text-sm"><Shield size={14} /> Account</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-secondary text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Alex Johnson" />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                <Save size={14} />{saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
            <Separator />
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
            <Separator />
            <div className="space-y-5">
              {NOTIFICATION_ITEMS.map((item, i, arr) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                    <Switch
                      checked={notificationPrefs[item.key]}
                      disabled={loadingNotifications || savingNotifications}
                      onCheckedChange={(value) => handleNotificationToggle(item.key, value)}
                    />
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground">
                {loadingNotifications ? "Loading your saved preferences..." : "Changes are saved to your account."}
              </p>
              <Button onClick={handleSaveNotifications} disabled={loadingNotifications || savingNotifications} className="gap-2">
                <Save size={14} />{savingNotifications ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="mt-6 space-y-6">

          {/* Change password */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
            <Separator />
            <div className="space-y-3 max-w-sm">
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPw} className="gap-2">
                <Shield size={14} />{changingPw ? "Saving..." : "Change Password"}
              </Button>
            </div>
          </div>

          {/* Sign out */}
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Session</h2>
            <Separator />
            <p className="text-sm text-muted-foreground">Sign out of your current session on this device.</p>
            <Button variant="destructive" onClick={() => signOut()} className="gap-2">
              <LogOut size={14} /> Sign Out
            </Button>
          </div>

          {/* Delete account */}
          <div className="rounded-lg border border-destructive/30 bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <Separator className="bg-destructive/20" />
            <p className="text-sm text-muted-foreground">Permanently delete your account and all data. This cannot be undone.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2"><Trash2 size={14} />Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, sessions, progress, and all data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <Label>Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                  <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Cancel</AlertDialogCancel>
                  <Button variant="destructive" disabled={deleteConfirm !== "DELETE" || deleting} onClick={handleDeleteAccount}>
                    {deleting ? "Deleting..." : "Delete My Account"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
