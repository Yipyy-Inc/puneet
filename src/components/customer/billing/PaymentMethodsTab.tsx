"use client";

import { useState } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { paymentMethods } from "@/data/payments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Plus,
  Check,
  AlertCircle,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCustomerText } from "@/lib/customer/use-customer-text";

export function PaymentMethodsTab() {
  const { t, fill } = useCustomerText("billing");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { selectedFacility: _selectedFacility } = useCustomerFacility();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [customerPaymentMethods, setCustomerPaymentMethods] = useState(() =>
    paymentMethods.filter((pm) => pm.clientId === customerId),
  );
  const [removeTarget, setRemoveTarget] = useState<
    (typeof customerPaymentMethods)[number] | null
  >(null);

  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
    cardholderName: "",
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCardExpired = (method: (typeof customerPaymentMethods)[number]) => {
    if (!method.cardExpMonth || !method.cardExpYear) return false;
    const now = new Date();
    const expYear = method.cardExpYear;
    const expMonth = method.cardExpMonth;
    return (
      expYear < now.getFullYear() ||
      (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)
    );
  };

  const getCardIcon = (brand?: string) => {
    switch (brand) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      case "discover":
        return "💳";
      default:
        return "💳";
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cardNumber.replace(/\s/g, "").match(/^\d{13,19}$/)) {
      newErrors.cardNumber = t("errCardNumber");
    }

    if (!formData.expiryMonth || !formData.expiryYear) {
      newErrors.expiry = t("errExpiryMissing");
    } else {
      const month = parseInt(formData.expiryMonth);
      const year = parseInt(`20${formData.expiryYear}`);
      const now = new Date();
      if (
        year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1)
      ) {
        newErrors.expiry = t("errCardExpired");
      }
    }

    if (!formData.cvc.match(/^\d{3,4}$/)) {
      newErrors.cvc = t("errCvc");
    }

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = t("errCardholder");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCard = () => {
    if (!validateForm()) {
      toast.error(t("fixErrorsToast"));
      return;
    }

    // Simulate card verification with payment processor (e.g., Fiserv)
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      toast.success(t("cardAddedToast"));
      setIsAddModalOpen(false);
      setFormData({
        cardNumber: "",
        expiryMonth: "",
        expiryYear: "",
        cvc: "",
        cardholderName: "",
        isDefault: false,
      });
      setErrors({});
    }, 800);
  };

  const handleSetDefault = (id: string) => {
    setCustomerPaymentMethods((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id })),
    );
    toast.success(t("defaultUpdatedToast"));
  };

  const removeMethod = (id: string) => {
    setCustomerPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    toast.success(t("cardRemovedToast"));
  };

  const handleRemove = (method: (typeof customerPaymentMethods)[number]) => {
    // Removing the default card needs an explicit confirmation.
    if (method.isDefault) {
      setRemoveTarget(method);
    } else {
      removeMethod(method.id);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t("tabPaymentMethods")}</h2>
          <p className="text-muted-foreground">
            {t("paymentMethodsDescription")}
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 size-4" />
          {t("addPaymentMethod")}
        </Button>
      </div>

      {customerPaymentMethods.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <CreditCard className="text-muted-foreground mx-auto size-12 opacity-50" />
            <p className="font-semibold">{t("noPaymentMethods")}</p>
            <p className="text-muted-foreground text-sm">
              {t("noPaymentMethodsHelp")}
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
              <Plus className="mr-2 size-4" />
              {t("addFirstCard")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customerPaymentMethods.map((method) => {
            return (
              <Card key={method.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getCardIcon(method.cardBrand)}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {method.cardBrand
                            ? method.cardBrand.charAt(0).toUpperCase() +
                              method.cardBrand.slice(1)
                            : t("cardFallback")}{" "}
                          •••• {method.cardLast4}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span>
                            {method.cardExpMonth && method.cardExpYear
                              ? fill("cardExpires", {
                                  month: String(method.cardExpMonth).padStart(
                                    2,
                                    "0",
                                  ),
                                  year: String(method.cardExpYear),
                                })
                              : t("noExpiry")}
                          </span>
                          {isCardExpired(method) && (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              {t("cardExpired")}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault && (
                        <Badge variant="default" className="gap-1">
                          <Check className="size-3" />
                          {t("defaultCard")}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={t("cardActions")}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!method.isDefault && (
                            <DropdownMenuItem
                              onSelect={() => handleSetDefault(method.id)}
                            >
                              <Check className="size-4" />
                              {t("setAsDefault")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => handleRemove(method)}
                          >
                            <Trash2 className="size-4" />
                            {t("removeCard")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addPaymentMethod")}</DialogTitle>
            <DialogDescription>{t("addPaymentMethodHelp")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">{t("cardNumber")}</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  setFormData({ ...formData, cardNumber: formatted });
                  if (errors.cardNumber)
                    setErrors({ ...errors, cardNumber: "" });
                }}
                maxLength={19}
                aria-invalid={!!errors.cardNumber}
              />
              {errors.cardNumber && (
                <p className="text-destructive flex items-center gap-1 text-sm">
                  <AlertCircle className="size-3" />
                  {errors.cardNumber}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">{t("expiryMonth")}</Label>
                <Input
                  id="expiryMonth"
                  placeholder={t("monthPlaceholder")}
                  value={formData.expiryMonth}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setFormData({ ...formData, expiryMonth: value });
                    if (errors.expiry) setErrors({ ...errors, expiry: "" });
                  }}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryYear">{t("expiryYear")}</Label>
                <Input
                  id="expiryYear"
                  placeholder={t("yearPlaceholder")}
                  value={formData.expiryYear}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setFormData({ ...formData, expiryYear: value });
                    if (errors.expiry) setErrors({ ...errors, expiry: "" });
                  }}
                  maxLength={2}
                />
              </div>
            </div>
            {errors.expiry && (
              <p className="text-destructive flex items-center gap-1 text-sm">
                <AlertCircle className="size-3" />
                {errors.expiry}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="cvc">CVC</Label>
              <Input
                id="cvc"
                placeholder="123"
                value={formData.cvc}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setFormData({ ...formData, cvc: value });
                  if (errors.cvc) setErrors({ ...errors, cvc: "" });
                }}
                maxLength={4}
                aria-invalid={!!errors.cvc}
              />
              {errors.cvc && (
                <p className="text-destructive flex items-center gap-1 text-sm">
                  <AlertCircle className="size-3" />
                  {errors.cvc}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">{t("cardholderName")}</Label>
              <Input
                id="cardholderName"
                placeholder={t("cardholderPlaceholder")}
                value={formData.cardholderName}
                onChange={(e) => {
                  setFormData({ ...formData, cardholderName: e.target.value });
                  if (errors.cardholderName)
                    setErrors({ ...errors, cardholderName: "" });
                }}
                aria-invalid={!!errors.cardholderName}
              />
              {errors.cardholderName && (
                <p className="text-destructive flex items-center gap-1 text-sm">
                  <AlertCircle className="size-3" />
                  {errors.cardholderName}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleAddCard}>
              {isVerifying ? t("verifying") : t("verifyAndSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm removing the default card */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeDefaultTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeDefaultBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) removeMethod(removeTarget.id);
                setRemoveTarget(null);
              }}
            >
              {t("removeCardConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
