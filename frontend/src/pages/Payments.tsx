import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bankTransferApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2, CreditCard, CheckCircle, Clock, AlertCircle, XCircle,
  Banknote, Smartphone, Globe, ChevronRight, Info, Download, User, Archive, ArchiveRestore
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const PAYMENT_METHODS = [
  {
    id: "whish",
    label: "Whish Money",
    description: "Lebanon — Transfer via Whish app",
    icon: Smartphone,
    region: "🇱🇧 Lebanon",
    instructions: "Open the Whish app → Send to account: +961 XX XXX XXX → Enter the exact amount → Add the payment reference in the note field.",
  },
  {
    id: "omt",
    label: "OMT Transfer",
    description: "Lebanon — Transfer via OMT",
    icon: Banknote,
    region: "🇱🇧 Lebanon",
    instructions: "Visit any OMT branch or agent → Transfer to account: XXXXXXXX → Mention the payment reference to the agent.",
  },
  {
    id: "ziina",
    label: "Ziina",
    description: "Lebanon mobile payment",
    icon: Smartphone,
    region: "🇱🇧 Lebanon",
    instructions: "Open the Ziina app → Send payment to the registered Ziina number → Enter the exact amount → Add the payment reference in the note field.",
  },
  {
    id: "payment_link",
    label: "Payment Link",
    description: "All countries — Pay online",
    icon: Globe,
    region: "🌍 All Countries",
    instructions: "A secure payment link will be sent to your registered email. Click the link and complete the payment using your card.",
  },
];

function paymentMethodLabel(method: string) {
  return PAYMENT_METHODS.find(m => m.id === method)?.label ?? method;
}

function paymentTypeLabel(transfer: any) {
  if (transfer.paymentType === "subscription") return "Vehicle Registration Subscription";
  return transfer.paymentType?.replace(/_/g, " ") ?? "Payment";
}

function transferStatus(transfer: any): "approved" | "rejected" | "pending_approval" | "payment_required" {
  if (transfer.approvedByAdmin) return "approved";
  if (transfer.rejectedAt) return "rejected";
  if (transfer.confirmedByUser) return "pending_approval";
  return "payment_required";
}

function StatusBadge({ transfer }: { transfer: any }) {
  const s = transferStatus(transfer);
  if (s === "approved") return <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle className="w-3 h-3" /> Approved</Badge>;
  if (s === "rejected") return <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
  if (s === "pending_approval") return <Badge className="bg-blue-100 text-blue-800 gap-1"><Clock className="w-3 h-3" /> Pending Approval</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 gap-1"><AlertCircle className="w-3 h-3" /> Payment Required</Badge>;
}

