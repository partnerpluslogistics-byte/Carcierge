import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehicleApi, documentApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Trash2, AlertCircle, CheckCircle, Clock, Search, Upload, FileText, ExternalLink, X, CreditCard, Lock, Plus, Pencil, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import VehicleRegistrationModal from "@/components/VehicleRegistrationModal";

const MAX_VEHICLES = 5;
const VEHICLE_PAYMENTS_KEY = "carcierge_vehicle_payments";

interface VehiclePayment {
  id: string;
  vehicleId: number;
  date: string;
  amount: number;
  paymentType: "cash" | "card" | "transfer";
  notes: string;
  createdAt: string;
}

export default function Vehicles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);

  const [uploadVehicleId, setUploadVehicleId] = useState<number | null>(null);
  const [uploadDocType, setUploadDocType] = useState("Other");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [plateError, setPlateError] = useState("");
  const [editForm, setEditForm] = useState<{
    make: string; model: string; year: number; plateNumber: string;
    vin: string; engineNumber: string; engineType: string; vehicleType: string;
    color: string; mileage: string; country: string;
  } | null>(null);

  // Vehicle payments (localStorage)
  const [vehiclePayments, setVehiclePayments] = useState<Record<string, VehiclePayment[]>>({});
  const [addPaymentVehicleId, setAddPaymentVehicleId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    paymentType: "cash",
    notes: "",
  });

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", "list"],
    queryFn: () => vehicleApi.list(),
  });

  const { data: docsData, refetch: refetchDocs } = useQuery({
    queryKey: ["documents", uploadVehicleId],
    queryFn: () => documentApi.getByVehicleId(uploadVehicleId!),
    enabled: uploadVehicleId !== null,
  });

  // Load payments and seed demo data once vehicles are available
  useEffect(() => {
    const vehicleList: any[] = Array.isArray(vehiclesQuery.data) ? vehiclesQuery.data : [];
    if (vehicleList.length === 0) return;

    let stored: Record<string, VehiclePayment[]> = {};
    try {
      const raw = localStorage.getItem(VEHICLE_PAYMENTS_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }

    const firstId = String(vehicleList[0].id);
    if (!stored[firstId] || stored[firstId].length === 0) {
      stored[firstId] = [
        {
          id: "demo-pay-1",
          vehicleId: vehicleList[0].id,
          date: "2026-03-15",
          amount: 50,
          paymentType: "cash",
          notes: "Annual registration fee",
          createdAt: "2026-03-15T10:00:00.000Z",
        },
        {
          id: "demo-pay-2",
          vehicleId: vehicleList[0].id,
          date: "2026-04-20",
          amount: 120,
          paymentType: "card",
          notes: "Insurance premium payment",
          createdAt: "2026-04-20T14:30:00.000Z",
        },
      ];
      localStorage.setItem(VEHICLE_PAYMENTS_KEY, JSON.stringify(stored));
    }
    setVehiclePayments({ ...stored });
  }, [vehiclesQuery.data]);

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => vehicleApi.delete(id),
    onSuccess: () => {
      toast.success("Vehicle deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: () => toast.error("Failed to delete vehicle"),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => {
      toast.success("Document deleted");
      refetchDocs();
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      vehicleApi.update(id, data),
    onSuccess: () => {
      toast.success("Vehicle updated successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setEditVehicle(null);
      setEditForm(null);
      setPlateError("");
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.message || "Failed to update vehicle"),
  });

  const handleUploadDocument = async () => {
    if (!uploadFile || !uploadVehicleId || !uploadFileName) {
      toast.error("Please select a file and enter a file name");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("vehicle_id", String(uploadVehicleId));
      formData.append("document_type", uploadDocType);
      formData.append("file_name", uploadFileName);
      await documentApi.upload(formData);
      toast.success("Document uploaded successfully");
      refetchDocs();
      setUploadFile(null);
      setUploadFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm("Delete this document?")) return;
    deleteDocMutation.mutate(docId);
  };

  const openEditDialog = (vehicle: any) => {
    setEditVehicle(vehicle);
    setPlateError("");
    setEditForm({
      make: vehicle.make ?? "",
      model: vehicle.model ?? "",
      year: vehicle.year ?? new Date().getFullYear(),
      plateNumber: vehicle.plateNumber ?? "",
      vin: vehicle.vin ?? "",
      engineNumber: vehicle.engineNumber ?? "",
      engineType: vehicle.engineType ?? "Petrol",
      vehicleType: vehicle.vehicleType ?? "Car",
      color: vehicle.color ?? "",
      mileage: vehicle.mileage != null ? String(vehicle.mileage) : "",
      country: vehicle.country ?? "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editVehicle || !editForm) return;
    if (!editForm.make || !editForm.model || !editForm.plateNumber) {
      toast.error("Make, Model, and Plate Number are required");
      return;
    }
    if (plateError) {
      toast.error("Please fix the plate number error before saving.");
      return;
    }
    updateVehicleMutation.mutate({
      id: editVehicle.id,
      data: {
        make: editForm.make,
        model: editForm.model,
        year: Number(editForm.year),
        plateNumber: editForm.plateNumber,
        vin: editForm.vin || undefined,
        engineNumber: editForm.engineNumber || undefined,
        engineType: editForm.engineType,
        vehicleType: editForm.vehicleType,
        color: editForm.color || undefined,
        mileage: editForm.mileage ? Number(editForm.mileage) : undefined,
        country: editForm.country || undefined,
      },
    });
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!window.confirm("Are you sure you want to delete this vehicle? All associated data will be removed.")) return;
    deleteVehicleMutation.mutate(vehicleId);
  };

  const handleAddPayment = () => {
    if (!addPaymentVehicleId) return;
    if (!paymentForm.date || !paymentForm.amount) {
      toast.error("Date and amount are required");
      return;
    }
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    const newPayment: VehiclePayment = {
      id: Date.now().toString(),
      vehicleId: addPaymentVehicleId,
      date: paymentForm.date,
      amount,
      paymentType: paymentForm.paymentType as "cash" | "card" | "transfer",
      notes: paymentForm.notes,
      createdAt: new Date().toISOString(),
    };
    const key = String(addPaymentVehicleId);
    const existing = vehiclePayments[key] || [];
    const updated = { ...vehiclePayments, [key]: [newPayment, ...existing] };
    localStorage.setItem(VEHICLE_PAYMENTS_KEY, JSON.stringify(updated));
    setVehiclePayments(updated);
    setAddPaymentVehicleId(null);
    setPaymentForm({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      paymentType: "cash",
      notes: "",
    });
    toast.success("Payment recorded successfully");
  };

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) return { label: "Expired", color: "bg-red-100 text-red-800", icon: AlertCircle };
    if (daysRemaining <= 7) return { label: `${daysRemaining} days left`, color: "bg-red-100 text-red-800", icon: AlertCircle };
    if (daysRemaining <= 30) return { label: `${daysRemaining} days left`, color: "bg-yellow-100 text-yellow-800", icon: Clock };
    return { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle };
  };

  const vehicles: any[] = Array.isArray(vehiclesQuery.data) ? vehiclesQuery.data : [];
  const vehicleCount = vehicles.length;
  const atLimit = vehicleCount >= MAX_VEHICLES;
  const documents: any[] = Array.isArray(docsData) ? docsData : [];

  const filteredVehicles = vehicles.filter((v: any) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      v.make?.toLowerCase().includes(term) ||
      v.model?.toLowerCase().includes(term) ||
      v.plateNumber?.toLowerCase().includes(term) ||
      v.vin?.toLowerCase().includes(term) ||
      v.country?.toLowerCase().includes(term) ||
      v.owner?.fullName?.toLowerCase().includes(term) ||
      v.owner?.country?.toLowerCase().includes(term) ||
      v.registrations?.some((r: any) => r.registrationNumber?.toLowerCase().includes(term)) ||
      v.insurancePolicies?.some((i: any) => i.policyNumber?.toLowerCase().includes(term) || i.insuranceProvider?.toLowerCase().includes(term))
    );
  });

  if (vehiclesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
            <p className="text-muted-foreground mt-2">Manage your vehicle fleet and view all details</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={() => setRegisterOpen(true)}
              className="gap-2 shrink-0"
              disabled={atLimit}
              title={atLimit ? "Maximum of 5 vehicles reached" : undefined}
            >
              <Plus className="w-4 h-4" /> Register New Vehicle
            </Button>
            <p className="text-xs text-muted-foreground">{vehicleCount} / {MAX_VEHICLES} vehicles used</p>
          </div>
        </div>

        {atLimit && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              <strong>Vehicle limit reached.</strong> Your account supports a maximum of {MAX_VEHICLES} vehicles. To add more, please contact support.
            </p>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by plate, chassis, owner, country, provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredVehicles.length} of {vehicles.length} vehicles
          </p>
        )}

        {filteredVehicles.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center text-muted-foreground">
              {searchTerm ? (
                <div>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No vehicles match "{searchTerm}"</p>
                  <Button variant="link" onClick={() => setSearchTerm("")}>Clear search</Button>
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p>No vehicles registered yet.</p>
                  <Button onClick={() => setRegisterOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Register Your First Vehicle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} className="border-border/50 hover:border-accent/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl">
                          {vehicle.make} {vehicle.model} ({vehicle.year})
                        </CardTitle>
                        {vehicle.paymentStatus === "pending_payment" && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                            <Lock className="w-3 h-3" /> Payment Required
                          </Badge>
                        )}
                        {vehicle.paymentStatus === "pending_approval" && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 gap-1">
                            <Clock className="w-3 h-3" /> Pending Approval
                          </Badge>
                        )}
                        {vehicle.paymentStatus === "active" && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
                            <CheckCircle className="w-3 h-3" /> Active
                          </Badge>
                        )}
                        {vehicle.paymentStatus === "rejected" && (
                          <Badge className="bg-red-100 text-red-800 border-red-300 gap-1">
                            <AlertCircle className="w-3 h-3" /> Rejected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Plate: <span className="font-mono font-semibold">{vehicle.plateNumber}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {vehicle.paymentStatus === "pending_payment" && (
                        <Link href="/payments">
                          <Button variant="outline" size="sm" className="gap-1 text-amber-700 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950">
                            <CreditCard className="w-4 h-4" /> Complete Payment
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(vehicle)} title="Edit Vehicle">
                        <Pencil className="w-4 h-4 text-accent" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        disabled={deleteVehicleMutation.isPending}
                        title="Delete Vehicle"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {vehicle.paymentStatus === "pending_payment" ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                      <Lock className="w-10 h-10 text-amber-500 opacity-70" />
                      <p className="font-semibold text-amber-700 dark:text-amber-400">Vehicle details are hidden until payment is confirmed</p>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Complete your <strong>$50 annual subscription payment</strong> to unlock full vehicle details.
                      </p>
                      <Link href="/payments">
                        <Button className="gap-2 mt-1">
                          <CreditCard className="w-4 h-4" /> Go to Payments
                        </Button>
                      </Link>
                    </div>
                  ) : vehicle.paymentStatus === "pending_approval" ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                      <Clock className="w-8 h-8 text-blue-500 opacity-70" />
                      <p className="font-semibold text-blue-700 dark:text-blue-400">Payment submitted — awaiting admin approval</p>
                      <p className="text-sm text-muted-foreground">Your vehicle will be activated once the admin verifies your payment.</p>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="vehicle-info">
                        <AccordionTrigger className="hover:no-underline">
                          <span className="font-semibold">Vehicle Information</span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-muted-foreground">Vehicle ID</p>
                              <p className="font-mono text-xs bg-muted/60 px-2 py-1 rounded inline-block">#{vehicle.id}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Chassis Number (VIN)</p>
                              <p className="font-mono">{vehicle.vin || "N/A"}</p>
                            </div>
                            <div><p className="text-muted-foreground">Engine Type</p><p>{vehicle.engineType}</p></div>
                            <div><p className="text-muted-foreground">Vehicle Type</p><p>{vehicle.vehicleType}</p></div>
                            {vehicle.color && <div><p className="text-muted-foreground">Color</p><p>{vehicle.color}</p></div>}
                            {vehicle.mileage != null && <div><p className="text-muted-foreground">Mileage</p><p>{vehicle.mileage.toLocaleString()} km</p></div>}
                            {vehicle.country && <div><p className="text-muted-foreground">Country</p><p>{vehicle.country}</p></div>}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {vehicle.owner && (
                        <AccordionItem value="owner-info">
                          <AccordionTrigger className="hover:no-underline">
                            <span className="font-semibold">Owner Information</span>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <div><p className="text-muted-foreground">Name</p><p className="font-semibold">{vehicle.owner.fullName}</p></div>
                              <div><p className="text-muted-foreground">Email</p><p>{vehicle.owner.email}</p></div>
                              <div><p className="text-muted-foreground">Phone</p><p>{vehicle.owner.contactNumber || "N/A"}</p></div>
                              <div><p className="text-muted-foreground">License Number</p><p className="font-mono">{vehicle.owner.driverLicenseNo || "N/A"}</p></div>
                              {vehicle.owner.country && <div><p className="text-muted-foreground">Country</p><p>{vehicle.owner.country}</p></div>}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {vehicle.registrations && vehicle.registrations.length > 0 && (
                        <AccordionItem value="registration-info">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Registration</span>
                              {vehicle.registrations[0]?.expiryDate && (
                                <Badge className={getExpiryStatus(vehicle.registrations[0].expiryDate.toString()).color}>
                                  {getExpiryStatus(vehicle.registrations[0].expiryDate.toString()).label}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            {vehicle.registrations.map((reg: any, idx: number) => (
                              <div key={idx} className="border-t pt-4 first:border-t-0 first:pt-0">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div><p className="text-muted-foreground">Registration Number</p><p className="font-mono font-semibold">{reg.registrationNumber}</p></div>
                                  <div><p className="text-muted-foreground">Issuing Authority</p><p>{reg.issuingAuthority}</p></div>
                                  <div><p className="text-muted-foreground">Registration Date</p><p>{new Date(reg.registrationDate).toLocaleDateString()}</p></div>
                                  <div><p className="text-muted-foreground">Expiry Date</p><p className="font-semibold">{reg.expiryDate ? new Date(reg.expiryDate).toLocaleDateString() : "No Expiry"}</p></div>
                                  {reg.country && <div><p className="text-muted-foreground">Country</p><p>{reg.country}</p></div>}
                                </div>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {vehicle.insurancePolicies && vehicle.insurancePolicies.length > 0 && (
                        <AccordionItem value="insurance-info">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Insurance</span>
                              {vehicle.insurancePolicies[0] && (
                                <Badge className={getExpiryStatus(vehicle.insurancePolicies[0].policyEndDate.toString()).color}>
                                  {getExpiryStatus(vehicle.insurancePolicies[0].policyEndDate.toString()).label}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            {vehicle.insurancePolicies.map((policy: any, idx: number) => (
                              <div key={idx} className="border-t pt-4 first:border-t-0 first:pt-0">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div><p className="text-muted-foreground">Policy Number</p><p className="font-mono font-semibold">{policy.policyNumber}</p></div>
                                  <div><p className="text-muted-foreground">Provider</p><p>{policy.insuranceProvider}</p></div>
                                  <div><p className="text-muted-foreground">Coverage Type</p><p>{policy.coverageType}</p></div>
                                  <div><p className="text-muted-foreground">Premium Amount</p><p className="font-semibold">${policy.premiumAmount}</p></div>
                                  <div><p className="text-muted-foreground">Start Date</p><p>{new Date(policy.policyStartDate).toLocaleDateString()}</p></div>
                                  <div><p className="text-muted-foreground">End Date</p><p className="font-semibold">{new Date(policy.policyEndDate).toLocaleDateString()}</p></div>
                                  {policy.country && <div><p className="text-muted-foreground">Country</p><p>{policy.country}</p></div>}
                                </div>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {vehicle.inspections && vehicle.inspections.length > 0 && (
                        <AccordionItem value="inspection-info">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Inspection</span>
                              {vehicle.inspections[0] && (
                                <Badge className={getExpiryStatus(vehicle.inspections[0].expiryDate.toString()).color}>
                                  {getExpiryStatus(vehicle.inspections[0].expiryDate.toString()).label}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            {vehicle.inspections.map((inspection: any, idx: number) => (
                              <div key={idx} className="border-t pt-4 first:border-t-0 first:pt-0">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div><p className="text-muted-foreground">Inspection Date</p><p>{new Date(inspection.inspectionDate).toLocaleDateString()}</p></div>
                                  <div><p className="text-muted-foreground">Expiry Date</p><p className="font-semibold">{new Date(inspection.expiryDate).toLocaleDateString()}</p></div>
                                  <div><p className="text-muted-foreground">Invoice Number</p><p className="font-mono font-semibold">{inspection.invoiceNumber}</p></div>
                                  {inspection.country && <div><p className="text-muted-foreground">Country</p><p>{inspection.country}</p></div>}
                                </div>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Payments */}
                      <AccordionItem value="payments">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Payments</span>
                            <DollarSign className="w-4 h-4 text-green-500" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setAddPaymentVehicleId(vehicle.id);
                                setPaymentForm({
                                  date: new Date().toISOString().split("T")[0],
                                  amount: "",
                                  paymentType: "cash",
                                  notes: "",
                                });
                              }}
                            >
                              <Plus className="h-3 w-3" /> Add Payment
                            </Button>
                          </div>
                          {(() => {
                            const payments = [...(vehiclePayments[String(vehicle.id)] || [])].sort(
                              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                            );
                            if (payments.length === 0) {
                              return (
                                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                              );
                            }
                            return (
                              <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/50">
                                    <tr>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Amount</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Type</th>
                                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {payments.map((p) => (
                                      <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                                        <td className="px-3 py-2">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="px-3 py-2 font-semibold text-green-600">${p.amount.toFixed(2)}</td>
                                        <td className="px-3 py-2">
                                          <Badge
                                            className={
                                              p.paymentType === "cash"
                                                ? "bg-green-100 text-green-800 border-green-200"
                                                : p.paymentType === "card"
                                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                                  : "bg-purple-100 text-purple-800 border-purple-200"
                                            }
                                          >
                                            {p.paymentType.charAt(0).toUpperCase() + p.paymentType.slice(1)}
                                          </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground">{p.notes || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="documents">
                        <AccordionTrigger
                          className="hover:no-underline"
                          onClick={() => setUploadVehicleId(prev => prev === vehicle.id ? null : vehicle.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Documents</span>
                            <Upload className="w-4 h-4 text-blue-500" />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {uploadVehicleId === vehicle.id && documents.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Uploaded Documents</p>
                              {documents.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{doc.fileName}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">({doc.documentType})</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3 w-3" /></Button>
                                    </a>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteDoc(doc.id)}>
                                      <X className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {uploadVehicleId === vehicle.id && documents.length === 0 && (
                            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                          )}

                          <div className="border-t pt-4 space-y-3">
                            <p className="text-sm font-medium">Upload New Document</p>
                            <div>
                              <Label className="text-xs mb-1 block">Document Type</Label>
                              <Select
                                value={uploadVehicleId === vehicle.id ? uploadDocType : "Other"}
                                onValueChange={(v) => { setUploadVehicleId(vehicle.id); setUploadDocType(v); }}
                              >
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Registration Certificate">Registration Certificate</SelectItem>
                                  <SelectItem value="Insurance Certificate">Insurance Certificate</SelectItem>
                                  <SelectItem value="Vehicle Photo">Vehicle Photo</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">File Name</Label>
                              <Input
                                className="h-8 text-sm"
                                placeholder="e.g. Registration 2025"
                                value={uploadVehicleId === vehicle.id ? uploadFileName : ""}
                                onChange={e => { setUploadVehicleId(vehicle.id); setUploadFileName(e.target.value); }}
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1 block">File</Label>
                              <input
                                ref={uploadVehicleId === vehicle.id ? fileInputRef : undefined}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 cursor-pointer"
                                onChange={e => { setUploadVehicleId(vehicle.id); setUploadFile(e.target.files?.[0] ?? null); }}
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() => { setUploadVehicleId(vehicle.id); handleUploadDocument(); }}
                              disabled={isUploading || !uploadFile || !uploadFileName || uploadVehicleId !== vehicle.id}
                              className="gap-2"
                            >
                              {isUploading && uploadVehicleId === vehicle.id
                                ? <><Loader2 className="h-3 w-3 animate-spin" />Uploading...</>
                                : <><Upload className="h-3 w-3" />Upload</>}
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Vehicle Dialog */}
      <Dialog open={editVehicle !== null} onOpenChange={(open) => { if (!open) { setEditVehicle(null); setEditForm(null); setPlateError(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Edit Vehicle
            </DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm mb-1 block">Make <span className="text-red-500">*</span></Label>
                  <Input value={editForm.make} onChange={e => setEditForm(f => f ? { ...f, make: e.target.value } : f)} placeholder="e.g. Toyota" />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Model <span className="text-red-500">*</span></Label>
                  <Input value={editForm.model} onChange={e => setEditForm(f => f ? { ...f, model: e.target.value } : f)} placeholder="e.g. Corolla" />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Year</Label>
                  <Input type="number" value={editForm.year} onChange={e => setEditForm(f => f ? { ...f, year: Number(e.target.value) } : f)} />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Plate Number <span className="text-red-500">*</span></Label>
                  <Input
                    value={editForm.plateNumber}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm(f => f ? { ...f, plateNumber: val } : f);
                      const dup = val.trim() && vehicles.some(
                        v => v.id !== editVehicle?.id && v.plateNumber?.toUpperCase() === val.trim().toUpperCase()
                      );
                      setPlateError(dup ? "This plate number is already registered to another vehicle." : "");
                    }}
                    placeholder="e.g. ABC123"
                    className={plateError ? "border-red-500" : ""}
                  />
                  {plateError && <p className="text-xs text-red-500 mt-1">{plateError}</p>}
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Vehicle Type</Label>
                  <Select value={editForm.vehicleType} onValueChange={v => setEditForm(f => f ? { ...f, vehicleType: v } : f)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Car">Car</SelectItem>
                      <SelectItem value="Bike">Bike</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Engine Type</Label>
                  <Select value={editForm.engineType} onValueChange={v => setEditForm(f => f ? { ...f, engineType: v } : f)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Petrol">Petrol</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Chassis Number (VIN)</Label>
                  <Input value={editForm.vin} onChange={e => setEditForm(f => f ? { ...f, vin: e.target.value } : f)} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Engine Number</Label>
                  <Input value={editForm.engineNumber} onChange={e => setEditForm(f => f ? { ...f, engineNumber: e.target.value } : f)} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Color</Label>
                  <Input value={editForm.color} onChange={e => setEditForm(f => f ? { ...f, color: e.target.value } : f)} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Mileage (km)</Label>
                  <Input type="number" value={editForm.mileage} onChange={e => setEditForm(f => f ? { ...f, mileage: e.target.value } : f)} placeholder="Optional" />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm mb-1 block">Country</Label>
                  <Input value={editForm.country} onChange={e => setEditForm(f => f ? { ...f, country: e.target.value } : f)} placeholder="Optional" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditVehicle(null); setEditForm(null); setPlateError(""); }}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateVehicleMutation.isPending || !!plateError}>
              {updateVehicleMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog
        open={addPaymentVehicleId !== null}
        onOpenChange={(open) => { if (!open) setAddPaymentVehicleId(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Add Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1 block">Payment Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={paymentForm.date}
                onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Amount ($) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Payment Type</Label>
              <Select
                value={paymentForm.paymentType}
                onValueChange={v => setPaymentForm(f => ({ ...f, paymentType: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPaymentVehicleId(null)}>Cancel</Button>
            <Button onClick={handleAddPayment}>Save Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehicleRegistrationModal
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["vehicles"] })}
      />
    </>
  );
}
