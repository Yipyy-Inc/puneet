"use client";

import { useState } from "react";
import {
  ServiceSettingsComponent,
  ServiceSettings,
} from "@/components/facility/service-settings";
import { Sun } from "lucide-react";
import { facilities } from "@/data/facilities";

export default function DaycareServicePage() {
  // Static facility ID for now
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const locations = facility?.locationsList || [];

  // Mock daycare settings
  const [settings] = useState<ServiceSettings>({
    enabled: true,
    pricePerDay: 25,
    maxCapacity: 50,
    operatingHours: {
      start: "07:00",
      end: "18:00",
    },
    availableLocations: locations.length > 0 ? [locations[0].name] : [],
    description:
      "Full day daycare service with playtime, feeding, and supervision. Your pet will enjoy socializing with other pets in a safe, monitored environment with plenty of activities.",
    rules:
      "Pets must be up to date on vaccinations. No aggressive breeds. All pets must pass a temperament test before joining group play.",
    packages: [
      {
        id: "pkg-1",
        name: "Half Day Daycare",
        price: 15,
        duration: 4,
        description: "4 hours of supervised play and care",
        includes: ["Group playtime", "Snack", "Rest period", "Water breaks"],
      },
      {
        id: "pkg-2",
        name: "Full Day Daycare",
        price: 25,
        duration: 8,
        description: "Full day of fun and activities",
        includes: [
          "All-day group play",
          "Lunch included",
          "Multiple rest periods",
          "Indoor & outdoor activities",
          "Daily report card",
        ],
      },
      {
        id: "pkg-3",
        name: "Weekly Pass",
        price: 110,
        description: "5 full days of daycare (save $15)",
        includes: [
          "Monday-Friday access",
          "All meals included",
          "Priority booking",
          "Weekly progress report",
          "Photo gallery access",
        ],
      },
    ],
    sessions: [
      {
        id: "1",
        date: "2024-01-15",
        time: "07:00 - 18:00",
        staff: ["Emily Brown", "Tom Wilson"],
        pets: ["Buddy", "Max", "Charlie", "Luna", "Rocky"],
        status: "scheduled",
        capacity: 50,
        bookedCount: 32,
      },
      {
        id: "2",
        date: "2024-01-16",
        time: "07:00 - 18:00",
        staff: ["Emily Brown", "Sarah Johnson", "Tom Wilson"],
        pets: ["Bella", "Charlie", "Daisy", "Max"],
        status: "scheduled",
        capacity: 50,
        bookedCount: 45,
      },
      {
        id: "3",
        date: "2024-01-14",
        time: "07:00 - 18:00",
        staff: ["Emily Brown", "Tom Wilson"],
        pets: ["Buddy", "Max", "Bella", "Luna"],
        status: "completed",
        capacity: 50,
        bookedCount: 28,
      },
      {
        id: "4",
        date: "2024-01-13",
        time: "07:00 - 18:00",
        staff: ["Sarah Johnson", "Tom Wilson"],
        pets: ["Charlie", "Rocky", "Daisy"],
        status: "completed",
        capacity: 50,
        bookedCount: 35,
      },
      {
        id: "5",
        date: "2024-01-12",
        time: "07:00 - 18:00",
        staff: ["Emily Brown", "Mike Davis"],
        pets: ["Buddy", "Bella", "Max"],
        status: "completed",
        capacity: 50,
        bookedCount: 30,
      },
    ],
    requirements: [
      "Up-to-date vaccinations (rabies, DHPP, bordetella)",
      "Proof of flea/tick prevention",
      "Spayed/neutered (if over 6 months)",
      "Must pass temperament evaluation",
      "Minimum age of 4 months",
    ],
    amenities: [
      "Indoor play areas",
      "Outdoor exercise yards",
      "Splash pools (summer)",
      "Agility equipment",
      "Quiet rest areas",
      "Climate-controlled environment",
      "Webcam access for owners",
    ],
  });

  const handleSave = () => {
    // TODO: Implement API call to save settings
  };

  return (
    <ServiceSettingsComponent
      serviceName="Daycare"
      serviceIcon={<Sun className="h-6 w-6" />}
      locations={locations}
      settings={settings}
      onSave={handleSave}
      priceLabel="Price per Day"
      showCapacity={true}
      showOperatingHours={true}
      showCheckInOut={false}
      showPackages={true}
    />
  );
}
