import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Car, Search, Globe, User, Shield, FileText, Wrench, Download, Upload, CheckCircle, XCircle, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function getExpiryStatus(dateStr: string | null | undefined) {
  if (!dateStr) return { label: "Unknown", color: "bg-gray-100 text-gray-700" };
  const expiry = new Date(String(dateStr));
  const today = new Date();
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", color: "bg-red-100 text-red-700" };
  if (diffDays <= 30) return { label: `Expiring in ${diffDays}d`, color: "bg-yellow-100 text-yellow-700" };
  return { label: "Active", color: "bg-green-100 text-green-700" };
}

export default function AdminVehicles() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Admin edit vehicle
  const [editVehicleOpen, setEditVehicleOpen] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState<number | null>(null);
  const [evForm, setEvForm] = useState({
    plateNumber: "", vin: "", make: "", model: "",
    year: "", color: "", country: "",
    vehicleType: "Car" as "Car" | "Bike",
    engineType: "Petrol" as "Petrol" | "Diesel" | "Electric" | "Hybrid",
    mileage: "",
  });

  // Admin edit registration
  const [editRegOpen, setEditRegOpen] = useState(false);
  const [editRegId, setEditRegId] = useState<number | null>(null);
  const [erForm, setErForm] = useState({ registrationNumber: "", issuingAuthority: "", registrationDate: "", expiryDate: "", country: "", status: "Active" as "Active" | "Expiring Soon" | "Expired" });

  // Admin edit insurance
  const [editInsOpen, setEditInsOpen] = useState(false);
  const [editInsId, setEditInsId] = useState<number | null>(null);
  const [eiForm, setEiForm] = useState({ policyNumber: "", insuranceProvider: "", coverageType: "Comprehensive" as "Comprehensive" | "3rd Party" | "Mandatory", premiumAmount: "", policyStartDate: "", policyEndDate: "", country: "", status: "Active" as "Active" | "Expiring Soon" | "Expired" });

  // Admin edit inspection
  const [editInspOpen, setEditInspOpen] = useState(false);
  const [editInspId, setEditInspId] = useState<number | null>(null);
  const [einForm, setEinForm] = useState({ invoiceNumber: "", inspectionDate: "", expiryDate: "", country: "", status: "Active" as "Active" | "Expiring Soon" | "Expired" });

  // Admin add vehicle on behalf of user
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [avTargetUserId, setAvTargetUserId] = useState<string>("");
  const [avForm, setAvForm] = useState({
    ownerFullName: "", ownerEmail: "", ownerPhone: "",
    plateNumber: "", vin: "", make: "", model: "",
    year: new Date().getFullYear().toString(), color: "",
    vehicleType: "Car" as "Car" | "Bike",
    engineType: "Petrol" as "Petrol" | "Diesel" | "Electric" | "Hybrid",
    country: "",
  });

  const updateRegMutation = trpc.registrations.update.useMutation({
    onSuccess: () => { toast.success("Registration updated!"); setEditRegOpen(false); vehiclesQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const updateInsMutation = trpc.insurancePolicies.update.useMutation({
    onSuccess: () => { toast.success("Insurance updated!"); setEditInsOpen(false); vehiclesQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const updateInspMutation = trpc.inspections.update.useMutation({
    onSuccess: () => { toast.success("Inspection updated!"); setEditInspOpen(false); vehiclesQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateVehicleMutation = trpc.vehicles.update.useMutation({
    onSuccess: () => {
      toast.success("Vehicle updated successfully!");
      setEditVehicleOpen(false);
      setEditVehicleId(null);
      vehiclesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const vehiclesQuery = trpc.adminVehicles.listAll.useQuery();
  const allVehicles = vehiclesQuery.data || [];
  const bulkImportMutation = trpc.vehicles.bulkImport.useMutation();
  const usersQuery = trpc.admin.listUsers.useQuery();
  const allUsers = usersQuery.data || [];
  const adminCreateVehicleMutation = trpc.vehicles.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Vehicle registered successfully on behalf of user!");
      setAddVehicleOpen(false);
      setAvTargetUserId("");
      setAvForm({ ownerFullName: "", ownerEmail: "", ownerPhone: "", plateNumber: "", vin: "", make: "", model: "", year: new Date().getFullYear().toString(), color: "", vehicleType: "Car", engineType: "Petrol", country: "" });
      vehiclesQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (user?.role !== "admin") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            You do not have permission to view this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vehiclesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const filtered = allVehicles.filter((v: any) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.plateNumber?.toLowerCase().includes(q) ||
      v.vin?.toLowerCase().includes(q) ||
      v.owner?.fullName?.toLowerCase().includes(q) ||
      v.owner?.country?.toLowerCase().includes(q) ||
      v.registeredBy?.name?.toLowerCase().includes(q) ||
      v.country?.toLowerCase().includes(q) ||
      v.registrations?.some((r: any) => r.registrationNumber?.toLowerCase().includes(q)) ||
      v.insurancePolicies?.some((i: any) => i.policyNumber?.toLowerCase().includes(q) || i.insuranceProvider?.toLowerCase().includes(q))
    );
  });


  const exportCSV = () => {
    const headers = ["Vehicle Code", "Plate", "Make", "Model", "Year", "Type", "Engine", "Color", "Country", "Owner", "Owner Email", "Owner Phone", "Reg Number", "Reg Authority", "Reg Expiry", "Insurance Provider", "Policy Number", "Coverage", "Insurance Expiry", "Inspection Date", "Inspection Expiry"];
    const rows = filtered.map((v: any) => {
      const reg = v.registrations?.[v.registrations.length - 1];
      const ins = v.insurancePolicies?.[v.insurancePolicies.length - 1];
      const insp = v.inspections?.[v.inspections.length - 1];
      return [
        v.vehicleCode || "",
        v.plateNumber || "",
        v.make || "",
        v.model || "",
        v.year || "",
        v.vehicleType || "",
        v.engineType || "",
        v.color || "",
        v.country || "",
        v.owner?.fullName || "",
        v.owner?.email || "",
        v.owner?.contactNumber || "",
        reg?.registrationNumber || "",
        reg?.registrationAuthority || "",
        reg?.expiryDate ? new Date(reg.expiryDate).toLocaleDateString() : "No Expiry",
        ins?.insuranceProvider || "",
        ins?.policyNumber || "",
        ins?.coverageType || "",
        ins?.policyEndDate ? new Date(ins.policyEndDate).toLocaleDateString() : "",
        insp?.inspectionDate ? new Date(insp.inspectionDate).toLocaleDateString() : "",
        insp?.expiryDate ? new Date(insp.expiryDate).toLocaleDateString() : "",
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carcierge-vehicles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Carcierge — All Vehicles Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Total: ${filtered.length} vehicle(s)`, 14, 22);
    const tableData = filtered.map((v: any) => {
      const reg = v.registrations?.[v.registrations.length - 1];
      const ins = v.insurancePolicies?.[v.insurancePolicies.length - 1];
      const insp = v.inspections?.[v.inspections.length - 1];
      return [
        v.vehicleCode || "—",
        v.plateNumber || "—",
        `${v.make || ""} ${v.model || ""} ${v.year || ""}`.trim(),
        v.owner?.fullName || "—",
        reg?.expiryDate ? new Date(reg.expiryDate).toLocaleDateString() : "No Expiry",
        ins?.policyEndDate ? new Date(ins.policyEndDate).toLocaleDateString() : "—",
        insp?.expiryDate ? new Date(insp.expiryDate).toLocaleDateString() : "—",
      ];
    });
    autoTable(doc, {
      head: [["Code", "Plate", "Vehicle", "Owner", "Reg Expiry", "Insurance Expiry", "Inspection Expiry"]],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`carcierge-vehicles-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <>
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Vehicles</h1>
          <p className="text-muted-foreground mt-1">
            {allVehicles.length} vehicle{allVehicles.length !== 1 ? "s" : ""} registered across all users
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddVehicleOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Vehicle for User
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={filtered.length === 0}>
            <FileText className="h-4 w-4 mr-1.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by plate, chassis, owner, country, provider…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {search ? "No vehicles match your search." : "No vehicles have been registered yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((vehicle) => {
            const latestReg = vehicle.registrations?.[vehicle.registrations.length - 1];
            const latestIns = vehicle.insurancePolicies?.[vehicle.insurancePolicies.length - 1];
            const latestInsp = vehicle.inspections?.[vehicle.inspections.length - 1];

            return (
              <Card key={vehicle.id} className="overflow-hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value="details" className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-accent/5">
                      <div className="flex items-center gap-4 w-full text-left">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Car className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base">{vehicle.make} {vehicle.model} ({vehicle.year})</span>
                            <Badge variant="outline" className="text-xs">{vehicle.vehicleType}</Badge>
                            <span className="font-mono text-xs bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground" title="Vehicle ID (read-only)">ID #{vehicle.id}</span>
                            {vehicle.country && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Globe className="w-3 h-3" />{vehicle.country}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-sm text-muted-foreground">Plate: <strong>{vehicle.plateNumber}</strong></span>
                            {vehicle.vin && <span className="text-sm text-muted-foreground">Chassis: {vehicle.vin}</span>}
                            {vehicle.registeredBy && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" />Registered by: {vehicle.registeredBy.name || vehicle.registeredBy.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 items-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditVehicleId(vehicle.id);
                              setEvForm({
                                plateNumber: vehicle.plateNumber || "",
                                vin: vehicle.vin || "",
                                make: vehicle.make || "",
                                model: vehicle.model || "",
                                year: String(vehicle.year || ""),
                                color: vehicle.color || "",
                                country: vehicle.country || "",
                                vehicleType: (vehicle.vehicleType as "Car" | "Bike") || "Car",
                                engineType: (vehicle.engineType as "Petrol" | "Diesel" | "Electric" | "Hybrid") || "Petrol",
                                mileage: String(vehicle.mileage || ""),
                              });
                              setEditVehicleOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" />Edit
                          </Button>
                          {latestReg && latestReg.expiryDate && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getExpiryStatus(String(latestReg.expiryDate)).color}`}>
                              Reg: {getExpiryStatus(String(latestReg.expiryDate)).label}
                            </span>
                          )}
                          {latestReg && !latestReg.expiryDate && (
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500/20 text-blue-400">
                              Reg: No Expiry
                            </span>
                          )}
                          {latestIns && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getExpiryStatus(String(latestIns.policyEndDate)).color}`}>
                              Ins: {getExpiryStatus(String(latestIns.policyEndDate)).label}
                            </span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

                        {/* Owner */}
                        <div>
                          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground uppercase tracking-wide">
                            <User className="w-4 h-4" /> Owner
                          </h3>
                          {vehicle.owner ? (
                            <div className="space-y-1 text-sm">
                              <p><span className="text-muted-foreground">Name:</span> {vehicle.owner.fullName}</p>
                              <p><span className="text-muted-foreground">Email:</span> {vehicle.owner.email}</p>
                              {vehicle.owner.contactNumber && <p><span className="text-muted-foreground">Phone:</span> {vehicle.owner.contactNumber}</p>}
                              {vehicle.owner.driverLicenseNo && <p><span className="text-muted-foreground">License:</span> {vehicle.owner.driverLicenseNo}</p>}
                              {vehicle.owner.country && <p><span className="text-muted-foreground">Country:</span> {vehicle.owner.country}</p>}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No owner info</p>
                          )}
                        </div>

                        {/* Registration */}
                        <div>
                          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground uppercase tracking-wide">
                            <FileText className="w-4 h-4" /> Registration ({vehicle.registrations?.length || 0})
                          </h3>
                          {vehicle.registrations?.length ? (
                            vehicle.registrations.map((reg) => {
                              const s = reg.expiryDate ? getExpiryStatus(String(reg.expiryDate)) : { color: "bg-blue-500/20 text-blue-400", label: "No Expiry" };
                              return (
                                <div key={reg.id} className="text-sm space-y-1 mb-2 p-2 rounded bg-accent/5">
                                  <div className="flex items-center justify-between">
                                    <p><span className="text-muted-foreground">Reg #:</span> {reg.registrationNumber}</p>
                                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => {
                                      setEditRegId(reg.id);
                                      setErForm({
                                        registrationNumber: (reg as any).registrationNumber || "",
                                        issuingAuthority: (reg as any).issuingAuthority || "",
                                        registrationDate: (reg as any).registrationDate ? String((reg as any).registrationDate).slice(0,10) : "",
                                        expiryDate: reg.expiryDate ? String(reg.expiryDate).slice(0,10) : "",
                                        country: (reg as any).country || "",
                                        status: ((reg as any).status as "Active" | "Expiring Soon" | "Expired") || "Active",
                                      });
                                      setEditRegOpen(true);
                                    }}><Pencil className="h-3 w-3" /></Button>
                                  </div>
                                  <p><span className="text-muted-foreground">Expires:</span> {reg.expiryDate ? new Date(String(reg.expiryDate)).toLocaleDateString() : "No Expiry"}</p>
                                  {(reg as any).country && <p><span className="text-muted-foreground">Country:</span> {(reg as any).country}</p>}
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No registrations</p>
                          )}
                        </div>

                        {/* Insurance */}
                        <div>
                          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground uppercase tracking-wide">
                            <Shield className="w-4 h-4" /> Insurance ({vehicle.insurancePolicies?.length || 0})
                          </h3>
                          {vehicle.insurancePolicies?.length ? (
                            vehicle.insurancePolicies.map((pol) => {
                              const s = getExpiryStatus(String(pol.policyEndDate));
                              return (
                                <div key={pol.id} className="text-sm space-y-1 mb-2 p-2 rounded bg-accent/5">
                                  <div className="flex items-center justify-between">
                                    <p><span className="text-muted-foreground">Policy #:</span> {pol.policyNumber}</p>
                                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => {
                                      setEditInsId(pol.id);
                                      setEiForm({
                                        policyNumber: pol.policyNumber || "",
                                        insuranceProvider: pol.insuranceProvider || "",
                                        coverageType: (pol.coverageType as "Comprehensive" | "3rd Party" | "Mandatory") || "Comprehensive",
                                        premiumAmount: pol.premiumAmount ? String(pol.premiumAmount) : "",
                                        policyStartDate: pol.policyStartDate ? String(pol.policyStartDate).slice(0,10) : "",
                                        policyEndDate: pol.policyEndDate ? String(pol.policyEndDate).slice(0,10) : "",
                                        country: (pol as any).country || "",
                                        status: ((pol as any).status as "Active" | "Expiring Soon" | "Expired") || "Active",
                                      });
                                      setEditInsOpen(true);
                                    }}><Pencil className="h-3 w-3" /></Button>
                                  </div>
                                  <p><span className="text-muted-foreground">Provider:</span> {pol.insuranceProvider}</p>
                                  <p><span className="text-muted-foreground">Type:</span> {pol.coverageType}</p>
                                  <p><span className="text-muted-foreground">Expires:</span> {new Date(String(pol.policyEndDate)).toLocaleDateString()}</p>
                                  {(pol as any).country && <p><span className="text-muted-foreground">Country:</span> {(pol as any).country}</p>}
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No insurance policies</p>
                          )}
                        </div>

                        {/* Inspection */}
                        <div>
                          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground uppercase tracking-wide">
                            <Wrench className="w-4 h-4" /> Inspection ({vehicle.inspections?.length || 0})
                          </h3>
                          {vehicle.inspections?.length ? (
                            vehicle.inspections.map((insp) => {
                              const s = getExpiryStatus(String(insp.expiryDate));
                              return (
                                <div key={insp.id} className="text-sm space-y-1 mb-2 p-2 rounded bg-accent/5">
                                  <div className="flex items-center justify-between">
                                    <p><span className="text-muted-foreground">Invoice #:</span> {insp.invoiceNumber}</p>
                                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => {
                                      setEditInspId(insp.id);
                                      setEinForm({
                                        invoiceNumber: insp.invoiceNumber || "",
                                        inspectionDate: insp.inspectionDate ? String(insp.inspectionDate).slice(0,10) : "",
                                        expiryDate: insp.expiryDate ? String(insp.expiryDate).slice(0,10) : "",
                                        country: (insp as any).country || "",
                                        status: ((insp as any).status as "Active" | "Expiring Soon" | "Expired") || "Active",
                                      });
                                      setEditInspOpen(true);
                                    }}><Pencil className="h-3 w-3" /></Button>
                                  </div>
                                  <p><span className="text-muted-foreground">Date:</span> {new Date(String(insp.inspectionDate)).toLocaleDateString()}</p>
                                  <p><span className="text-muted-foreground">Expires:</span> {new Date(String(insp.expiryDate)).toLocaleDateString()}</p>
                                  {(insp as any).country && <p><span className="text-muted-foreground">Country:</span> {(insp as any).country}</p>}
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No inspections</p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            );
          })}
        </div>
      )}
    </div>

    {/* Edit Vehicle Dialog */}
    <Dialog open={editVehicleOpen} onOpenChange={setEditVehicleOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" /> Edit Vehicle</DialogTitle>
          <DialogDescription>Update vehicle information. Changes are saved immediately.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Make *</Label>
              <Input value={evForm.make} onChange={e => setEvForm(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" />
            </div>
            <div className="space-y-1">
              <Label>Model *</Label>
              <Input value={evForm.model} onChange={e => setEvForm(f => ({ ...f, model: e.target.value }))} placeholder="Camry" />
            </div>
            <div className="space-y-1">
              <Label>Year</Label>
              <Input value={evForm.year} onChange={e => setEvForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" type="number" />
            </div>
            <div className="space-y-1">
              <Label>Plate Number *</Label>
              <Input value={evForm.plateNumber} onChange={e => setEvForm(f => ({ ...f, plateNumber: e.target.value }))} placeholder="ABC-123" />
            </div>
            <div className="space-y-1">
              <Label>VIN / Chassis</Label>
              <Input value={evForm.vin} onChange={e => setEvForm(f => ({ ...f, vin: e.target.value }))} placeholder="VIN123456" />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input value={evForm.color} onChange={e => setEvForm(f => ({ ...f, color: e.target.value }))} placeholder="White" />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={evForm.country} onChange={e => setEvForm(f => ({ ...f, country: e.target.value }))} placeholder="Lebanon" />
            </div>
            <div className="space-y-1">
              <Label>Mileage (km)</Label>
              <Input value={evForm.mileage} onChange={e => setEvForm(f => ({ ...f, mileage: e.target.value }))} placeholder="50000" type="number" />
            </div>
            <div className="space-y-1">
              <Label>Vehicle Type</Label>
              <Select value={evForm.vehicleType} onValueChange={v => setEvForm(f => ({ ...f, vehicleType: v as "Car" | "Bike" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Bike">Bike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Engine Type</Label>
              <Select value={evForm.engineType} onValueChange={v => setEvForm(f => ({ ...f, engineType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditVehicleOpen(false)}>Cancel</Button>
          <Button
            disabled={!evForm.make || !evForm.model || !evForm.plateNumber || updateVehicleMutation.isPending}
            onClick={() => {
              if (!editVehicleId) return;
              updateVehicleMutation.mutate({
                id: editVehicleId,
                make: evForm.make || undefined,
                model: evForm.model || undefined,
                year: evForm.year ? parseInt(evForm.year) : undefined,
                plateNumber: evForm.plateNumber || undefined,
                vin: evForm.vin || undefined,
                color: evForm.color || undefined,
                country: evForm.country || undefined,
                mileage: evForm.mileage ? parseInt(evForm.mileage) : undefined,
                vehicleType: evForm.vehicleType || undefined,
                engineType: evForm.engineType || undefined,
              });
            }}
          >
            {updateVehicleMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : <><Pencil className="h-4 w-4 mr-2" />Save Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Edit Registration Dialog */}
    <Dialog open={editRegOpen} onOpenChange={setEditRegOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Edit Registration</DialogTitle>
          <DialogDescription>Update registration details for this vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Registration Number *</Label>
              <Input value={erForm.registrationNumber} onChange={e => setErForm(f => ({ ...f, registrationNumber: e.target.value }))} placeholder="REG-001" />
            </div>
            <div className="space-y-1">
              <Label>Issuing Authority</Label>
              <Input value={erForm.issuingAuthority} onChange={e => setErForm(f => ({ ...f, issuingAuthority: e.target.value }))} placeholder="DMV" />
            </div>
            <div className="space-y-1">
              <Label>Registration Date</Label>
              <Input type="date" value={erForm.registrationDate} onChange={e => setErForm(f => ({ ...f, registrationDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Expiry Date</Label>
              <Input type="date" value={erForm.expiryDate} onChange={e => setErForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={erForm.country} onChange={e => setErForm(f => ({ ...f, country: e.target.value }))} placeholder="Lebanon" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={erForm.status} onValueChange={v => setErForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditRegOpen(false)}>Cancel</Button>
          <Button disabled={updateRegMutation.isPending || !erForm.registrationNumber} onClick={() => {
            if (!editRegId) return;
            updateRegMutation.mutate({ id: editRegId, registrationNumber: erForm.registrationNumber, issuingAuthority: erForm.issuingAuthority || undefined, registrationDate: erForm.registrationDate || undefined, expiryDate: erForm.expiryDate || undefined, country: erForm.country || undefined, status: erForm.status || undefined });
          }}>
            {updateRegMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : <><Pencil className="h-4 w-4 mr-2" />Save Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Edit Insurance Dialog */}
    <Dialog open={editInsOpen} onOpenChange={setEditInsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Edit Insurance Policy</DialogTitle>
          <DialogDescription>Update insurance policy details for this vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Policy Number *</Label>
              <Input value={eiForm.policyNumber} onChange={e => setEiForm(f => ({ ...f, policyNumber: e.target.value }))} placeholder="POL-001" />
            </div>
            <div className="space-y-1">
              <Label>Insurance Provider</Label>
              <Input value={eiForm.insuranceProvider} onChange={e => setEiForm(f => ({ ...f, insuranceProvider: e.target.value }))} placeholder="AXA" />
            </div>
            <div className="space-y-1">
              <Label>Coverage Type</Label>
              <Select value={eiForm.coverageType} onValueChange={v => setEiForm(f => ({ ...f, coverageType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="3rd Party">3rd Party</SelectItem>
                  <SelectItem value="Mandatory">Mandatory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Premium Amount</Label>
              <Input type="number" value={eiForm.premiumAmount} onChange={e => setEiForm(f => ({ ...f, premiumAmount: e.target.value }))} placeholder="500" />
            </div>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={eiForm.policyStartDate} onChange={e => setEiForm(f => ({ ...f, policyStartDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={eiForm.policyEndDate} onChange={e => setEiForm(f => ({ ...f, policyEndDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={eiForm.country} onChange={e => setEiForm(f => ({ ...f, country: e.target.value }))} placeholder="Lebanon" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={eiForm.status} onValueChange={v => setEiForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditInsOpen(false)}>Cancel</Button>
          <Button disabled={updateInsMutation.isPending || !eiForm.policyNumber} onClick={() => {
            if (!editInsId) return;
            updateInsMutation.mutate({ id: editInsId, policyNumber: eiForm.policyNumber, insuranceProvider: eiForm.insuranceProvider || undefined, coverageType: eiForm.coverageType || undefined, premiumAmount: eiForm.premiumAmount || undefined, policyStartDate: eiForm.policyStartDate || undefined, policyEndDate: eiForm.policyEndDate || undefined, country: eiForm.country || undefined, status: eiForm.status || undefined });
          }}>
            {updateInsMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : <><Pencil className="h-4 w-4 mr-2" />Save Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Edit Inspection Dialog */}
    <Dialog open={editInspOpen} onOpenChange={setEditInspOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Edit Inspection</DialogTitle>
          <DialogDescription>Update inspection details for this vehicle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Invoice Number *</Label>
              <Input value={einForm.invoiceNumber} onChange={e => setEinForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="INV-001" />
            </div>
            <div className="space-y-1">
              <Label>Inspection Date</Label>
              <Input type="date" value={einForm.inspectionDate} onChange={e => setEinForm(f => ({ ...f, inspectionDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Expiry Date</Label>
              <Input type="date" value={einForm.expiryDate} onChange={e => setEinForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={einForm.country} onChange={e => setEinForm(f => ({ ...f, country: e.target.value }))} placeholder="Lebanon" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Status</Label>
              <Select value={einForm.status} onValueChange={v => setEinForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditInspOpen(false)}>Cancel</Button>
          <Button disabled={updateInspMutation.isPending || !einForm.invoiceNumber} onClick={() => {
            if (!editInspId) return;
            updateInspMutation.mutate({ id: editInspId, invoiceNumber: einForm.invoiceNumber, inspectionDate: einForm.inspectionDate || undefined, expiryDate: einForm.expiryDate || undefined, country: einForm.country || undefined, status: einForm.status || undefined });
          }}>
            {updateInspMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : <><Pencil className="h-4 w-4 mr-2" />Save Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* CSV Import Dialog */}
    <Dialog open={importOpen} onOpenChange={(open) => { if (!open) { setImportOpen(false); setImportFile(null); setImportPreview([]); setImportResults(null); if (importFileRef.current) importFileRef.current.value = ""; } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Bulk Import Vehicles from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-md bg-muted/50 text-sm">
            <p className="font-medium mb-1">Required CSV columns:</p>
            <code className="text-xs text-muted-foreground">ownerFullName, ownerEmail, ownerPhone, vehicleType (Car/Bike), plateNumber, vin, make, model, year, color, engineType (Petrol/Diesel/Electric/Hybrid), country</code>
            <div className="mt-1">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => {
                const headers = "ownerFullName,ownerEmail,ownerPhone,vehicleType,plateNumber,vin,make,model,year,color,engineType,country";
                const sample = "John Doe,john@example.com,+1234567890,Car,ABC-123,VIN123456,Toyota,Camry,2022,White,Petrol,USA";
                const blob = new Blob([headers + "\n" + sample], { type: "text/csv" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "vehicle-import-template.csv"; a.click();
              }}>Download template CSV</Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Select CSV File</label>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportFile(file);
                setImportResults(null);
                const text = await file.text();
                const lines = text.trim().split("\n").filter(Boolean);
                if (lines.length < 2) { setImportPreview([]); return; }
                const headers = lines[0].split(",").map((h: string) => h.trim().replace(/^"|"$/g, ""));
                const rows = lines.slice(1).map((line: string) => {
                  const vals = line.split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
                  const obj: any = {};
                  headers.forEach((h: string, i: number) => { obj[h] = vals[i] || ""; });
                  return obj;
                });
                setImportPreview(rows.slice(0, 5));
              }}
            />
          </div>
          {importPreview.length > 0 && !importResults && (
            <div>
              <p className="text-sm font-medium mb-2">Preview (first {importPreview.length} rows):</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      {Object.keys(importPreview[0]).map((h: string) => <th key={h} className="border border-border px-2 py-1 text-left font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/50">
                        {Object.values(row).map((val: any, j: number) => <td key={j} className="border border-border px-2 py-1 truncate max-w-[100px]">{val}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {importResults && (
            <div className="space-y-2">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> {importResults.imported} imported</div>
                {importResults.failed > 0 && <div className="flex items-center gap-1.5 text-sm text-red-600"><XCircle className="h-4 w-4" /> {importResults.failed} failed</div>}
              </div>
              {importResults.results.filter((r: any) => !r.success).map((r: any) => (
                <p key={r.row} className="text-xs text-red-600">Row {r.row} ({r.plateNumber}): {r.error}</p>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setImportOpen(false); setImportFile(null); setImportPreview([]); setImportResults(null); if (importFileRef.current) importFileRef.current.value = ""; }}>Close</Button>
          {!importResults && (
            <Button
              disabled={!importFile || isImporting}
              onClick={async () => {
                if (!importFile) return;
                setIsImporting(true);
                try {
                  const text = await importFile.text();
                  const lines = text.trim().split("\n").filter(Boolean);
                  if (lines.length < 2) { toast.error("CSV file has no data rows"); return; }
                  const hdrs = lines[0].split(",").map((h: string) => h.trim().replace(/^"|"$/g, ""));
                  const rows = lines.slice(1).map((line: string) => {
                    const vals = line.split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
                    const obj: any = {};
                    hdrs.forEach((h: string, i: number) => { obj[h] = vals[i] || ""; });
                    return obj;
                  });
                  const vehicleRows = rows.map((r: any) => ({
                    ownerFullName: r.ownerFullName || "",
                    ownerEmail: r.ownerEmail || undefined,
                    ownerPhone: r.ownerPhone || undefined,
                    vehicleType: (["Car", "Bike"].includes(r.vehicleType) ? r.vehicleType : "Car") as "Car" | "Bike",
                    plateNumber: r.plateNumber || "",
                    vin: r.vin || undefined,
                    make: r.make || "",
                    model: r.model || "",
                    year: parseInt(r.year) || new Date().getFullYear(),
                    color: r.color || undefined,
                    engineType: (["Petrol", "Diesel", "Electric", "Hybrid"].includes(r.engineType) ? r.engineType : "Petrol") as "Petrol" | "Diesel" | "Electric" | "Hybrid",
                    country: r.country || undefined,
                  }));
                  const result = await bulkImportMutation.mutateAsync({ vehicles: vehicleRows });
                  setImportResults(result);
                  if (result.imported > 0) { toast.success(`${result.imported} vehicle(s) imported`); vehiclesQuery.refetch(); }
                  if (result.failed > 0) toast.error(`${result.failed} vehicle(s) failed`);
                } catch (err: any) {
                  toast.error(err.message || "Import failed");
                } finally {
                  setIsImporting(false);
                }
              }}
            >
              {isImporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing...</> : <><Upload className="h-4 w-4 mr-2" />Import</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Admin Add Vehicle for User Dialog */}
    <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Car className="h-5 w-5" /> Register Vehicle on Behalf of User</DialogTitle>
          <DialogDescription>Select a user and fill in the vehicle details. The vehicle will be created with pending_payment status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Select User *</Label>
            <Select value={avTargetUserId} onValueChange={setAvTargetUserId}>
              <SelectTrigger><SelectValue placeholder="Choose a user..." /></SelectTrigger>
              <SelectContent>
                {allUsers.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name || u.email} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Owner Full Name *</Label>
              <Input value={avForm.ownerFullName} onChange={e => setAvForm(f => ({ ...f, ownerFullName: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <Label>Owner Email</Label>
              <Input value={avForm.ownerEmail} onChange={e => setAvForm(f => ({ ...f, ownerEmail: e.target.value }))} placeholder="john@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Owner Phone</Label>
              <Input value={avForm.ownerPhone} onChange={e => setAvForm(f => ({ ...f, ownerPhone: e.target.value }))} placeholder="+1234567890" />
            </div>
            <div className="space-y-1">
              <Label>Plate Number *</Label>
              <Input value={avForm.plateNumber} onChange={e => setAvForm(f => ({ ...f, plateNumber: e.target.value }))} placeholder="ABC-123" />
            </div>
            <div className="space-y-1">
              <Label>Make *</Label>
              <Input value={avForm.make} onChange={e => setAvForm(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" />
            </div>
            <div className="space-y-1">
              <Label>Model *</Label>
              <Input value={avForm.model} onChange={e => setAvForm(f => ({ ...f, model: e.target.value }))} placeholder="Camry" />
            </div>
            <div className="space-y-1">
              <Label>Year *</Label>
              <Input value={avForm.year} onChange={e => setAvForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" type="number" />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input value={avForm.color} onChange={e => setAvForm(f => ({ ...f, color: e.target.value }))} placeholder="White" />
            </div>
            <div className="space-y-1">
              <Label>VIN / Chassis</Label>
              <Input value={avForm.vin} onChange={e => setAvForm(f => ({ ...f, vin: e.target.value }))} placeholder="VIN123456" />
            </div>
            <div className="space-y-1">
              <Label>Country</Label>
              <Input value={avForm.country} onChange={e => setAvForm(f => ({ ...f, country: e.target.value }))} placeholder="Lebanon" />
            </div>
            <div className="space-y-1">
              <Label>Vehicle Type</Label>
              <Select value={avForm.vehicleType} onValueChange={v => setAvForm(f => ({ ...f, vehicleType: v as "Car" | "Bike" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Bike">Bike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Engine Type</Label>
              <Select value={avForm.engineType} onValueChange={v => setAvForm(f => ({ ...f, engineType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddVehicleOpen(false)}>Cancel</Button>
          <Button
            disabled={!avTargetUserId || !avForm.ownerFullName || !avForm.plateNumber || !avForm.make || !avForm.model || adminCreateVehicleMutation.isPending}
            onClick={() => {
              adminCreateVehicleMutation.mutate({
                targetUserId: parseInt(avTargetUserId),
                ownerFullName: avForm.ownerFullName,
                ownerEmail: avForm.ownerEmail || undefined,
                ownerPhone: avForm.ownerPhone || undefined,
                plateNumber: avForm.plateNumber,
                vin: avForm.vin || undefined,
                make: avForm.make,
                model: avForm.model,
                year: parseInt(avForm.year) || new Date().getFullYear(),
                color: avForm.color || undefined,
                vehicleType: avForm.vehicleType,
                engineType: avForm.engineType,
                country: avForm.country || undefined,
              });
            }}
          >
            {adminCreateVehicleMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registering...</> : <><Car className="h-4 w-4 mr-2" />Register Vehicle</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
