import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

export interface UnifiedApplicablePackage {
  id: string;
  name: string;
  passesLeft: number;
  totalPasses: number;
}

interface PackagePromptWizardContentProps {
  applicablePackages: UnifiedApplicablePackage[];
  onApply: (packageId: string) => void;
  onSkip: () => void;
}

export function PackagePromptWizardContent({
  applicablePackages,
  onApply,
  onSkip,
}: PackagePromptWizardContentProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Active Packages Detected</h3>
        <p className="text-muted-foreground text-sm">
          This client has active packages that cover the selected service. Would you like to redeem a pass?
        </p>
      </div>

      <div className="grid gap-4">
        {applicablePackages.map((pkg) => (
          <Card key={pkg.id} className="overflow-hidden border-emerald-200">
            <CardContent className="p-0">
              <div className="flex items-center justify-between bg-emerald-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Package className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-950">{pkg.name}</p>
                    <p className="text-sm text-emerald-700">
                      {pkg.passesLeft} of {pkg.totalPasses} passes remaining
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => onApply(pkg.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Apply Pass
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button variant="ghost" onClick={onSkip}>
          Skip and proceed to payment
        </Button>
      </div>
    </div>
  );
}
