"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type { OpsSupplier } from "@/types/ops-inventory";

type Props = {
  open: boolean;
  supplier: OpsSupplier | null;
  onClose: () => void;
  onSave: (data: Omit<OpsSupplier, "id">) => void;
};

const EMPTY_FORM: Omit<OpsSupplier, "id"> = {
  name: "",
  contactPerson: undefined,
  phone: undefined,
  email: undefined,
  address: undefined,
  website: undefined,
  orderingPortalUrl: undefined,
  orderingPortalUsername: undefined,
  orderingPortalPassword: undefined,
  paymentTerms: undefined,
  status: "active",
  notes: undefined,
  categories: [],
};

export function SupplierModal({ open, supplier, onClose, onSave }: Props) {
  const [form, setForm] = useState<Omit<OpsSupplier, "id">>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(supplier ? { ...supplier } : { ...EMPTY_FORM });
      setShowPassword(false);
    }
  }, [open, supplier]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
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
                  placeholder="e.g. CleanPro Supplies"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website</Label>
                <div className="relative">
                  <Globe className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    value={form.website ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, website: e.target.value || undefined })
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

          {/* Contact Person */}
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
                          copyToClipboard(form.orderingPortalUsername!, "Username")
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
                            orderingPortalPassword: e.target.value || undefined,
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
                          copyToClipboard(form.orderingPortalPassword!, "Password")
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
                    setForm({ ...form, status: v as "active" | "inactive" })
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {supplier ? "Save Changes" : "Add Supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
