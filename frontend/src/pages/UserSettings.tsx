import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { User, Mail, Phone, Bell, Calendar, Shield, Trash2, FileText, Eye } from "lucide-react";
import { useLocation } from "wouter";

export default function UserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: userApi.getProfile,
  });

  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [notifyByPush, setNotifyByPush] = useState(false);
  const [notifyRegistration, setNotifyRegistration] = useState(true);
  const [notifyInsurance, setNotifyInsurance] = useState(true);
  const [notifyInspection, setNotifyInspection] = useState(true);
  const [profileDirty, setProfileDirty] = useState(false);
  const [notifDirty, setNotifDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setEmail(profile.email ?? "");
      setPhoneNumber(profile.phoneNumber ?? "");
      setNotifyByEmail(profile.notifyByEmail === 1 || profile.notifyByEmail === true);
      setNotifyByPush(profile.notifyByPush === 1 || profile.notifyByPush === true);
      setNotifyRegistration(profile.notifyRegistration !== 0 && profile.notifyRegistration !== false);
      setNotifyInsurance(profile.notifyInsurance !== 0 && profile.notifyInsurance !== false);
      setNotifyInspection(profile.notifyInspection !== 0 && profile.notifyInspection !== false);
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => userApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Contact details updated");
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      setProfileDirty(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to update profile"),
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => userApi.updateNotifications(data),
    onSuccess: () => {
      toast.success("Notification preferences saved");
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      setNotifDirty(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to update notifications"),
  });

  const [, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const deleteAccountMutation = useMutation({
    mutationFn: () => userApi.deleteAccount(),
    onSuccess: () => {
      toast.success("Your account has been deleted.");
      setDeleteDialogOpen(false);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setTimeout(() => setLocation("/"), 1000);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to delete account"),
  });

  const firstName = (user?.name ?? "").split(" ")[0] || "there";

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and notification preferences, {firstName}.
        </p>
      </div>

      {/* Account Information — read-only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account Information
          </CardTitle>
          <CardDescription>Your account details from sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</p>
              <p className="mt-1 font-medium">{profile?.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Role</p>
              <p className="mt-1 font-medium capitalize">{profile?.role || "user"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Member Since
              </p>
              <p className="mt-1 font-medium">{formatDate(profile?.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Shield className="h-3 w-3" /> Last Sign-in
              </p>
              <p className="mt-1 font-medium">{formatDate(profile?.lastSignedIn)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Contact Details
          </CardTitle>
          <CardDescription>Update your email address and phone number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-email">Email Address</Label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setProfileDirty(true); }}
              placeholder="your@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-phone" className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone Number
            </Label>
            <Input
              id="settings-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setProfileDirty(true); }}
              placeholder="+1 555 000 0000"
            />
          </div>
          <Button
            onClick={() =>
              updateProfileMutation.mutate({
                email: email || undefined,
                phoneNumber: phoneNumber || undefined,
              })
            }
            disabled={!profileDirty || updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? "Saving…" : "Save Contact Details"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how to receive alerts for expiring registrations, insurance, and inspections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Delivery channels */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Delivery Channels</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Renewal reminders and expiry alerts delivered to your inbox.
                  </p>
                </div>
                <Switch
                  checked={notifyByEmail}
                  onCheckedChange={(val) => { setNotifyByEmail(val); setNotifDirty(true); }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">In-App Notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Push alerts in the notification bell for critical and upcoming renewals.
                  </p>
                </div>
                <Switch
                  checked={notifyByPush}
                  onCheckedChange={(val) => { setNotifyByPush(val); setNotifDirty(true); }}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Alert types */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Alert Types</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-400" />
                    Registration Expiry
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Alerts when your vehicle registration is about to expire.
                  </p>
                </div>
                <Switch
                  checked={notifyRegistration}
                  onCheckedChange={(val) => { setNotifyRegistration(val); setNotifDirty(true); }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-green-400" />
                    Insurance Expiry
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Alerts when your insurance policy is nearing its end date.
                  </p>
                </div>
                <Switch
                  checked={notifyInsurance}
                  onCheckedChange={(val) => { setNotifyInsurance(val); setNotifDirty(true); }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-yellow-400" />
                    Inspection Expiry
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Alerts when your vehicle inspection is due for renewal.
                  </p>
                </div>
                <Switch
                  checked={notifyInspection}
                  onCheckedChange={(val) => { setNotifyInspection(val); setNotifDirty(true); }}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={() =>
              updateNotificationsMutation.mutate({
                notifyByEmail,
                notifyByPush,
                notifyRegistration,
                notifyInsurance,
                notifyInspection,
              })
            }
            disabled={!notifDirty || updateNotificationsMutation.isPending}
          >
            {updateNotificationsMutation.isPending ? "Saving…" : "Save Notification Preferences"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone — Delete Account */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => { setDeleteConfirmText(""); setDeleteDialogOpen(true); }}
          >
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your vehicles, registrations, insurance
              policies, inspections, and service requests. This action <strong>cannot be undone</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              To confirm, type <span className="font-mono font-bold text-foreground">DELETE</span> in the box below.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className={deleteConfirmText === "DELETE" ? "border-destructive" : ""}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
              onClick={() => deleteAccountMutation.mutate()}
            >
              {deleteAccountMutation.isPending ? "Deleting…" : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
