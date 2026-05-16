import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, Building2, AlertCircle, Clock } from "lucide-react";
import {
  vehicleApi,
  ownerApi,
  registrationApi,
  insuranceApi,
  inspectionApi,
  bankTransferApi,
  subscriptionApi,
} from "@/lib/api";

const COUNTRIES = [
  "Bahrain", "Kuwait", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates",
  "Egypt", "Jordan", "Lebanon", "Morocco", "Tunisia",
  "United Kingdom", "United States", "Germany", "France", "Canada", "Australia",
  "India", "Pakistan", "Philippines", "Other",
];

type PaymentMethod = "whish" | "omt" | "ziina" | "payment_link" | "bank_transfer";

interface InsuranceEntry {
  policyNumber: string;
  provider: string;
  coverageType: "Comprehensive" | "3rd Party" | "Mandatory";
  premiumAmount: string;
  policyStartDate: string;
  policyEndDate: string;
  country: string;
}

const emptyInsurance = (): InsuranceEntry => ({
  policyNumber: "",
  provider: "",
  coverageType: "Comprehensive",
  premiumAmount: "",
  policyStartDate: new Date().toISOString().split("T")[0],
  policyEndDate: "",
  country: "",
});

interface VehicleRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function VehicleRegistrationModal({
  open,
  onOpenChange,
  onSuccess,
}: VehicleRegistrationModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("vehicle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [createdVehicleId, setCreatedVehicleId] = useState<number | null>(null);
  const [createdTransferId, setCreatedTransferId] = useState<number | null>(null);
  const [transferRef, setTransferRef] = useState("");
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("whish");
  const [payLater, setPayLater] = useState(false);

  const [vehicleData, setVehicleData] = useState({
    make: "", model: "", year: new Date().getFullYear(),
    plateNumber: "", vin: "", engineNumber: "",
    engineType: "Petrol", vehicleType: "Car", country: "",
  });

  const [ownerData, setOwnerData] = useState({
    name: "", email: "", phoneNumber: "", licenseNumber: "", country: "",
  });

  const [registrationData, setRegistrationData] = useState({
    registrationNumber: "",
    registrationDate: new Date().toISOString().split("T")[0],
    expiryDate: "", issuingAuthority: "Government", country: "",
  });

  const [insurances, setInsurances] = useState<InsuranceEntry[]>([emptyInsurance()]);
  const [hasSecondInsurance, setHasSecondInsurance] = useState(false);

  const [inspectionData, setInspectionData] = useState({
    inspectionDate: new Date().toISOString().split("T")[0],
    expiryDate: "", invoiceNumber: "", country: "",
  });

  const { data: vehiclesList = [] } = useQuery({
    queryKey: ["vehicles", "list"],
    queryFn: () => vehicleApi.list(),
  });
  const vehicleCount = Array.isArray(vehiclesList) ? vehiclesList.length : 0;
  const atVehicleLimit = vehicleCount >= 5;

  const { data: activeSubscription } = useQuery({
    queryKey: ["subscriptions", "active"],
    queryFn: () => subscriptionApi.getActive(),
  });

  const updateInsurance = (index: number, field: keyof InsuranceEntry, value: string) => {
    setInsurances(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleToggleSecondInsurance = (checked: boolean) => {
    setHasSecondInsurance(checked);
    if (checked && insurances.length < 2) {
      setInsurances(prev => [...prev, emptyInsurance()]);
    } else if (!checked && insurances.length > 1) {
      setInsurances(prev => prev.slice(0, 1));
    }
  };

  const resetForm = () => {
    setVehicleData({ make: "", model: "", year: new Date().getFullYear(), plateNumber: "", vin: "", engineNumber: "", engineType: "Petrol", vehicleType: "Car", country: "" });
    setOwnerData({ name: "", email: "", phoneNumber: "", licenseNumber: "", country: "" });
    setRegistrationData({ registrationNumber: "", registrationDate: new Date().toISOString().split("T")[0], expiryDate: "", issuingAuthority: "Government", country: "" });
    setInsurances([emptyInsurance()]);
    setHasSecondInsurance(false);
    setInspectionData({ inspectionDate: new Date().toISOString().split("T")[0], expiryDate: "", invoiceNumber: "", country: "" });
    setActiveTab("vehicle");
    setStep("form");
    setCreatedVehicleId(null);
    setCreatedTransferId(null);
    setTransferRef("");
    setPayLater(false);
    setPaymentMethod("whish");
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (atVehicleLimit) {
        toast.error("You have reached the maximum of 5 vehicles per account. Please contact support to add more.");
        return;
      }
      if (!vehicleData.make || !vehicleData.model || !vehicleData.plateNumber) {
        toast.error("Please fill in all required vehicle details (Make, Model, Plate Number)");
        setActiveTab("vehicle");
        return;
      }
      if (!ownerData.name || !ownerData.email) {
        toast.error("Please fill in owner name and email");
        setActiveTab("owner");
        return;
      }
      if (!registrationData.registrationNumber) {
        toast.error("Please fill in registration number");
        setActiveTab("registration");
        return;
      }
      const isLebanon = registrationData.country === "Lebanon" || vehicleData.country === "Lebanon";
      if (!isLebanon && !registrationData.expiryDate) {
        toast.error("Please fill in registration expiry date");
        setActiveTab("registration");
        return;
      }
      const ins1 = insurances[0];
      if (!ins1.policyNumber || !ins1.policyEndDate) {
        toast.error("Please fill in insurance policy number and end date");
        setActiveTab("insurance");
        return;
      }
      if (hasSecondInsurance && insurances[1]) {
        const ins2 = insurances[1];
        if (!ins2.policyNumber || !ins2.policyEndDate) {
          toast.error("Please fill in the second insurance policy, or disable it");
          setActiveTab("insurance");
          return;
        }
      }
      if (!inspectionData.expiryDate || !inspectionData.invoiceNumber) {
        toast.error("Please fill in inspection expiry date and invoice number");
        setActiveTab("inspection");
        return;
      }

      // Create owner
      const ownerResult = await ownerApi.create({
        fullName: ownerData.name,
        email: ownerData.email,
        contactNumber: ownerData.phoneNumber || undefined,
        driverLicenseNo: ownerData.licenseNumber || undefined,
        country: ownerData.country || undefined,
      });
      const ownerId = (ownerResult as any)?.insertId ?? (ownerResult as any)?.[0]?.insertId ?? (ownerResult as any)?.id;
      if (!ownerId) throw new Error("Failed to create owner — no ID returned");

      // Create vehicle
      const vehicleResult = await vehicleApi.create({
        ownerId,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        plateNumber: vehicleData.plateNumber,
        vin: vehicleData.vin || undefined,
        engineNumber: vehicleData.engineNumber || undefined,
        engineType: vehicleData.engineType,
        vehicleType: vehicleData.vehicleType,
        country: vehicleData.country || undefined,
      });
      const vehicleId = (vehicleResult as any)?.insertId ?? (vehicleResult as any)?.[0]?.insertId ?? (vehicleResult as any)?.id;
      if (!vehicleId) throw new Error("Failed to create vehicle — no ID returned");

      // Create registration
      await registrationApi.create({
        vehicleId,
        registrationNumber: registrationData.registrationNumber,
        registrationDate: registrationData.registrationDate,
        expiryDate: registrationData.expiryDate || undefined,
        issuingAuthority: registrationData.issuingAuthority,
        country: registrationData.country || undefined,
      });

      // Create insurance(s)
      for (const ins of insurances) {
        if (!ins.policyNumber || !ins.policyEndDate) continue;
        await insuranceApi.create({
          vehicleId,
          policyNumber: ins.policyNumber,
          insuranceProvider: ins.provider,
          coverageType: ins.coverageType,
          premiumAmount: ins.premiumAmount || "0",
          policyStartDate: ins.policyStartDate,
          policyEndDate: ins.policyEndDate,
          country: ins.country || undefined,
        });
      }

      // Create inspection
      await inspectionApi.create({
        vehicleId,
        inspectionDate: inspectionData.inspectionDate,
        expiryDate: inspectionData.expiryDate,
        invoiceNumber: inspectionData.invoiceNumber,
        country: inspectionData.country || undefined,
      });

      const needsSubscription = !activeSubscription;

      if (needsSubscription) {
        const sub = await subscriptionApi.create({});
        const subId = (sub as any)?.id;
        const transfer = await bankTransferApi.create({
          vehicleId,
          subscriptionId: subId,
          paymentType: "subscription",
          paymentMethod: "bank_transfer",
          amount: "50.00",
        });
        setCreatedTransferId((transfer as any)?.id ?? null);
        setCreatedVehicleId(vehicleId);
        setStep("payment");
      } else {
        setCreatedVehicleId(vehicleId);
        setStep("done");
        toast.success("Vehicle registered successfully!");
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error?.response?.data?.error || error?.message || "Failed to register vehicle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!createdTransferId) return;
    try {
      setIsConfirmingPayment(true);
      await bankTransferApi.confirm(createdTransferId);
      setStep("done");
      toast.success("Payment confirmation sent! Your vehicle is pending admin approval.");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transfers"] });
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Failed to confirm payment. Please try again.");
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const handlePayLater = () => {
    setPayLater(true);
    setStep("done");
    toast.info("Vehicle saved. Complete your payment from the Payments page to activate it.");
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    onSuccess?.();
  };

  const handleCountryChange = (section: string, country: string) => {
    if (country === "Lebanon") {
      if (section === "registration") {
        setRegistrationData(prev => ({ ...prev, country, expiryDate: "" }));
      } else if (section === "inspection") {
        const nextYear = new Date().getFullYear() + 1;
        setInspectionData(prev => ({ ...prev, country, expiryDate: `${nextYear}-01-01` }));
      } else if (section === "vehicle") {
        setVehicleData(prev => ({ ...prev, country }));
        setRegistrationData(prev => ({ ...prev, country, expiryDate: "" }));
        const nextYear = new Date().getFullYear() + 1;
        setInspectionData(prev => ({ ...prev, country, expiryDate: `${nextYear}-01-01` }));
      } else if (section === "owner") {
        setOwnerData(prev => ({ ...prev, country }));
      }
    } else {
      if (section === "vehicle") setVehicleData(prev => ({ ...prev, country }));
      else if (section === "owner") setOwnerData(prev => ({ ...prev, country }));
      else if (section === "registration") setRegistrationData(prev => ({ ...prev, country }));
      else if (section === "inspection") setInspectionData(prev => ({ ...prev, country }));
    }
  };

  const CountrySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select country (optional)" />
      </SelectTrigger>
      <SelectContent>
        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const InsuranceForm = ({ index }: { index: number }) => {
    const ins = insurances[index];
    if (!ins) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Policy Number *</Label>
            <Input value={ins.policyNumber} onChange={(e) => updateInsurance(index, "policyNumber", e.target.value)} placeholder="POL-12345" />
          </div>
          <div>
            <Label>Insurance Provider</Label>
            <Input value={ins.provider} onChange={(e) => updateInsurance(index, "provider", e.target.value)} placeholder="Provider name" />
          </div>
          <div>
            <Label>Coverage Type *</Label>
            <Select value={ins.coverageType} onValueChange={(v) => updateInsurance(index, "coverageType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                <SelectItem value="3rd Party">3rd Party</SelectItem>
                <SelectItem value="Mandatory">Mandatory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Premium Amount</Label>
            <Input type="number" value={ins.premiumAmount} onChange={(e) => updateInsurance(index, "premiumAmount", e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Policy Start Date</Label>
            <Input type="date" value={ins.policyStartDate} onChange={(e) => updateInsurance(index, "policyStartDate", e.target.value)} />
          </div>
          <div>
            <Label>Policy End Date *</Label>
            <Input type="date" value={ins.policyEndDate} onChange={(e) => updateInsurance(index, "policyEndDate", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Country</Label>
            <CountrySelect value={ins.country} onChange={(v) => updateInsurance(index, "country", v)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Vehicle</DialogTitle>
          <DialogDescription>
            {step === "form" && "Enter vehicle, owner, insurance, registration, and inspection details"}
            {step === "payment" && "Complete your $50 annual subscription payment to activate your vehicle"}
            {step === "done" && (payLater ? "Vehicle saved — payment pending" : "Your vehicle has been submitted successfully")}
          </DialogDescription>
        </DialogHeader>

        {/* PAYMENT STEP */}
        {step === "payment" && (
          <div className="space-y-5 py-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-600 dark:text-amber-400">Annual Subscription Required — $50 USD</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A one-time annual fee of <strong>$50 USD</strong> is required to activate your account and all vehicles.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Choose Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "whish" as PaymentMethod, label: "Whish Money", flag: "🇱🇧", note: "Lebanon" },
                  { value: "omt" as PaymentMethod, label: "OMT", flag: "🇱🇧", note: "Lebanon" },
                  { value: "ziina" as PaymentMethod, label: "Ziina", flag: "🇱🇧", note: "Lebanon" },
                  { value: "payment_link" as PaymentMethod, label: "Payment Link", flag: "🌍", note: "All countries" },
                ]).map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      paymentMethod === m.value
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <span className="text-2xl">{m.flag}</span>
                    <div>
                      <p className="font-medium text-sm">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.note}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "whish" && (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <p className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Whish Money Transfer</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Whish Number</span><span className="font-mono font-medium">+961 70 000 000</span>
                  <span className="text-muted-foreground">Account Name</span><span className="font-medium">Carcierge SAL</span>
                  <span className="text-muted-foreground">Amount</span><span className="font-medium text-green-600">$50.00 USD</span>
                  <span className="text-muted-foreground">Reference</span><span className="font-mono font-medium">CAR-{createdVehicleId}</span>
                </div>
              </div>
            )}
            {paymentMethod === "omt" && (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <p className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> OMT Transfer</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">OMT Beneficiary</span><span className="font-medium">Carcierge SAL</span>
                  <span className="text-muted-foreground">OMT Code</span><span className="font-mono font-medium">CAR-{createdVehicleId}</span>
                  <span className="text-muted-foreground">Amount</span><span className="font-medium text-green-600">$50.00 USD</span>
                </div>
              </div>
            )}
            {paymentMethod === "ziina" && (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <p className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Ziina Payment</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Send payment to Ziina number</span><span className="font-mono font-medium">+961 70 000 000</span>
                  <span className="text-muted-foreground">Account Name</span><span className="font-medium">Carcierge SAL</span>
                  <span className="text-muted-foreground">Amount</span><span className="font-medium text-green-600">$50.00 USD</span>
                  <span className="text-muted-foreground">Reference</span><span className="font-mono font-medium">CAR-{createdVehicleId}</span>
                </div>
              </div>
            )}
            {paymentMethod === "payment_link" && (
              <div className="rounded-lg border p-4 space-y-3 text-sm">
                <p className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" /> Online Payment Link</p>
                <a
                  href={`https://pay.carcierge.com/subscription?ref=CAR-${createdVehicleId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  <CreditCard className="h-4 w-4" /> Pay $50.00 Online
                </a>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="transferRef">Transfer Reference Number (optional)</Label>
              <Input
                id="transferRef"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="e.g. TXN-20260509-001"
              />
            </div>

            <div className="flex justify-between pt-2 border-t">
              <Button variant="outline" onClick={handlePayLater} className="gap-2">
                <Clock className="h-4 w-4" />
                Pay Later
              </Button>
              <Button onClick={handleConfirmPayment} disabled={isConfirmingPayment} className="gap-2">
                <CreditCard className="h-4 w-4" />
                {isConfirmingPayment ? "Confirming..." : "I Have Made the Payment"}
              </Button>
            </div>
          </div>
        )}

        {/* DONE STEP */}
        {step === "done" && (
          <div className="space-y-6 py-4 text-center">
            <div className="flex justify-center">
              {payLater
                ? <Clock className="h-16 w-16 text-amber-500" />
                : <CheckCircle className="h-16 w-16 text-green-500" />
              }
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {payLater
                  ? "Vehicle Saved — Payment Pending"
                  : activeSubscription
                    ? "Vehicle Registered!"
                    : "Payment Confirmation Sent!"}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {payLater
                  ? "Your vehicle has been saved but is not yet active. Go to the Payments page to complete your $50 subscription payment."
                  : activeSubscription
                    ? "Your vehicle has been registered and is now active in your fleet."
                    : "Your vehicle registration is pending admin approval. You will be notified once your payment is verified."}
              </p>
              {payLater && (
                <Badge variant="outline" className="mt-3 text-amber-600 border-amber-400">
                  Payment Required
                </Badge>
              )}
              {!payLater && !activeSubscription && (
                <Badge variant="outline" className="mt-3 text-amber-600 border-amber-400">
                  Pending Admin Approval
                </Badge>
              )}
            </div>
            <Button onClick={() => { resetForm(); onOpenChange(false); }}>
              Close
            </Button>
          </div>
        )}

        {/* FORM STEP */}
        {step === "form" && (
          <>
            {!activeSubscription && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> Vehicle registration requires a <strong>$50 USD annual subscription</strong>. You will be prompted to pay after completing this form.
                </span>
              </div>
            )}
            {activeSubscription && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 flex gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span className="text-green-700 dark:text-green-400">
                  Active subscription — no additional payment required.
                  Expires: {(activeSubscription as any).expiresAt ? new Date((activeSubscription as any).expiresAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                <TabsTrigger value="owner">Owner</TabsTrigger>
                <TabsTrigger value="registration">Registration</TabsTrigger>
                <TabsTrigger value="insurance">Insurance</TabsTrigger>
                <TabsTrigger value="inspection">Inspection</TabsTrigger>
              </TabsList>

              {/* Vehicle Tab */}
              <TabsContent value="vehicle" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label htmlFor="make">Make *</Label>
                    <Input id="make" value={vehicleData.make} onChange={(e) => setVehicleData({ ...vehicleData, make: e.target.value })} placeholder="Toyota, Honda, etc." />
                  </div>
                  <div><Label htmlFor="model">Model *</Label>
                    <Input id="model" value={vehicleData.model} onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })} placeholder="Camry, Civic, etc." />
                  </div>
                  <div><Label htmlFor="year">Year</Label>
                    <Input id="year" type="number" value={vehicleData.year} onChange={(e) => setVehicleData({ ...vehicleData, year: parseInt(e.target.value) })} />
                  </div>
                  <div><Label htmlFor="plateNumber">Plate Number *</Label>
                    <Input id="plateNumber" value={vehicleData.plateNumber} onChange={(e) => setVehicleData({ ...vehicleData, plateNumber: e.target.value })} placeholder="ABC-1234" />
                  </div>
                  <div><Label htmlFor="vin">Chassis Number (VIN)</Label>
                    <Input id="vin" value={vehicleData.vin} onChange={(e) => setVehicleData({ ...vehicleData, vin: e.target.value })} placeholder="VIN..." />
                  </div>
                  <div><Label htmlFor="engineNumber">Engine Number</Label>
                    <Input id="engineNumber" value={vehicleData.engineNumber} onChange={(e) => setVehicleData({ ...vehicleData, engineNumber: e.target.value })} placeholder="ENG-..." />
                  </div>
                  <div>
                    <Label htmlFor="engineType">Engine Type</Label>
                    <Select value={vehicleData.engineType} onValueChange={(value) => setVehicleData({ ...vehicleData, engineType: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Select value={vehicleData.vehicleType} onValueChange={(value) => setVehicleData({ ...vehicleData, vehicleType: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Car">Car</SelectItem>
                        <SelectItem value="Bike">Bike</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Country</Label>
                    <CountrySelect value={vehicleData.country} onChange={(v) => handleCountryChange("vehicle", v)} />
                  </div>
                </div>
              </TabsContent>

              {/* Owner Tab */}
              <TabsContent value="owner" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Full Name *</Label>
                    <Input value={ownerData.name} onChange={(e) => setOwnerData({ ...ownerData, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div><Label>Email *</Label>
                    <Input type="email" value={ownerData.email} onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                  <div><Label>Phone Number</Label>
                    <Input value={ownerData.phoneNumber} onChange={(e) => setOwnerData({ ...ownerData, phoneNumber: e.target.value })} placeholder="+1 555 000 0000" />
                  </div>
                  <div><Label>Driver License Number</Label>
                    <Input value={ownerData.licenseNumber} onChange={(e) => setOwnerData({ ...ownerData, licenseNumber: e.target.value })} placeholder="DL-12345678" />
                  </div>
                  <div className="col-span-2">
                    <Label>Country</Label>
                    <CountrySelect value={ownerData.country} onChange={(v) => handleCountryChange("owner", v)} />
                  </div>
                </div>
              </TabsContent>

              {/* Registration Tab */}
              <TabsContent value="registration" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Registration Number *</Label>
                    <Input value={registrationData.registrationNumber} onChange={(e) => setRegistrationData({ ...registrationData, registrationNumber: e.target.value })} placeholder="REG-12345" />
                  </div>
                  <div><Label>Registration Date</Label>
                    <Input type="date" value={registrationData.registrationDate} onChange={(e) => setRegistrationData({ ...registrationData, registrationDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Issuing Authority</Label>
                    <Select value={registrationData.issuingAuthority} onValueChange={(v) => setRegistrationData({ ...registrationData, issuingAuthority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Government">Government</SelectItem>
                        <SelectItem value="Municipality">Municipality</SelectItem>
                        <SelectItem value="Traffic Department">Traffic Department</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Expiry Date {(registrationData.country === "Lebanon" || vehicleData.country === "Lebanon") ? "(Lebanon — no expiry)" : "*"}</Label>
                    {(registrationData.country === "Lebanon" || vehicleData.country === "Lebanon") ? (
                      <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-muted-foreground text-sm">
                        No Expiry (Lebanon default)
                      </div>
                    ) : (
                      <Input type="date" value={registrationData.expiryDate} onChange={(e) => setRegistrationData({ ...registrationData, expiryDate: e.target.value })} />
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label>Country</Label>
                    <CountrySelect value={registrationData.country} onChange={(v) => handleCountryChange("registration", v)} />
                  </div>
                </div>
              </TabsContent>

              {/* Insurance Tab */}
              <TabsContent value="insurance" className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Insurance Policy 1</h3>
                  <InsuranceForm index={0} />
                </div>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Switch id="second-insurance" checked={hasSecondInsurance} onCheckedChange={handleToggleSecondInsurance} />
                  <Label htmlFor="second-insurance" className="cursor-pointer">Add a second insurance policy</Label>
                </div>
                {hasSecondInsurance && (
                  <div>
                    <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Insurance Policy 2</h3>
                    <InsuranceForm index={1} />
                  </div>
                )}
              </TabsContent>

              {/* Inspection Tab */}
              <TabsContent value="inspection" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Inspection Date</Label>
                    <Input type="date" value={inspectionData.inspectionDate} onChange={(e) => setInspectionData({ ...inspectionData, inspectionDate: e.target.value })} />
                  </div>
                  <div><Label>Inspection Expiry Date *</Label>
                    <Input type="date" value={inspectionData.expiryDate} onChange={(e) => setInspectionData({ ...inspectionData, expiryDate: e.target.value })} />
                  </div>
                  <div><Label>Invoice Number *</Label>
                    <Input value={inspectionData.invoiceNumber} onChange={(e) => setInspectionData({ ...inspectionData, invoiceNumber: e.target.value })} placeholder="INV-12345" />
                  </div>
                  <div><Label>Country</Label>
                    <CountrySelect value={inspectionData.country} onChange={(v) => handleCountryChange("inspection", v)} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <div className="flex gap-2">
                {activeTab !== "inspection" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const tabs = ["vehicle", "owner", "registration", "insurance", "inspection"];
                      const idx = tabs.indexOf(activeTab);
                      if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
                    }}
                  >
                    Next
                  </Button>
                )}
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Registering..." : "Register Vehicle"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
