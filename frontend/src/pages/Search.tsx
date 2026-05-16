import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Loader2, Car, User, FileText, Shield } from "lucide-react";

export default function Search() {
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", searchTerm],
    queryFn: () => searchApi.search(searchTerm),
    enabled: searchTerm.length > 0,
  });

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed) setSearchTerm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const vehicles: any[] = data?.vehicles ?? [];
  const owners: any[] = data?.owners ?? [];
  const registrations: any[] = data?.registrations ?? [];
  const policies: any[] = data?.policies ?? [];

  const hasResults =
    vehicles.length > 0 ||
    owners.length > 0 ||
    registrations.length > 0 ||
    policies.length > 0;

  const loading = isLoading || isFetching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Search</h1>
        <p className="text-muted-foreground mt-2">
          Search across vehicles, owners, registrations, and insurance policies
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-3">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by plate, make, owner name, policy number..."
          className="max-w-xl"
        />
        <Button onClick={handleSearch} disabled={loading || !inputValue.trim()} className="gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
          Search
        </Button>
      </div>

      {/* Empty / initial state */}
      {!searchTerm && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <SearchIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Enter a search term to get started</p>
            <p className="text-sm mt-1">
              You can search by plate number, make, model, owner name, email, policy number, and more.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && searchTerm && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {/* No results */}
      {searchTerm && !loading && data && !hasResults && (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <SearchIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No results found for &ldquo;{searchTerm}&rdquo;</p>
            <p className="text-sm mt-1">Try a different keyword or check your spelling.</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <div className="space-y-6">
          {/* Vehicles */}
          {vehicles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Car className="h-5 w-5 text-accent" />
                  Vehicles
                  <Badge variant="secondary">{vehicles.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vehicles.map((v: any) => (
                  <div
                    key={v.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {v.make} {v.model} {v.year ? `(${v.year})` : ""}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">{v.plate_number}</p>
                      {v.country && (
                        <p className="text-xs text-muted-foreground">{v.country}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs">{v.vehicle_type}</Badge>
                      <Badge
                        variant={v.payment_status === "paid" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {v.payment_status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Owners */}
          {owners.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-accent" />
                  Owners
                  <Badge variant="secondary">{owners.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {owners.map((o: any) => (
                  <div
                    key={o.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{o.full_name}</p>
                      {o.email && (
                        <p className="text-sm text-muted-foreground">{o.email}</p>
                      )}
                      {o.contact_number && (
                        <p className="text-xs text-muted-foreground">{o.contact_number}</p>
                      )}
                    </div>
                    {o.country && (
                      <Badge variant="outline" className="text-xs shrink-0">{o.country}</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Registrations */}
          {registrations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-accent" />
                  Registrations
                  <Badge variant="secondary">{registrations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {registrations.map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium font-mono">{r.registration_number}</p>
                      {r.issuing_authority && (
                        <p className="text-sm text-muted-foreground">{r.issuing_authority}</p>
                      )}
                      {r.expiry_date && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(r.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={r.status === "Active" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Insurance Policies */}
          {policies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5 text-accent" />
                  Insurance Policies
                  <Badge variant="secondary">{policies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {policies.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium font-mono">{p.policy_number}</p>
                      {p.insurance_provider && (
                        <p className="text-sm text-muted-foreground">{p.insurance_provider}</p>
                      )}
                      {p.policy_end_date && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(p.policy_end_date).toLocaleDateString()}
                        </p>
                      )}
                      {p.coverage_type && (
                        <p className="text-xs text-muted-foreground">{p.coverage_type}</p>
                      )}
                    </div>
                    <Badge
                      variant={p.status === "Active" ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
