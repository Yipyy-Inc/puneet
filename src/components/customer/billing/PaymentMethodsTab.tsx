"use client";

import { useState, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { paymentMethods } from "@/data/payments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;
// Mock flag - in production this would come from memberships / packages
const HAS_AUTOPAY_MEMBERSHIP = true;

export function PaymentMethodsTab() {
  const { selectedFacility } = useCustomerFacility();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const customerPaymentMethods = useMemo(() => {
    return paymentMethods.filter((pm) => pm.clientId === MOCK_CUSTOMER_ID);
  }, []);

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
      newErrors.cardNumber = "Please enter a valid card number";
    }

    if (!formData.expiryMonth || !formData.expiryYear) {
      newErrors.expiry = "Please enter expiry date";
    } else {
      const month = parseInt(formData.expiryMonth);
      const year = parseInt(`20${formData.expiryYear}`);
      const now = new Date();
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
        newErrors.expiry = "Card has expired";
      }
    }

    if (!formData.cvc.match(/^\d{3,4}$/)) {
      newErrors.cvc = "Please enter a valid CVC";
    }

    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = "Please enter cardholder name";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCard = () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    // Simulate card verification with payment processor (e.g., Fiserv)
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      toast.success("Card verified and added successfully!");
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this payment method?")) {
      return;
    }

    setIsDeleting(id);
    // TODO: Call API to delete payment method
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success("Payment method removed");
    setIsDeleting(null);
  };

  const handleSetDefault = async (id: string) => {
    // TODO: Call API to set as default
    toast.success("Default payment method updated");
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Payment Methods</h2>
          <p className="text-muted-foreground">
            Manage your saved credit and debit cards
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {customerPaymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="font-semibold">No payment methods</p>
            <p className="text-sm text-muted-foreground">
              Add a payment method to make booking and payments easier
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customerPaymentMethods.map((method) => {
            const isOnlyCard = customerPaymentMethods.length === 1;
            const disableRemove =
              HAS_AUTOPAY_MEMBERSHIP && isOnlyCard && method.isDefault;

            return (
              <Card key={method.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getCardIcon(method.cardBrand)}</div>
                      <div>
                        <CardTitle className="text-base">
                          {method.cardBrand
                            ? method.cardBrand.charAt(0).toUpperCase() +
                              method.cardBrand.slice(1)
                            : "Card"}{" "}
                          •••• {method.cardLast4}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span>
                            {method.cardExpMonth && method.cardExpYear
                              ? `Expires ${String(method.cardExpMonth).padStart(
                                  2,
                                  "0",
                                )}/${method.cardExpYear}`
                              : "No expiry date"}
                          </span>
                          {isCardExpired(method) && (
                            <Badge variant="destructive" className="text-[10px]">
                              Expired
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    {method.isDefault && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          Set as Default
                        </Button>
                      )}
                      {isCardExpired(method) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsAddModalOpen(true);
                            setFormData((prev) => ({
                              ...prev,
                              cardholderName:
                                method.cardholderName || prev.cardholderName,
                            }));
                          }}
                        >
                          Update Card
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(method.id)}
                        disabled={isDeleting === method.id || disableRemove}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {isDeleting === method.id ? "Removing..." : "Remove"}
                      </Button>
                    </div>
                    {disableRemove && (
                      <p className="text-xs text-muted-foreground">
                        You can’t remove your only card while an auto-pay membership is
                        active. Please add another card first.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new credit or debit card to your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  setFormData({ ...formData, cardNumber: formatted });
                  if (errors.cardNumber) setErrors({ ...errors, cardNumber: "" });
                }}
                maxLength={19}
                aria-invalid={!!errors.cardNumber}
              />
              {errors.cardNumber && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cardNumber}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Input
                  id="expiryMonth"
                  placeholder="MM"
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
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Input
                  id="expiryYear"
                  placeholder="YY"
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
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
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
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cvc}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <Input
                id="cardholderName"
                placeholder="John Doe"
                value={formData.cardholderName}
                onChange={(e) => {
                  setFormData({ ...formData, cardholderName: e.target.value });
                  if (errors.cardholderName) setErrors({ ...errors, cardholderName: "" });
                }}
                aria-invalid={!!errors.cardholderName}
              />
              {errors.cardholderName && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cardholderName}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard}>
              {isVerifying ? "Verifying..." : "Verify & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
