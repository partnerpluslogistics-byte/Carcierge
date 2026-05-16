import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ClipboardList, Plus, X } from "lucide-react";

const REQUEST_TYPES = [
  "Insurance Renewal",
  "Inspection Renewal",
  "New Insurance",
  "Registration Renewal",
  "Other",
] as const;

type RequestType = (typeof REQUEST_TYPES)[number];
type StatusType = "Pending" | "In Progress" | "Completed" | "Cancelled";

const statusColors: Record<StatusType, string> = {
  Pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  "In Progress": "bg-blue-500/15 text-blue-500 border-blue-500/30",
  Completed: "bg-green-500/15 text-green-600 border-green-500/30",
  Cancelled: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

export default function ServiceRequests() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  // Fetch data
  const myRequestsQuery = trpc.serviceRequests.listMine.useQuery();
  const allRequestsQuery = trpc.serviceRequests.listAll.useQuery(undefined, { enabled: isAdmin });
  const vehiclesQuery = trpc.vehicles.list.useQuery();

  // New request form state
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [reqType, setReqType] = useState<RequestType | "">("");
  const [reqVehicleId, setReqVehicleId] = useState<string>("");
  const [reqNotes, setReqNotes] = useState("");

  // Admin update state
  const [updateTarget, setUpdateTarget] = useState<number | null>(null);
  const [updateStatus, setUpdateStatus] = useState<StatusType>("Pending");
  const [updateAdminNotes, setUpdateAdminNotes] = useState("");

  // User edit state
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editType, setEditType] = useState<RequestType | "">("");
  const [editVehicleId, setEditVehicleId] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const updateMutation = trpc.serviceRequests.update.useMutation({
    onSuccess: () => {
      toast.success("Request updated");
      utils.serviceRequests.listMine.invalidate();
      if (isAdmin) utils.serviceRequests.listAll.invalidate();
      setEditTarget(null);
    },
    onError: (err) => toast.error(err.message || "Failed to update request"),
  });

  const createMutation = trpc.serviceRequests.create.useMutation({
    onSuccess: () => {
      utils.serviceRequests.listMine.invalidate();
      if (isAdmin) utils.serviceRequests.listAll.invalidate();
      toast.success("Service request submitted successfully.");
      setNewDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message || "Failed to submit request"),
  });

  const cancelMutation = trpc.serviceRequests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Request cancelled");
      utils.serviceRequests.listMine.invalidate();
      if (isAdmin) utils.serviceRequests.listAll.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to cancel request"),
  });

  const updateStatusMutation = trpc.serviceRequests.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Request updated");
      utils.serviceRequests.listAll.invalidate();
      utils.serviceRequests.listMine.invalidate();
      setUpdateTarget(null);
    },
    onError: (err) => toast.error(err.message || "Failed to update request"),
  });

  const resetForm = () => {
    setReqType(""); setReqVehicleId(""); setReqNotes("");
  };

  const handleCreate = () => {
    if (!reqType) { toast.error("Please select a request type"); return; }
    createMutation.mutate({
      requestType: reqType as RequestType,
      vehicleId: reqVehicleId ? parseInt(reqVehicleId) : undefined,
      notes: reqNotes || undefined,
    });
  };

  const openEdit = (req: any) => {
    setEditTarget(req);
    setEditType(req.requestType as RequestType);
    setEditVehicleId(req.vehicleId ? String(req.vehicleId) : "none");
    setEditNotes(req.notes ?? "");
  };

  const handleEdit = () => {
    if (!editTarget || !editType) return;
    const parsedVehicleId = editVehicleId && editVehicleId !== "none" ? parseInt(editVehicleId, 10) : null;
    updateMutation.mutate({
      id: editTarget.id,
      requestType: editType as RequestType,
      vehicleId: parsedVehicleId && !isNaN(parsedVehicleId) ? parsedVehicleId : null,
      notes: editNotes || null,
    });
  };

  const openAdminUpdate = (id: number, currentStatus: StatusType, currentAdminNotes: string | null) => {
    setUpdateTarget(id);
    setUpdateStatus(currentStatus);
    setUpdateAdminNotes(currentAdminNotes ?? "");
  };

  const handleAdminUpdate = () => {
    if (!updateTarget) return;
    updateStatusMutation.mutate({ id: updateTarget, status: updateStatus, adminNotes: updateAdminNotes || undefined });
  };

  const formatDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

  const vehicles = vehiclesQuery.data ?? [];

  const RequestTable = ({ requests, showUser = false }: {
    requests: Array<{
      id: number;
      requestType: RequestType;
      status: StatusType;
      notes: string | null;
      adminNotes: string | null;
      vehicleId: number | null;
      userId: number;
      createdAt: Date;
    }>;
    showUser?: boolean;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => {
          const vehicle = vehicles.find((v) => v.id === req.vehicleId);
          return (
            <TableRow key={req.id}>
              <TableCell className="font-medium">{req.requestType}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})` : req.vehicleId ? `#${req.vehicleId}` : "—"}
              </TableCell>
              <TableCell><StatusBadge status={req.status} /></TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                {req.notes || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatDate(req.createdAt)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAdminUpdate(req.id, req.status, req.adminNotes)}
                    >
                      Update
                    </Button>
                  )}
                  {!isAdmin && req.status === "Pending" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(req)}
                        title="Edit request"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => cancelMutation.mutate({ id: req.id })}
                        title="Cancel request"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {requests.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
              No service requests found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Service Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Manage all service requests from users." : "Submit and track your service requests."}
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      {/* Content */}
      {isAdmin ? (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="mine">My Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Service Requests</CardTitle>
                <CardDescription>{allRequestsQuery.data?.length ?? 0} total requests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {allRequestsQuery.isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : (
                  <RequestTable requests={(allRequestsQuery.data ?? []) as any} showUser />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="mine">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">My Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RequestTable requests={(myRequestsQuery.data ?? []) as any} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Service Requests</CardTitle>
            <CardDescription>{myRequestsQuery.data?.length ?? 0} requests submitted</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {myRequestsQuery.isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <RequestTable requests={(myRequestsQuery.data ?? []) as any} />
            )}
          </CardContent>
        </Card>
      )}

      {/* New Request Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={(open) => { if (!open) { setNewDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
            <DialogDescription>
              Submit a request for insurance renewal, inspection, or other services.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select value={reqType} onValueChange={(v) => setReqType(v as RequestType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service type…" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Related Vehicle (optional)</Label>
              <Select value={reqVehicleId} onValueChange={setReqVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle…" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.make} {v.model} — {v.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="req-notes">Notes (optional)</Label>
              <Textarea
                id="req-notes"
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                placeholder="Any additional details or instructions…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!reqType || createMutation.isPending}>
              {createMutation.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Edit Request Dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Request</DialogTitle>
            <DialogDescription>Update your request details. Only pending requests can be edited.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as RequestType)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {(["Insurance Renewal", "Inspection Renewal", "New Insurance", "Registration Renewal", "Other"] as RequestType[]).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle (optional)</Label>
              <Select value={editVehicleId} onValueChange={setEditVehicleId}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific vehicle</SelectItem>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.make} {v.model} ({v.plateNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Any additional details…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending || !editType}>
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Update Status Dialog */}
      <Dialog open={updateTarget !== null} onOpenChange={(open) => !open && setUpdateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
            <DialogDescription>Change the status and add admin notes for this request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateStatus} onValueChange={(v) => setUpdateStatus(v as StatusType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Pending", "In Progress", "Completed", "Cancelled"] as StatusType[]).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
              <Textarea
                id="admin-notes"
                value={updateAdminNotes}
                onChange={(e) => setUpdateAdminNotes(e.target.value)}
                placeholder="Internal notes visible to admin only…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateTarget(null)}>Cancel</Button>
            <Button onClick={handleAdminUpdate} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
