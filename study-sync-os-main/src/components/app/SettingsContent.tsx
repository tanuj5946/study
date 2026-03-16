import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Palette, Bell, Shield, LogOut, Save, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function SettingsContent() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Appearance
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [studyReminders, setStudyReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [progressAlerts, setProgressAlerts] = useState(true);

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio")
        .eq("id", user.id)
        .single();
      if (data) {
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
      }
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [user]);

  const handleThemeChange = (value: string) => {
    setTheme(value);
    if (value === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast({ title: "Theme updated", description: `Switched to ${value} mode.` });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, bio })
        .eq("id", user.id);
      if (error) throw error;
      // Also update auth metadata for display_name
      await supabase.auth.updateUser({ data: { display_name: displayName } });
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Email sent", description: "Check your inbox for a password reset link." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;
      await signOut();
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  const initials = (() => {
    if (displayName) return displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    return (user?.email || "").slice(0, 2).toUpperCase();
  })();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-secondary">
          <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm">
            <User size={14} /> Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 text-xs sm:text-sm">
            <Palette size={14} /> Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 text-xs sm:text-sm">
            <Bell size={14} /> Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2 text-xs sm:text-sm">
            <Shield size={14} /> Account
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
                {loadingProfile ? "…" : initials}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-secondary text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Computer Science student at MIT, focused on algorithms and distributed systems."
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                <Save size={14} />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Choose between light and dark mode.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
            <Separator />
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Study Reminders</p>
                  <p className="text-xs text-muted-foreground">Get reminded about your study schedule</p>
                </div>
                <Switch checked={studyReminders} onCheckedChange={setStudyReminders} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Weekly Digest</p>
                  <p className="text-xs text-muted-foreground">Receive a weekly summary of your progress</p>
                </div>
                <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Progress Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when you reach milestones</p>
                </div>
                <Switch checked={progressAlerts} onCheckedChange={setProgressAlerts} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="mt-6 space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Security</h2>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Reset your password via email. You'll receive a link to set a new password.
              </p>
              <Button variant="outline" onClick={handleResetPassword} className="gap-2">
                <Shield size={14} />
                Reset Password
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Session</h2>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sign out of your current session on this device.
              </p>
              <Button variant="destructive" onClick={() => signOut()} className="gap-2">
                <LogOut size={14} />
                Sign Out
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            <Separator className="bg-destructive/20" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 size={14} />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account, study sessions, progress, and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="deleteConfirm">Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                    <Input
                      id="deleteConfirm"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="DELETE"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirm("")}>Cancel</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      disabled={deleteConfirm !== "DELETE" || deleting}
                      onClick={handleDeleteAccount}
                    >
                      {deleting ? "Deleting..." : "Delete My Account"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
