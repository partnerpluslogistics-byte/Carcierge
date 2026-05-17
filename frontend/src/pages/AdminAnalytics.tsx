import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Car, FileText, Shield, DollarSign, ClipboardList, AlertTriangle, TrendingUp } from "lucide-react";

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: number | string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="border-border/50 hover:border-accent/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const emptyStats = {
  users: { total: 0, active: 0, newThisMonth: 0, archived: 0 },
  vehicles: { total: 0, byType: {}, byCountry: [] },
  registrations: { total: 0, active: 0, expiringSoon: 0, expired: 0 },
  insurance: { total: 0, active: 0, expiringSoon: 0, expired: 0 },
  serviceRequests: { total: 0, byType: [], byStatus: [] },
  payments: { totalAmount: 0, pendingCount: 0, approvedCount: 0 },
};

const countArrayToEntries = (
  rows: Array<Record<string, unknown>>,
  labelKey: string
): [string, number][] =>
  rows.map((row) => [
    String(row[labelKey] ?? "Unknown"),
    Number(row.count ?? 0),
  ]);

export default function AdminAnalytics() {
  const { user } = useAuth();
  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: adminApi.getAnalytics,
  });
  const data = analyticsQuery.data;

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

  if (analyticsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!data) return null;

  const users = data.userStats ?? data.users ?? emptyStats.users;
  const vehicles = data.vehicleStats ?? data.vehicles ?? emptyStats.vehicles;
  const registrations = data.registrationStats ?? data.registrations ?? emptyStats.registrations;
  const insurance = data.insuranceStats ?? data.insurance ?? emptyStats.insurance;
  const serviceRequests = data.serviceRequestStats ?? data.serviceRequests ?? emptyStats.serviceRequests;
  const payments = data.paymentStats ?? data.payments ?? emptyStats.payments;

  const vehicleTypeEntries = Object.entries(vehicles.byType ?? {})
    .map(([label, count]) => [label, Number(count)] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const vehicleCountryEntries = countArrayToEntries(vehicles.byCountry ?? [], "country")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const requestTypeEntries = countArrayToEntries(serviceRequests.byType ?? [], "type")
    .sort((a, b) => b[1] - a[1]);
  const requestStatusEntries = countArrayToEntries(serviceRequests.byStatus ?? [], "status")
    .sort((a, b) => b[1] - a[1]);
  const maxVehicleType = Math.max(...vehicleTypeEntries.map((entry) => entry[1]), 1);
  const maxCountry = Math.max(...vehicleCountryEntries.map((entry) => entry[1]), 1);
  const maxReqType = Math.max(...requestTypeEntries.map((entry) => entry[1]), 1);
  const maxReqStatus = Math.max(...requestStatusEntries.map((entry) => entry[1]), 1);
  const totalRevenue = Number(payments.totalRevenue ?? payments.totalAmount ?? 0);
  const totalPayments = Number(payments.totalCount ?? payments.approvedCount ?? 0) + Number(payments.pendingCount ?? 0);

  const typeColors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-orange-500"];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-accent" />
          System Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Platform-wide statistics and insights</p>
      </div>

      {/* Top-level KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Users" value={users.total} sub={`${users.active} active`} icon={Users} color="text-blue-400" />
        <StatCard title="New (30d)" value={users.newThisMonth} sub="new registrations" icon={Users} color="text-green-400" />
        <StatCard title="Total Vehicles" value={vehicles.total} icon={Car} color="text-accent" />
        <StatCard title="Registrations" value={registrations.total} sub={`${registrations.expiringSoon} expiring`} icon={FileText} color="text-yellow-400" />
        <StatCard title="Insurance" value={insurance.total} sub={`${insurance.expiringSoon} expiring`} icon={Shield} color="text-green-400" />
        <StatCard title="Revenue" value={`$${totalRevenue.toFixed(0)}`} sub={`${payments.pendingCount} pending`} icon={DollarSign} color="text-emerald-400" />
      </div>

      {/* Expiry health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Registration Health
            </CardTitle>
            <CardDescription>Status of all vehicle registrations across the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarRow label="Total" value={registrations.total} max={registrations.total} color="bg-blue-500" />
            <BarRow label="Expiring (30d)" value={registrations.expiringSoon} max={registrations.total} color="bg-yellow-500" />
            <BarRow label="Expired" value={registrations.expired} max={registrations.total} color="bg-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-green-400" />
              Insurance Health
            </CardTitle>
            <CardDescription>Status of all insurance policies across the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarRow label="Total" value={insurance.total} max={insurance.total} color="bg-blue-500" />
            <BarRow label="Expiring (30d)" value={insurance.expiringSoon} max={insurance.total} color="bg-yellow-500" />
            <BarRow label="Expired" value={insurance.expired} max={insurance.total} color="bg-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Vehicles breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4 text-accent" />
              Vehicles by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicleTypeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
            ) : vehicleTypeEntries.map(([type, count], i) => (
              <BarRow key={type} label={type} value={count as number} max={maxVehicleType} color={typeColors[i % typeColors.length]} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4 text-blue-400" />
              Vehicles by Country (Top 6)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicleCountryEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
            ) : vehicleCountryEntries.map(([country, count], i) => (
              <BarRow key={country} label={country} value={count as number} max={maxCountry} color={typeColors[i % typeColors.length]} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Service requests breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-purple-400" />
              Service Requests by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestTypeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service requests yet.</p>
            ) : requestTypeEntries.map(([type, count], i) => (
              <BarRow key={type} label={type} value={count as number} max={maxReqType} color={typeColors[i % typeColors.length]} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-orange-400" />
              Service Requests by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestStatusEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service requests yet.</p>
            ) : requestStatusEntries.map(([status, count], i) => (
              <BarRow key={status} label={status} value={count as number} max={maxReqStatus} color={typeColors[i % typeColors.length]} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Payments summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Payment Summary
          </CardTitle>
          <CardDescription>Overview of all payment transactions on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">${totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Approved Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{payments.pendingCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Pending Payments</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{totalPayments}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
