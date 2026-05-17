import { useQuery } from "@tanstack/react-query";
import { vehicleApi, serviceRequestApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Car, FileText, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", "list"],
    queryFn: () => vehicleApi.list(),
  });

  const serviceRequestsQuery = useQuery({
    queryKey: ["service-requests", "mine"],
    queryFn: () => serviceRequestApi.listMine(),
  });

  const vehicles: any[] = Array.isArray(vehiclesQuery.data) ? vehiclesQuery.data : [];
  const serviceRequests: any[] = Array.isArray(serviceRequestsQuery.data)
    ? serviceRequestsQuery.data
    : [];

  // --- Vehicle Status Report ---
  const handleExportVehicleStatus = () => {
    try {
      const headers = ["Plate", "Make", "Model", "Year", "Type", "Country", "Payment Status"];
      const rows = vehicles.map((v) => [
        v.plateNumber,
        v.make,
        v.model,
        v.year,
        v.vehicleType,
        v.country,
        v.paymentStatus?.replace(/_/g, " "),
      ]);
      downloadCSV("vehicle-status-report", headers, rows);
      toast.success("Vehicle Status Report exported.");
    } catch {
      toast.error("Failed to export report.");
    }
  };

  // --- Expiry Status Report ---
  const handleExportExpiryStatus = () => {
    try {
      const headers = [
        "Plate",
        "Make",
        "Model",
        "Registration Expiry",
        "Insurance Expiry",
        "Inspection Expiry",
        "Status",
      ];

      const rows = vehicles.map((v: any) => {
        const reg = v.registrations?.[0];
        const ins = v.insurancePolicies?.[0];
        const insp = v.inspections?.[0];

        return [
          v.plateNumber,
          v.make,
          v.model,
          reg?.expiryDate ? new Date(reg.expiryDate).toLocaleDateString() : "N/A",
          ins?.policyEndDate ? new Date(ins.policyEndDate).toLocaleDateString() : "N/A",
          insp?.expiryDate ? new Date(insp.expiryDate).toLocaleDateString() : "N/A",
          v.paymentStatus?.replace(/_/g, " "),
        ];
      });

      downloadCSV("expiry-status-report", headers, rows);
      toast.success("Expiry Status Report exported.");
    } catch {
      toast.error("Failed to export report.");
    }
  };

  // --- Service Requests Report ---
  const handleExportServiceRequests = () => {
    try {
      const headers = ["Vehicle Plate", "Request Type", "Status", "Created Date", "Notes"];
      const rows = serviceRequests.map((sr: any) => [
        sr.vehicleId ?? "N/A",
        sr.requestType,
        sr.status,
        new Date(sr.createdAt).toLocaleDateString(),
        sr.notes ?? "",
      ]);
      downloadCSV("service-requests-report", headers, rows);
      toast.success("Service Requests Report exported.");
    } catch {
      toast.error("Failed to export report.");
    }
  };

  const isLoadingVehicles = vehiclesQuery.isLoading;
  const isLoadingSR = serviceRequestsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate and export reports for your fleet data
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Vehicle Status Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-accent" />
              Vehicle Status Report
            </CardTitle>
            <CardDescription>
              Summary of all vehicles with plate, make, model, year, type, country, and payment
              status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingVehicles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <p className="text-2xl font-bold">
                {vehicles.length}{" "}
                <span className="text-sm font-normal text-muted-foreground">vehicle(s)</span>
              </p>
            )}
            <Button
              onClick={handleExportVehicleStatus}
              disabled={isLoadingVehicles || vehicles.length === 0}
              className="w-full gap-2"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        {/* Expiry Status Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              Expiry Status Report
            </CardTitle>
            <CardDescription>
              Registration, insurance, and inspection expiry dates for all vehicles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingVehicles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <p className="text-2xl font-bold">
                {vehicles.length}{" "}
                <span className="text-sm font-normal text-muted-foreground">vehicle(s)</span>
              </p>
            )}
            <Button
              onClick={handleExportExpiryStatus}
              disabled={isLoadingVehicles || vehicles.length === 0}
              className="w-full gap-2"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        {/* Service Requests Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-accent" />
              Service Requests Report
            </CardTitle>
            <CardDescription>
              All service requests with vehicle, request type, status, created date, and notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSR ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <p className="text-2xl font-bold">
                {serviceRequests.length}{" "}
                <span className="text-sm font-normal text-muted-foreground">request(s)</span>
              </p>
            )}
            <Button
              onClick={handleExportServiceRequests}
              disabled={isLoadingSR || serviceRequests.length === 0}
              className="w-full gap-2"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
