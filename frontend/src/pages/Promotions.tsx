import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Tag, Plus, Trash2, Percent, DollarSign, AlertCircle } from "lucide-react";

interface DiscountCode {
  id: string;
  name: string;
  code: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

const STORAGE_KEY = "carcierge_discount_codes";

const DEMO_CODES: DiscountCode[] = [
  {
    id: "demo1",
    name: "Summer Sale",
    code: "SUMMER20",
    discountType: "percentage",
    discountValue: 20,
    expiryDate: "2026-08-31",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo2",
    name: "New User Discount",
    code: "NEWUSER10",
    discountType: "flat",
    discountValue: 10,
    expiryDate: "2026-12-31",
    isActive: true,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
];

function loadCodes(): DiscountCode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_CODES));
      return DEMO_CODES;
    }
    return JSON.parse(raw);
  } catch {
    return DEMO_CODES;
  }
}

function saveCodes(codes: DiscountCode[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

const emptyForm = (): Partial<DiscountCode> => ({
  discountType: "percentage",
  isActive: true,
});

export default function Promotions() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<DiscountCode>>(emptyForm());

  useEffect(() => {
    setCodes(loadCodes());
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Only administrators can manage promotions.</p>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    if (!form.code?.trim()) { toast.error("Code is required"); return; }
    if (!form.discountValue || form.discountValue <= 0) { toast.error("Discount value must be greater than 0"); return; }
    if (!form.expiryDate) { toast.error("Expiry date is required"); return; }
    if (form.discountType === "percentage" && form.discountValue > 100) {
      toast.error("Percentage discount cannot exceed 100%"); return;
    }

    const upperCode = form.code.trim().toUpperCase();
    if (codes.some(c => c.code === upperCode)) {
      toast.error("A code with this name already exists"); return;
    }

    const newCode: DiscountCode = {
      id: Date.now().toString(),
      name: form.name.trim(),
      code: upperCode,
      discountType: form.discountType!,
      discountValue: Number(form.discountValue),
      expiryDate: form.expiryDate,
      isActive: form.isActive ?? true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCode, ...codes];
    saveCodes(updated);
    setCodes(updated);
    setDialogOpen(false);
    toast.success("Discount code created");
  };

  const handleToggle = (id: string) => {
    const updated = codes.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c);
    saveCodes(updated);
    setCodes(updated);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this discount code?")) return;
    const updated = codes.filter(c => c.id !== id);
    saveCodes(updated);
    setCodes(updated);
    toast.success("Discount code deleted");
  };

  const isExpired = (expiryDate: string) => new Date(expiryDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" /> Promotions
          </h1>
          <p className="text-muted-foreground mt-1">Manage discount codes for Carcierge subscriptions.</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Discount Code
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discount Codes ({codes.length})</CardTitle>
          <CardDescription>Active and inactive promotion codes. Toggle to enable or disable individual codes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {codes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No discount codes yet. Add one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map(code => {
                  const expired = isExpired(code.expiryDate);
                  return (
                    <TableRow key={code.id}>
                      <TableCell>
                        <span className="font-mono font-semibold text-accent">{code.code}</span>
                      </TableCell>
                      <TableCell>{code.name}</TableCell>
                      <TableCell>
                        <span className="font-semibold flex items-center gap-1">
                          {code.discountType === "percentage"
                            ? <><Percent className="h-3 w-3" />{code.discountValue}%</>
                            : <><DollarSign className="h-3 w-3" />{code.discountValue}</>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={expired ? "text-red-500 text-sm" : "text-sm"}>
                          {new Date(code.expiryDate).toLocaleDateString()}
                          {expired && " (Expired)"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={code.isActive && !expired}
                            onCheckedChange={() => { if (!expired) handleToggle(code.id); }}
                            disabled={expired}
                          />
                          <Badge
                            className={
                              expired
                                ? "bg-gray-100 text-gray-500 border-gray-200"
                                : code.isActive
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                            }
                          >
                            {expired ? "Expired" : code.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(code.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Discount Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Code Name *</Label>
              <Input
                value={form.name || ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Summer Sale"
              />
            </div>
            <div>
              <Label>Code *</Label>
              <Input
                value={form.code || ""}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SUMMER20"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select
                  value={form.discountType || "percentage"}
                  onValueChange={v => setForm(f => ({ ...f, discountType: v as "percentage" | "flat" }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value * {form.discountType === "percentage" ? "(%)" : "($)"}</Label>
                <Input
                  type="number"
                  min={1}
                  max={form.discountType === "percentage" ? 100 : undefined}
                  value={form.discountValue ?? ""}
                  onChange={e => setForm(f => ({ ...f, discountValue: parseFloat(e.target.value) }))}
                  placeholder={form.discountType === "percentage" ? "20" : "10"}
                />
              </div>
            </div>
            <div>
              <Label>Expiry Date *</Label>
              <Input
                type="date"
                value={form.expiryDate || ""}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active on creation</Label>
              <Switch
                checked={form.isActive ?? true}
                onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Create Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