function exportPaymentsCSV(payments: any[]) {
  const headers = ["ID", "User Name", "User Email", "Payment Type", "Payment Method", "Amount", "Currency", "Reference", "Status", "Created At", "Confirmed At", "Approved At"];
  const rows = payments.map(t => [
    t.id,
    t.userName ?? t.userId,
    t.userEmail ?? "",
    paymentTypeLabel(t),
    paymentMethodLabel(t.paymentMethod),
    t.amount,
    t.currency,
    t.referenceNumber ?? "",
    transferStatus(t),
    new Date(t.createdAt).toLocaleString(),
    t.confirmedAt ? new Date(t.confirmedAt).toLocaleString() : "",
    t.approvedAt ? new Date(t.approvedAt).toLocaleString() : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carcierge-payments-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Payments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("whish");
  const [confirmingTransfer, setConfirmingTransfer] = useState<any>(null);
  const [confirmRef, setConfirmRef] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const transfersQuery = useQuery({
    queryKey: ["bank-transfers", "mine"],
    queryFn: bankTransferApi.getMine,
  });

  const allTransfersQuery = useQuery({
    queryKey: ["bank-transfers", "all"],
    queryFn: bankTransferApi.getAll,
    enabled: isAdmin,
  });

  const archiveMutation = useMutation({
    mutationFn: (transferId: number) => bankTransferApi.archive(transferId),
    onSuccess: () => {
      toast.success("Payment archived.");
      queryClient.invalidateQueries({ queryKey: ["bank-transfers", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transfers", "all"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || e.message || "Failed to archive payment"),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (transferId: number) => bankTransferApi.unarchive(transferId),
    onSuccess: () => {
      toast.success("Payment restored.");
      queryClient.invalidateQueries({ queryKey: ["bank-transfers", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transfers", "all"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || e.message || "Failed to restore payment"),
  });

  const transfers = ((transfersQuery.data ?? []) as any[]).filter((t) => showArchived ? !!t.archivedAt : !t.archivedAt);
  const allTransfers = ((allTransfersQuery.data ?? []) as any[]).filter((t) => showArchived ? !!t.archivedAt : !t.archivedAt);
  const pendingTransfers = transfers.filter((t) => !t.confirmedByUser && !t.approvedByAdmin && !t.rejectedAt);
  const inProgressTransfers = transfers.filter((t) => t.confirmedByUser && !t.approvedByAdmin && !t.rejectedAt);
  const completedTransfers = transfers.filter((t) => t.approvedByAdmin || t.rejectedAt);

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod);

  const handleStartPayment = (transfer: any) => {
    setSelectedTransfer(transfer);
    setPaymentMethod(transfer.paymentMethod && transfer.paymentMethod !== "bank_transfer" ? transfer.paymentMethod : "whish");
  };

  const handleConfirmPayment = async () => {
    if (!confirmingTransfer) return;
    try {
      await bankTransferApi.confirm(confirmingTransfer.id);
      toast.success("Payment confirmation submitted! Admin will verify and approve shortly.");
      queryClient.invalidateQueries({ queryKey: ["bank-transfers", "mine"] });
      setConfirmingTransfer(null);
      setSelectedTransfer(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || e.message || "Failed to confirm payment");
    }
  };

  if (transfersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-2">Track and complete your subscription and service request payments</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? <><ArchiveRestore className="w-4 h-4" /> Show Active</> : <><Archive className="w-4 h-4" /> Show Archived</>}
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => exportPaymentsCSV(allTransfersQuery.data ?? [])}
              disabled={allTransfersQuery.isLoading}
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-semibold">Payment Information</p>
              <p>Annual vehicle registration subscription: <strong>$50 USD</strong> per year (covers all your vehicles).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin ? (
        /* Admin VIEW: full payment list with user details */
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Payments ({allTransfers.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({allTransfers.filter((t) => !t.approvedByAdmin && !t.rejectedAt).length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({allTransfers.filter((t) => t.approvedByAdmin).length})</TabsTrigger>
          </TabsList>

          {["all", "pending", "approved"].map(tab => {
            const filtered = tab === "all" ? allTransfers
              : tab === "pending" ? allTransfers.filter((t) => !t.approvedByAdmin && !t.rejectedAt)
              : allTransfers.filter((t) => t.approvedByAdmin);
            return (
              <TabsContent key={tab} value={tab} className="mt-4">
                {allTransfersQuery.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">No payments in this category.</CardContent></Card>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((t) => (
                            <TableRow key={t.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground">#{t.id}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{t.userName ?? `User #${t.userId}`}</p>
                                    {t.userEmail && <p className="text-xs text-muted-foreground truncate">{t.userEmail}</p>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{paymentTypeLabel(t)}</TableCell>
                              <TableCell>
                                <span className="text-sm font-medium">{paymentMethodLabel(t.paymentMethod)}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold">${t.amount}</span>
                                <span className="text-xs text-muted-foreground ml-1">{t.currency}</span>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{t.referenceNumber ?? "—"}</TableCell>
                              <TableCell><StatusBadge transfer={t} /></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {t.archivedAt ? (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => unarchiveMutation.mutate(t.id)} disabled={unarchiveMutation.isPending}>
                                    <ArchiveRestore className="w-3 h-3" /> Restore
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-muted-foreground" onClick={() => archiveMutation.mutate(t.id)} disabled={archiveMutation.isPending}>
                                    <Archive className="w-3 h-3" /> Archive
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        /* User VIEW */
        <div className="space-y-6">
          {/* Pending Payments — need action */}
          {pendingTransfers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Payments Requiring Action ({pendingTransfers.length})
              </h2>
              {pendingTransfers.map((transfer) => (
                <Card key={transfer.id} className="border-amber-300 dark:border-amber-700">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge transfer={transfer} />
                          <span className="text-sm font-medium">{paymentTypeLabel(transfer)}</span>
                        </div>
                        <p className="text-2xl font-bold">${transfer.amount} <span className="text-sm font-normal text-muted-foreground">{transfer.currency}</span></p>
                        <p className="text-sm text-muted-foreground">Created: {new Date(transfer.createdAt).toLocaleDateString()}</p>
                        {transfer.paymentMethod && transfer.paymentMethod !== "bank_transfer" && (
                          <p className="text-sm text-muted-foreground">Method: {paymentMethodLabel(transfer.paymentMethod)}</p>
                        )}
                      </div>
                      <Button onClick={() => handleStartPayment(transfer)} className="gap-2 shrink-0">
                        <CreditCard className="w-4 h-4" /> Complete Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* In Progress — waiting for admin */}
          {inProgressTransfers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Awaiting Admin Approval ({inProgressTransfers.length})
              </h2>
              {inProgressTransfers.map((transfer) => (
                <Card key={transfer.id} className="border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge transfer={transfer} />
                          <span className="text-sm font-medium">{paymentTypeLabel(transfer)}</span>
                        </div>
                        <p className="text-2xl font-bold">${transfer.amount} <span className="text-sm font-normal text-muted-foreground">{transfer.currency}</span></p>
                        <p className="text-sm text-muted-foreground">Submitted: {new Date(transfer.confirmedAt ?? transfer.createdAt).toLocaleString()}</p>
                        {transfer.referenceNumber && (
                          <p className="text-sm text-muted-foreground">Reference: <span className="font-mono">{transfer.referenceNumber}</span></p>
                        )}
                        <p className="text-sm text-muted-foreground">Method: {paymentMethodLabel(transfer.paymentMethod)}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Waiting for</p>
                        <p>admin review</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Completed */}
          {completedTransfers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Payment History ({completedTransfers.length})
              </h2>
              {completedTransfers.map((transfer) => (
                <Card key={transfer.id} className="border-border/50 opacity-80">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge transfer={transfer} />
                          <span className="text-sm font-medium">{paymentTypeLabel(transfer)}</span>
                        </div>
                        <p className="text-xl font-bold">${transfer.amount} <span className="text-sm font-normal text-muted-foreground">{transfer.currency}</span></p>
                        <p className="text-sm text-muted-foreground">
                          {transfer.approvedByAdmin
                            ? `Approved: ${new Date(transfer.approvedAt).toLocaleString()}`
                            : `Rejected: ${new Date(transfer.rejectedAt).toLocaleString()}`}
                        </p>
                        {transfer.rejectionReason && (
                          <p className="text-sm text-red-600 dark:text-red-400">Reason: {transfer.rejectionReason}</p>
                        )}
                        <p className="text-sm text-muted-foreground">Method: {paymentMethodLabel(transfer.paymentMethod)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-muted-foreground shrink-0"
                        onClick={() => archiveMutation.mutate(transfer.id)}
                        disabled={archiveMutation.isPending}
                      >
                        <Archive className="w-4 h-4" /> Archive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {transfers.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No payments yet</p>
                <p className="text-sm mt-1">Payments will appear here when you register a vehicle or submit a service request.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payment Method Selection Dialog */}
      <Dialog open={selectedTransfer !== null && confirmingTransfer === null} onOpenChange={(open) => { if (!open) setSelectedTransfer(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Choose Payment Method
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-semibold">Amount due: <span className="text-lg">${selectedTransfer?.amount} {selectedTransfer?.currency}</span></p>
              <p className="text-muted-foreground mt-0.5">{selectedTransfer ? paymentTypeLabel(selectedTransfer) : ""}</p>
            </div>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
              {PAYMENT_METHODS.map(method => (
                <div
                  key={method.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <RadioGroupItem value={method.id} id={method.id} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor={method.id} className="font-medium cursor-pointer flex items-center gap-2">
                      <method.icon className="w-4 h-4" />
                      {method.label}
                      <span className="text-xs text-muted-foreground font-normal">{method.region}</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {selectedMethod && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Instructions</p>
                <p className="text-blue-700 dark:text-blue-400">{selectedMethod.instructions}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTransfer(null)}>Cancel</Button>
            <Button onClick={() => { setConfirmingTransfer(selectedTransfer); setSelectedTransfer(null); }} className="gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Dialog */}
      <Dialog open={confirmingTransfer !== null} onOpenChange={(open) => { if (!open) setConfirmingTransfer(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" /> Confirm Payment Made
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-semibold">Amount: <span className="text-lg">${confirmingTransfer?.amount} {confirmingTransfer?.currency}</span></p>
              <p className="text-muted-foreground mt-0.5">Method: {paymentMethodLabel(paymentMethod)}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ref">Transaction / Reference Number <span className="text-muted-foreground font-normal">(optional but recommended)</span></Label>
              <Input
                id="ref"
                placeholder="e.g. TXN-12345678"
                value={confirmRef}
                onChange={e => setConfirmRef(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Providing a reference number speeds up admin verification.</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
              By clicking "I've Made the Payment", you confirm that you have completed the transfer of <strong>${confirmingTransfer?.amount} {confirmingTransfer?.currency}</strong> using <strong>{paymentMethodLabel(paymentMethod)}</strong>. An admin will verify and approve your payment.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmingTransfer(null); setSelectedTransfer(confirmingTransfer); }}>Back</Button>
            <Button
              onClick={handleConfirmPayment}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4" />
              I've Made the Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
