import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Car, FileText, Shield, Plus, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VehicleRegistrationModal from "@/components/VehicleRegistrationModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.getSummary(),
  });

  const alertsQuery = useQuery({
    queryKey: ["dashboard", "expiry-alerts"],
    queryFn: () => dashboardApi.getExpiryAlerts(),
  });

  const calendarQuery = useQuery({
    queryKey: ["dashboard", "calendar-events"],
    queryFn: () => dashboardApi.getCalendarEvents(),
  });

  const summary = summaryQuery.data;
  const alerts: any[] = Array.isArray(alertsQuery.data) ? alertsQuery.data : [];
  const calendarEvents: any[] = Array.isArray(calendarQuery.data) ? calendarQuery.data : [];

  const criticalAlerts = useMemo(() => alerts.filter(a => a.daysRemaining <= 7), [alerts]);
  const warningAlerts = useMemo(() => alerts.filter(a => a.daysRemaining > 7 && a.daysRemaining <= 30), [alerts]);

  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const monthName = calendarDate.toLocaleString("default", { month: "long", year: "numeric" });

  const eventsByDate = useMemo(() => {
    const map: Record<string, { date: string; type: string; label: string; plateNumber: string; severity: string }[]> = {};
    for (const ev of calendarEvents) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [calendarEvents]);

  const prevMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  if (summaryQuery.isLoading || alertsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {(user?.name ?? "").split(" ")[0] || user?.name}</h1>
          <p className="text-muted-foreground mt-2">Here's your vehicle and insurance overview</p>
        </div>
        <Button onClick={() => setRegistrationModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Register New Vehicle
        </Button>
      </div>

      {/* Vehicle Registration Modal */}
      <VehicleRegistrationModal
        open={registrationModalOpen}
        onOpenChange={setRegistrationModalOpen}
        onSuccess={() => {
          summaryQuery.refetch();
          alertsQuery.refetch();
        }}
      />

      {/* Critical Alerts banner */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700 ml-2">
            <strong>{criticalAlerts.length} item(s) expiring within 7 days!</strong> Immediate action required.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/50 hover:border-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.totalVehicles || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.vehicleBreakdown?.cars || 0} cars, {summary?.vehicleBreakdown?.bikes || 0} bikes
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Registrations</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.activeRegistrations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.expiringRegistrations || 0} expiring soon
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Insurance</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.activePolicies || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.expiringPolicies || 0} expiring soon
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-accent/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(summary?.expiredRegistrations || 0) + (summary?.expiredPolicies || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.expiredRegistrations || 0} reg, {summary?.expiredPolicies || 0} insurance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Critical (≤7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalAlerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No critical alerts</p>
            ) : (
              <div className="space-y-3">
                {criticalAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground text-sm">{alert.plateNumber}</p>
                        <p className="text-xs text-muted-foreground capitalize">{alert.type}</p>
                      </div>
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                        {alert.daysRemaining}d
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Expires: {alert.expiryDate}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warnings (8-30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warningAlerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No warnings</p>
            ) : (
              <div className="space-y-3">
                {warningAlerts.slice(0, 5).map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground text-sm">{alert.plateNumber}</p>
                        <p className="text-xs text-muted-foreground capitalize">{alert.type}</p>
                      </div>
                      <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                        {alert.daysRemaining}d
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Expires: {alert.expiryDate}</p>
                  </div>
                ))}
                {warningAlerts.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{warningAlerts.length - 5} more alerts
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiry Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Expiry Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium min-w-[140px] text-center">{monthName}</span>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <CardDescription>Upcoming expiry dates for registrations, insurance, and inspections (next 90 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const today = new Date();
              const isToday = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth && today.getDate() === day;
              const hasCritical = dayEvents.some(e => e.severity === "critical");
              const hasWarning = dayEvents.some(e => e.severity === "warning");
              const hasInfo = dayEvents.some(e => e.severity === "info");
              return (
                <div
                  key={day}
                  className={`min-h-[52px] rounded-md p-1 border transition-colors ${isToday ? "border-primary bg-primary/10" : "border-transparent hover:border-border"} ${dayEvents.length > 0 ? "bg-muted/30" : ""}`}
                  title={dayEvents.map(e => e.label).join(", ")}
                >
                  <div className={`text-xs font-medium mb-0.5 ${isToday ? "text-primary" : "text-foreground"}`}>{day}</div>
                  {hasCritical && <div className="w-full h-1.5 rounded-full bg-red-500 mb-0.5" />}
                  {hasWarning && <div className="w-full h-1.5 rounded-full bg-yellow-500 mb-0.5" />}
                  {hasInfo && <div className="w-full h-1.5 rounded-full bg-blue-400 mb-0.5" />}
                  {dayEvents.length > 0 && (
                    <div className="text-[9px] text-muted-foreground leading-tight truncate">
                      {dayEvents[0].plateNumber}
                      {dayEvents.length > 1 && ` +${dayEvents.length - 1}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1.5 rounded-full bg-red-500" /> Critical (≤7d)</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1.5 rounded-full bg-yellow-500" /> Warning (8-30d)</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-1.5 rounded-full bg-blue-400" /> Upcoming (31-90d)</div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance & Vehicle Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Insurance Summary</CardTitle>
            <CardDescription>Overview of insurance policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Policies</span>
                <span className="font-semibold">{summary?.totalPolicies || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="font-semibold text-green-600">{summary?.activePolicies || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expiring Soon</span>
                <span className="font-semibold text-yellow-600">{summary?.expiringPolicies || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expired</span>
                <span className="font-semibold text-red-600">{summary?.expiredPolicies || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Breakdown</CardTitle>
            <CardDescription>Distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cars</span>
                <span className="font-semibold">{summary?.vehicleBreakdown?.cars || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Bikes</span>
                <span className="font-semibold">{summary?.vehicleBreakdown?.bikes || 0}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3 mt-3">
                <span className="text-sm font-medium">Total</span>
                <span className="font-bold">{summary?.totalVehicles || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
