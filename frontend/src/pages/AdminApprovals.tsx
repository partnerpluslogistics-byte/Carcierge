import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankTransferApi, subscriptionApi } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, CreditCard, Car, User, AlertCircle, Banknote } from "lucide-react";

// Derive a human-readable status from the bankTransfer flags
function getTransferStatus(t: any): string {
  if (t.rejectedAt) return "rejected";
  if (t.approvedByAdmin === 1) return "approved";
  if (t.confirmedByUser === 1) return "payment_confirmed";
  return "pending_payment";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_payment: { label: "Pending Payment", variant: "secondary" },
    payment_confirmed: { label: "Payment Confirmed", variant: "default" },
    approved: { label: "Approved", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
    active: { label: "Active", variant: "default" },
    pending_approval: { label: "Pending Approval", variant: "secondary" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  whish: "Whish Money (Lebanon)",
  omt: "OMT Transfer (Lebanon)",
  payment_link: "Payment Link",
};

export default function AdminApprovals() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [approveDialog, setApproveDialog] = useState<{ open: boolean; transferId: number | null }>({ open: false, transferId: null });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; transferId: number | null }>({ open: false, transferId: null });
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data: allPendingTransfers = [], refetch: refetchTransfers } = useQuery({
    queryKey: ["admin", "bank-transfers", "pending"],
    queryFn: bankTransferApi.getPending,
  });

  const { data: allSubscriptions = [], refetch: refetchSubs } = useQuery({
    queryKey: ["admin", "subscriptions", "all"],
    queryFn: subscriptionApi.listAll,
  });

  const approveMutation = useMutation({
    mutationFn: ({ transferId, adminNotes }: { transferId: number; adminNotes?: string }) =>
      bankTransferApi.approve(transferId, adminNotes),
    onSuccess: () => {
      toast.success("Payment approved and vehicle activated!");
      setApproveDialog({ open: false, transferId: null });
      setAdminNotes("");
      refetchTransfers();
      refetchSubs();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to approve payment"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ transferId, reason }: { transferId: number; reason: string }) =>
      bankTransferApi.reject(transferId, reason),
    onSuccess: () => {
      toast.success("Payment rejected.");
      setRejectDialog({ open: false, transferId: null });
      setRejectReason("");
      refetchTransfers();
      refetchSubs();
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || err.message || "Failed to reject payment"),
  });

  if (!user) return null;
  if (user.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  // Split by confirmedByUser flag
  const pendingConfirmed = (allPendingTransfers as any[]).filter((t) => t.confirmedByUser === 1);
  const pendingUnconfirmed = (allPendingTransfers as any[]).filter((t) => t.confirmedByUser === 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending bank transfer payments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingConfirmed.length}</p>
              <p className="text-sm text-muted-foreground">Awaiting Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingUnconfirmed.length}</p>
              <p className="text-sm text-muted-foreground">Awaiting User Confirmation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(allSubscriptions as any[]).filter((s) => s.status === "active").length}</p>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="awaiting">
        <TabsList>
          <TabsTrigger value="awaiting">
            Awaiting Approval
            {pendingConfirmed.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingConfirmed.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unconfirmed">
            User Pending Confirmation
            {pendingUnconfirmed.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingUnconfirmed.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="subscriptions">All Subscriptions</TabsTrigger>
        </TabsList>

        {/* Awaiting Admin Approval */}
        <TabsContent value="awaiting" className="space-y-4 mt-4">
          {pendingConfirmed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p>No payments awaiting approval</p>
              </CardContent>
            </Card>
          ) : (
            pendingConfirmed.map((transfer: any) => (
              <Card key={transfer.id} className="border-amber-500/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Transfer #{transfer.id} — ${transfer.amount}
                    </CardTitle>
                    <StatusBadge status={getTransferStatus(transfer)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Payment Type</p>
                      <p className="font-medium capitalize">{transfer.paymentType?.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">User</p>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {transfer.userName || `User #${transfer.userId}`}
                      </p>
                    </div>
                    {transfer.paymentMethod && (
                      <div>
                        <p className="text-muted-foreground">Payment Method</p>
                        <p className="font-medium flex items-center gap-1">
                          <Banknote className="h-3 w-3" />
                          {PAYMENT_METHOD_LABELS[transfer.paymentMethod] ?? transfer.paymentMethod}
                        </p>
                      </div>
                    )}
                    {transfer.vehicleId && (
                      <div>
                        <p className="text-muted-foreground">Vehicle</p>
                        <p className="font-medium flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          #{transfer.vehicleId}
                        </p>
                      </div>
                    )}
                    {transfer.serviceRequestId && (
                      <div>
                        <p className="text-muted-foreground">Service Request</p>
                        <p className="font-medium">#{transfer.serviceRequestId}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Submitted</p>
                      <p className="font-medium">{new Date(transfer.createdAt).toLocaleDateString()}</p>
                    </div>
                    {transfer.confirmedAt && (
                      <div>
                        <p className="text-muted-foreground">User Confirmed</p>
                        <p className="font-medium">{new Date(transfer.confirmedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  {transfer.referenceNumber && (
                    <div className="text-sm bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">Bank Ref: </span>
                      <span className="font-mono font-medium">{transfer.referenceNumber}</span>
                    </div>
                  )}
                  {transfer.transferNote && (
                    <div className="text-sm text-muted-foreground italic">Note: {transfer.transferNote}</div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => setApproveDialog({ open: true, transferId: transfer.id })}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => setRejectDialog({ open: true, transferId: transfer.id })}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Awaiting User Confirmation */}
        <TabsContent value="unconfirmed" className="space-y-4 mt-4">
          {pendingUnconfirmed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No transfers awaiting user confirmation</p>
              </CardContent>
            </Card>
          ) : (
            pendingUnconfirmed.map((transfer: any) => (
              <Card key={transfer.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Transfer #{transfer.id} — ${transfer.amount}</span>
                    <StatusBadge status={getTransferStatus(transfer)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>User: {transfer.userName || `#${transfer.userId}`}</span>
                    <span>Type: {transfer.paymentType?.replace(/_/g, " ")}</span>
                    {transfer.paymentMethod && (
                      <span>Method: {PAYMENT_METHOD_LABELS[transfer.paymentMethod] ?? transfer.paymentMethod}</span>
                    )}
                    <span>Created: {new Date(transfer.createdAt).toLocaleDateString()}</span>
                    {transfer.vehicleId && <span>Vehicle: #{transfer.vehicleId}</span>}
                    {transfer.serviceRequestId && <span>Service Request: #{transfer.serviceRequestId}</span>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* All Subscriptions */}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          {(allSubscriptions as any[]).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No subscriptions found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">User</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Started</th>
                    <th className="text-left py-2 pr-4">Expires</th>
                    <th className="text-left py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(allSubscriptions as any[]).map((sub) => (
                    <tr key={sub.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4 font-medium">{sub.userName || `User #${sub.userId}`}</td>
                      <td className="py-2 pr-4"><StatusBadge status={sub.status} /></td>
                      <td className="py-2 pr-4">{sub.startedAt ? new Date(sub.startedAt).toLocaleDateString() : "—"}</td>
                      <td className="py-2 pr-4">{sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "—"}</td>
                      <td className="py-2">{sub.amount ? `$${sub.amount}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(o) => setApproveDialog({ open: o, transferId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Approve Payment
            </DialogTitle>
            <DialogDescription>
              Approving this payment will activate the user's subscription and vehicle registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Admin Notes (optional)</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Any notes about this approval..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog({ open: false, transferId: null })}>Cancel</Button>
            <Button
              onClick={() => {
                if (approveDialog.transferId) {
                  approveMutation.mutate({ transferId: approveDialog.transferId, adminNotes: adminNotes || undefined });
                }
              }}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve & Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(o) => setRejectDialog({ open: o, transferId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Reject Payment
            </DialogTitle>
            <DialogDescription>
              The user will be notified that their payment was rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for Rejection *</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, transferId: null })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectDialog.transferId && rejectReason.trim()) {
                  rejectMutation.mutate({ transferId: rejectDialog.transferId, reason: rejectReason });
                } else {
                  toast.error("Please provide a reason for rejection");
                }
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
