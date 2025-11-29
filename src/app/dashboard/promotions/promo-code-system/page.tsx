import { PromoCodeSystem } from "@/components/promotions/PromoCodeSystem";

export default function PromoCodeSystemPage() {
  return (
    <div className="p-6 space-y-6 bg-linear-to-br from-orange-50 via-white to-purple-50 min-h-screen">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Promo Code System</h1>
        <p className="text-muted-foreground">
          Create and manage promotional codes, discounts, and special offers
        </p>
      </div>
      <PromoCodeSystem />
    </div>
  );
}
