import {
  Check,
  Sun,
  Bed,
  Scissors,
  GraduationCap,
  Stethoscope,
} from "lucide-react";
import { Label } from "@/components/ui/label";

const SERVICE_CATEGORIES = [
  {
    id: "daycare",
    name: "Daycare",
    icon: Sun,
    description: "Full or half day supervised care",
    basePrice: 35,
    imageUrl: undefined,
  },
  {
    id: "boarding",
    name: "Boarding",
    icon: Bed,
    description: "Overnight stays with full care",
    basePrice: 45,
    imageUrl: undefined,
  },
  {
    id: "grooming",
    name: "Grooming",
    icon: Scissors,
    description: "Bath, grooming, and styling services",
    basePrice: 40,
    imageUrl: undefined,
  },
  {
    id: "training",
    name: "Training",
    icon: GraduationCap,
    description: "Obedience and specialized training",
    basePrice: 85,
    imageUrl: undefined,
  },
  {
    id: "vet",
    name: "Veterinary",
    icon: Stethoscope,
    description: "Health checkups and medical care",
    basePrice: 75,
    imageUrl: undefined,
  },
];

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
      <div className="grid gap-3">
        {SERVICE_CATEGORIES.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
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
              <div className="flex items-center gap-3">
                {service.imageUrl ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`p-2 rounded-lg ${
                      selectedService === service.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">From ${service.basePrice}</p>
                </div>
                {selectedService === service.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
