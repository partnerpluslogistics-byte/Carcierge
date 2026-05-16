import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUserApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Pencil, Mail, Phone, Archive, ArchiveRestore } from "lucide-react";

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: "user" | "admin";
  createdAt: Date;
  lastSignedIn: Date;
  archivedAt: Date | null;
};

export default function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminUserApi.listAll,
  });

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editErrors, setEditErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  const [archiveTarget, setArchiveTarget] = useState<UserRow | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; email?: string; phoneNumber?: string }) =>
      adminUserApi.update(id, data),
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setEditTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to update user"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => adminUserApi.archive(id),
    onSuccess: () => {
      toast.success("Account archived");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setArchiveTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to archive account"),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => adminUserApi.unarchive(id),
    onSuccess: () => {
      toast.success("Account restored");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to restore account"),
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center text-muted-foreground">
            You do not have permission to access this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setEditName(u.name ?? "");
    setEditEmail(u.email ?? "");
    setEditPhone(u.phoneNumber ?? "");
    setEditErrors({});
  };

  const handleSave = () => {
    if (!editTarget) return;
    const errors: { name?: string; email?: string; phone?: string } = {};
    if (editName && editName.trim().length < 2) errors.name = "Name must be at least 2 characters.";
    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) errors.email = "Please enter a valid email address.";
    if (editPhone && editPhone.trim().length > 0 && !/^[+\d][\d\s\-().]{4,28}$/.test(editPhone)) errors.phone = "Please enter a valid phone number.";
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return; }
    setEditErrors({});
    updateMutation.mutate({
      id: editTarget.id,
      name: editName.trim() || undefined,
      email: editEmail.trim() || undefined,
      phoneNumber: editPhone.trim() || undefined,
    });
  };

  const formatDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

  const activeUsers = (allUsers ?? []).filter((u: UserRow) => !u.archivedAt);
  const archivedUsers = (allUsers ?? []).filter((u: UserRow) => !!u.archivedAt);

  const UserTable = ({ rows, showArchiveAction }: { rows: UserRow[]; showArchiveAction: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14 text-muted-foreground">#ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Last Sign-in</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((u) => (
          <TableRow key={u.id} className={u.archivedAt ? "opacity-60" : ""}>
            <TableCell className="text-xs font-mono text-muted-foreground">{u.id}</TableCell>
            <TableCell className="font-medium">
              {u.name || "—"}
              {u.archivedAt && (
                <Badge variant="outline" className="ml-2 text-xs text-muted-foreground">Archived</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
            <TableCell className="text-muted-foreground">{u.phoneNumber || "—"}</TableCell>
            <TableCell>
              <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{formatDate(u.lastSignedIn)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                {!u.archivedAt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(u)}
                    title="Edit user"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {showArchiveAction && !u.archivedAt && u.id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setArchiveTarget(u)}
                    title="Archive account"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
                {u.archivedAt && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unarchiveMutation.mutate(u.id)}
                    title="Restore account"
                    className="text-muted-foreground hover:text-primary"
                    disabled={unarchiveMutation.isPending}
                  >
                    <ArchiveRestore className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              No users found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> User Management
        </h1>
        <p className="text-muted-foreground mt-1">
          View, edit, and manage all registered user accounts.
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active <span className="ml-1.5 text-xs text-muted-foreground">({activeUsers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived <span className="ml-1.5 text-xs text-muted-foreground">({archivedUsers.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Users</CardTitle>
              <CardDescription>{activeUsers.length} active {activeUsers.length === 1 ? "account" : "accounts"}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <UserTable rows={activeUsers} showArchiveAction />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Archived Users</CardTitle>
              <CardDescription>
                Archived accounts are preserved but cannot sign in. Restore to re-enable access.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <UserTable rows={archivedUsers} showArchiveAction={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the name, email, or phone number for this account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => { setEditName(e.target.value); setEditErrors(p => ({ ...p, name: undefined })); }}
                placeholder="Full name"
                className={editErrors.name ? "border-destructive" : ""}
              />
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email Address
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => { setEditEmail(e.target.value); setEditErrors(p => ({ ...p, email: undefined })); }}
                placeholder="email@example.com"
                className={editErrors.email ? "border-destructive" : ""}
              />
              {editErrors.email && <p className="text-xs text-destructive">{editErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone Number
              </Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => { setEditPhone(e.target.value); setEditErrors(p => ({ ...p, phone: undefined })); }}
                placeholder="+1 555 000 0000"
                className={editErrors.phone ? "border-destructive" : ""}
              />
              {editErrors.phone && <p className="text-xs text-destructive">{editErrors.phone}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Account</DialogTitle>
            <DialogDescription>
              Archiving <strong>{archiveTarget?.name || archiveTarget?.email || "this user"}</strong> will
              prevent them from signing in. Their data will be preserved and the account can be restored at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={archiveMutation.isPending}
              onClick={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
            >
              {archiveMutation.isPending ? "Archiving…" : "Archive Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
