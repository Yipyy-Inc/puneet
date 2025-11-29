"use client";

import { useState } from "react";
import {
  ServiceSettingsComponent,
  ServiceSettings,
} from "@/components/facility/service-settings";
import { Scissors } from "lucide-react";
import { facilities } from "@/data/facilities";

export default function GroomingServicePage() {
  // Static facility ID for now
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const locations = facility?.locationsList || [];

  // Mock grooming settings
  const [settings] = useState<ServiceSettings>({
    enabled: true,
    basePrice: 45,
    operatingHours: {
      start: "08:00",
      end: "17:00",
    },
    availableLocations: locations.length > 0 ? [locations[0].name] : [],
    description:
      "Professional grooming services including baths, haircuts, nail trims, and ear cleaning. Our experienced groomers ensure your pet looks and feels their best with gentle handling and premium products.",
    rules:
      "Pets must be healthy and up to date on flea treatment. Aggressive pets may be declined or require additional handling fees. We recommend booking grooming appointments at least 2 weeks in advance.",
    packages: [
      {
        id: "pkg-1",
        name: "Basic Bath Package",
        price: 35,
        duration: 60,
        description: "Essential bath and dry service",
        includes: [
          "Shampoo & conditioner",
          "Towel dry",
          "Brush out",
          "Nail trim",
          "Ear cleaning",
        ],
      },
      {
        id: "pkg-2",
        name: "Full Groom Package",
        price: 65,
        duration: 120,
        description: "Complete grooming experience",
        includes: [
          "Bath with premium products",
          "Haircut/styling",
          "Nail trim & filing",
          "Ear cleaning",
          "Teeth brushing",
          "Cologne spritz",
          "Bandana or bow",
        ],
      },
      {
        id: "pkg-3",
        name: "Spa Day Package",
        price: 95,
        duration: 180,
        description: "Ultimate pampering for your pet",
        includes: [
          "Luxury bath with aromatherapy",
          "Professional haircut",
          "Nail trim, filing & paw pad treatment",
          "Deep ear cleaning",
          "Teeth brushing & breath freshener",
          "Blueberry facial",
          "Paw balm treatment",
          "Cologne & accessories",
          "Photo session",
        ],
      },
      {
        id: "pkg-4",
        name: "Quick Tidy Up",
        price: 25,
        duration: 30,
        description: "Fast touch-up between full grooms",
        includes: [
          "Sanitary trim",
          "Face & paw trim",
          "Nail trim",
          "Quick brush",
        ],
      },
    ],
    sessions: [
      {
        id: "1",
        date: "2024-01-15",
        time: "09:00 - 11:00",
        staff: ["Jessica Martinez"],
        pets: ["Fluffy", "Bella"],
        status: "scheduled",
        capacity: 4,
        bookedCount: 2,
      },
      {
        id: "2",
        date: "2024-01-15",
        time: "13:00 - 15:00",
        staff: ["Jessica Martinez", "Amy Chen"],
        pets: ["Max", "Charlie", "Luna"],
        status: "scheduled",
        capacity: 6,
        bookedCount: 3,
      },
      {
        id: "3",
        date: "2024-01-16",
        time: "10:00 - 12:00",
        staff: ["Amy Chen"],
        pets: ["Buddy", "Rocky"],
        status: "scheduled",
        capacity: 4,
        bookedCount: 2,
      },
      {
        id: "4",
        date: "2024-01-14",
        time: "09:00 - 11:00",
        staff: ["Jessica Martinez"],
        pets: ["Daisy", "Cooper"],
        status: "completed",
        capacity: 4,
        bookedCount: 2,
      },
      {
        id: "5",
        date: "2024-01-13",
        time: "14:00 - 16:00",
        staff: ["Amy Chen"],
        pets: ["Bella", "Max", "Luna"],
        status: "completed",
        capacity: 6,
        bookedCount: 3,
      },
      {
        id: "6",
        date: "2024-01-12",
        time: "10:00 - 12:00",
        staff: ["Jessica Martinez", "Amy Chen"],
        pets: ["Charlie", "Buddy"],
        status: "completed",
        capacity: 6,
        bookedCount: 2,
      },
    ],
    requirements: [
      "Current rabies vaccination",
      "Proof of flea/tick prevention (within 30 days)",
      "Must be in good health",
      "Matted coats may incur additional dematting fees",
      "Aggressive behavior may result in service refusal",
    ],
    amenities: [
      "Professional grooming equipment",
      "Hypoallergenic product options",
      "Individual grooming stations",
      "Heated drying system",
      "Calming music environment",
      "Before & after photos",
      "Online booking system",
    ],
  });

  const handleSave = () => {
    // TODO: Implement API call to save settings
  };

  return (
    <ServiceSettingsComponent
      serviceName="Grooming"
      serviceIcon={<Scissors className="h-6 w-6" />}
      locations={locations}
      settings={settings}
      onSave={handleSave}
      priceLabel="Base Price"
      showCapacity={false}
      showOperatingHours={true}
      showCheckInOut={false}
      showPackages={true}
    />
  );
}
