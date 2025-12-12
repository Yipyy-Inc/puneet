import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SERVICE_CATEGORIES } from "../constants";

interface ServiceStepProps {
  selectedService: string;
  setSelectedService: (service: string) => void;
  setServiceType: (type: string) => void;
  setCurrentSubStep: (step: number) => void;
}

export function ServiceStep({
  selectedService,
  setSelectedService,
  setServiceType,
  setCurrentSubStep,
}: ServiceStepProps) {
  return (
    <div className="space-y-4">
      <Label className="text-base">Select a service</Label>
      <div className="grid grid-cols-2 gap-4">
        {SERVICE_CATEGORIES.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className={`relative border rounded-lg cursor-pointer transition-colors overflow-hidden ${
                selectedService === service.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => {
                setSelectedService(service.id);
                setServiceType("");
                setCurrentSubStep(0);
              }}
            >
              {service.image ? (
                <div className="w-full h-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-full h-32 flex items-center justify-center ${
                    selectedService === service.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Icon className="h-12 w-12" />
                </div>
              )}
              <div className="p-4 space-y-3">
                <div className="text-center">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                  <p className="font-semibold text-primary">
                    From ${service.basePrice}
                  </p>
                </div>
              </div>
              {selectedService === service.id && (
                <Check className="absolute top-2 right-2 h-5 w-5 text-primary" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
