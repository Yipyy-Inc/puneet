"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Package,
  Truck,
  Tag,
  Ruler,
  Shield,
  Sparkles,
  Pencil,
  Globe,
  Mail,
  Phone,
  User,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { retailConfig, type RetailSupplier } from "@/data/retail-config";

const COLOR_OPTIONS = [
  { value: "red", label: "Red", dot: "bg-red-500" },
  { value: "amber", label: "Amber", dot: "bg-amber-500" },
  { value: "emerald", label: "Green", dot: "bg-emerald-500" },
  { value: "blue", label: "Blue", dot: "bg-blue-500" },
  { value: "purple", label: "Purple", dot: "bg-purple-500" },
  { value: "pink", label: "Pink", dot: "bg-pink-500" },
  { value: "slate", label: "Gray", dot: "bg-slate-500" },
];

let _id = 800;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}-${_id}`;
}

export function RetailSettings() {
  const { role } = useFacilityRole();
  const [categories, setCategories] = useState(retailConfig.categories);
  const [suppliers, setSuppliers] = useState(retailConfig.suppliers);
  const [brands, setBrands] = useState(retailConfig.brands);
  const [tags, setTags] = useState(retailConfig.productTags);
  const [units, setUnits] = useState(retailConfig.unitsOfMeasure);

  // Inline add state
  const [newCat, setNewCat] = useState("");
  const [newSup, setNewSup] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [newUnit, setNewUnit] = useState("");

  const handleSave = () => {
    retailConfig.categories = categories;
    retailConfig.suppliers = suppliers;
    retailConfig.brands = brands;
    retailConfig.productTags = tags;
    retailConfig.unitsOfMeasure = units;
    toast.success("Retail settings saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Retail settings are only accessible to facility owners and managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Retail / POS Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure product categories, suppliers, brands, tags, and units for
          your retail module.
        </p>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4" />
            Product Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2"
            >
              <Input
                value={cat.name}
                onChange={(e) => {
                  const next = [...categories];
                  next[idx] = { ...cat, name: e.target.value };
                  setCategories(next);
                }}
                className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Select
                value={cat.status}
                onValueChange={(v) => {
                  const next = [...categories];
                  next[idx] = {
                    ...cat,
                    status: v as "active" | "draft",
                  };
                  setCategories(next);
                }}
              >
                <SelectTrigger className="h-6 w-20 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">
                    Active
                  </SelectItem>
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                onClick={() =>
                  setCategories(categories.filter((_, i) => i !== idx))
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCat.trim()) {
                  setCategories([
                    ...categories,
                    {
                      id: nextId("cat"),
                      name: newCat.trim(),
                      status: "active",
                      sortOrder: categories.length,
                    },
                  ]);
                  setNewCat("");
                }
              }}
              placeholder="Add category..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newCat.trim()}
              onClick={() => {
                setCategories([
                  ...categories,
                  {
                    id: nextId("cat"),
                    name: newCat.trim(),
                    status: "active",
                    sortOrder: categories.length,
                  },
                ]);
                setNewCat("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers */}
      <SupplierSection
        suppliers={suppliers}
        onUpdate={setSuppliers}
        nextId={nextId}
      />

      {/* Brands */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4" />
            Brands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {brands.map((brand, idx) => (
              <div
                key={brand.id}
                className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
              >
                <span className="text-xs font-medium">{brand.name}</span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setBrands(brands.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBrand.trim()) {
                  setBrands([
                    ...brands,
                    { id: nextId("br"), name: newBrand.trim() },
                  ]);
                  setNewBrand("");
                }
              }}
              placeholder="Add brand..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newBrand.trim()}
              onClick={() => {
                setBrands([
                  ...brands,
                  { id: nextId("br"), name: newBrand.trim() },
                ]);
                setNewBrand("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            Product Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => {
              const colorDot =
                COLOR_OPTIONS.find((c) => c.value === tag.color)?.dot ??
                "bg-slate-500";
              return (
                <div
                  key={tag.id}
                  className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
                >
                  <div className={cn("size-2 rounded-full", colorDot)} />
                  <span className="text-xs font-medium">{tag.name}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="h-8 flex-1 text-sm"
            />
            <Select value={newTagColor} onValueChange={setNewTagColor}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "size-2.5 rounded-full",
                      COLOR_OPTIONS.find((c) => c.value === newTagColor)?.dot,
                    )}
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2.5 rounded-full", c.dot)} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newTag.trim()}
              onClick={() => {
                setTags([
                  ...tags,
                  {
                    id: nextId("tag"),
                    name: newTag.trim(),
                    color: newTagColor,
                  },
                ]);
                setNewTag("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Units of Measure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Ruler className="size-4" />
            Units of Measure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {units.map((unit, idx) => (
              <div
                key={unit.id}
                className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
              >
                <span className="text-xs font-medium">{unit.name}</span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setUnits(units.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newUnit.trim()) {
                  setUnits([
                    ...units,
                    { id: nextId("unit"), name: newUnit.trim() },
                  ]);
                  setNewUnit("");
                }
              }}
              placeholder="Add unit..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newUnit.trim()}
              onClick={() => {
                setUnits([
                  ...units,
                  { id: nextId("unit"), name: newUnit.trim() },
                ]);
                setNewUnit("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Retail Settings
        </Button>
      </div>
    </div>
  );
}

// ── Supplier Section ─────────────────────────────────────────────────

function emptySupplier(id: string): RetailSupplier {
  return { id, name: "", status: "active" };
}

function SupplierSection({
  suppliers,
  onUpdate,
  nextId,
}: {
  suppliers: RetailSupplier[];
  onUpdate: (s: RetailSupplier[]) => void;
  nextId: (prefix: string) => string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RetailSupplier | null>(null);
  const [form, setForm] = useState<RetailSupplier>(emptySupplier(""));
  const [showPassword, setShowPassword] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptySupplier(nextId("sup")));
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (sup: RetailSupplier) => {
    setEditing(sup);
    setForm({ ...sup });
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (editing) {
      onUpdate(suppliers.map((s) => (s.id === editing.id ? form : s)));
      toast.success(`"${form.name}" updated`);
    } else {
      onUpdate([...suppliers, form]);
      toast.success(`"${form.name}" added`);
    }
    setModalOpen(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-3">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100">
              <Truck className="size-4 text-indigo-700" />
            </div>
            Suppliers
            <Badge variant="secondary" className="text-[10px]">
              {suppliers.length}
            </Badge>
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-3.5" />
            Add Supplier
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Truck className="text-muted-foreground/30 size-10" />
              <p className="text-muted-foreground mt-2 text-sm">
                No suppliers yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {suppliers.map((sup) => (
                <div
                  key={sup.id}
                  className="group flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{sup.name}</p>
                      {sup.status === "inactive" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                      {sup.orderingPortalUrl && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <KeyRound className="size-2.5" />
                          Portal
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                      {sup.contactPerson && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {sup.contactPerson}
                        </span>
                      )}
                      {sup.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />
                          {sup.email}
                        </span>
                      )}
                      {sup.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {sup.phone}
                        </span>
                      )}
                      {sup.paymentTerms && (
                        <Badge variant="outline" className="text-[10px]">
                          {sup.paymentTerms}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEdit(sup)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() => {
                        onUpdate(suppliers.filter((s) => s.id !== sup.id));
                        toast.success(`"${sup.name}" removed`);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto py-1 pr-1">
            {/* Company */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Company
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. PawNutrition Inc."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Website</Label>
                  <div className="relative">
                    <Globe className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.website ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          website: e.target.value || undefined,
                        })
                      }
                      placeholder="https://..."
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={form.address ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value || undefined })
                  }
                  placeholder="Street address, city, state, zip"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Contact Person
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <div className="relative">
                    <User className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.contactPerson ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contactPerson: e.target.value || undefined,
                        })
                      }
                      placeholder="Contact name"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.phone ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value || undefined })
                      }
                      placeholder="(555) 000-0000"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={form.email ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value || undefined })
                      }
                      placeholder="email@supplier.com"
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ordering Portal */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Ordering Portal
              </p>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs">Portal URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ExternalLink className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                      <Input
                        value={form.orderingPortalUrl ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            orderingPortalUrl: e.target.value || undefined,
                          })
                        }
                        placeholder="https://portal.supplier.com"
                        className="pl-8"
                      />
                    </div>
                    {form.orderingPortalUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          window.open(form.orderingPortalUrl, "_blank")
                        }
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Username</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={form.orderingPortalUsername ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            orderingPortalUsername: e.target.value || undefined,
                          })
                        }
                        placeholder="Username"
                      />
                      {form.orderingPortalUsername && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              form.orderingPortalUsername!,
                              "Username",
                            )
                          }
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Password</Label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.orderingPortalPassword ?? ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              orderingPortalPassword:
                                e.target.value || undefined,
                            })
                          }
                          placeholder="Password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-muted-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                        >
                          {showPassword ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                      {form.orderingPortalPassword && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          onClick={() =>
                            copyToClipboard(
                              form.orderingPortalPassword!,
                              "Password",
                            )
                          }
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Notes */}
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Payment & Notes
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Terms</Label>
                  <Select
                    value={form.paymentTerms ?? ""}
                    onValueChange={(v) =>
                      setForm({ ...form, paymentTerms: v || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={form.status ?? "active"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        status: v as "active" | "inactive",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value || undefined })
                  }
                  placeholder="Special instructions, minimum orders, etc."
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
