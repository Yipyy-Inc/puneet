"use client";

import { useState } from "react";
import {
  ServiceSettingsComponent,
  ServiceSettings,
} from "@/components/facility/service-settings";
import { Home } from "lucide-react";
import { facilities } from "@/data/facilities";

export default function BoardingServicePage() {
  // Static facility ID for now
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const locations = facility?.locationsList || [];

  // Mock boarding settings
  const [settings] = useState<ServiceSettings>({
    enabled: true,
    pricePerNight: 35,
    maxCapacity: 20,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    availableLocations: locations.length > 0 ? [locations[0].name] : [],
    description:
      "Overnight boarding with comfortable kennels, feeding, and exercise. Your pet will enjoy a safe and comfortable stay with attentive care throughout their visit.",
    rules:
      "Pets must be house-trained and up to date on vaccinations. No puppies under 12 weeks. Aggressive behavior may result in additional fees or refusal of service.",
    packages: [
      {
        id: "pkg-1",
        name: "Standard Boarding",
        price: 35,
        description: "Overnight stay with feeding and basic care",
        includes: ["Private kennel", "2 meals per day", "Exercise time"],
      },
      {
        id: "pkg-2",
        name: "Premium Boarding",
        price: 55,
        description: "Enhanced comfort with extra attention",
        includes: [
          "Spacious kennel",
          "3 meals per day",
          "Extended playtime",
          "Bedtime treat",
          "Daily photo updates",
        ],
      },
      {
        id: "pkg-3",
        name: "Luxury Suite",
        price: 85,
        description: "VIP treatment for your beloved pet",
        includes: [
          "Private suite",
          "Gourmet meals",
          "One-on-one playtime",
          "Spa treatment",
          "Video calls",
          "Premium bedding",
        ],
      },
    ],
    sessions: [
      {
        id: "1",
        date: "2024-01-15",
        time: "14:00 - Next Day 11:00",
        staff: ["Sarah Johnson", "Mike Davis"],
        pets: ["Buddy", "Max"],
        status: "scheduled",
        capacity: 20,
        bookedCount: 8,
      },
      {
        id: "2",
        date: "2024-01-16",
        time: "14:00 - Next Day 11:00",
        staff: ["Sarah Johnson", "Emily Brown"],
        pets: ["Bella", "Charlie", "Luna"],
        status: "scheduled",
        capacity: 20,
        bookedCount: 12,
      },
      {
        id: "3",
        date: "2024-01-12",
        time: "14:00 - 11:00",
        staff: ["Mike Davis"],
        pets: ["Rocky", "Daisy"],
        status: "completed",
        capacity: 20,
        bookedCount: 6,
      },
      {
        id: "4",
        date: "2024-01-10",
        time: "14:00 - 11:00",
        staff: ["Sarah Johnson"],
        pets: ["Buddy", "Max", "Bella"],
        status: "completed",
        capacity: 20,
        bookedCount: 10,
      },
    ],
    requirements: [
      "Up-to-date vaccinations (rabies, DHPP, bordetella)",
      "Proof of flea/tick prevention",
      "Must be house-trained",
      "Minimum age of 12 weeks",
    ],
    amenities: [
      "Climate-controlled kennels",
      "Outdoor play areas",
      "24/7 supervision",
      "Emergency vet on call",
      "Comfortable bedding",
      "Secure facility",
    ],
  });

  const handleSave = () => {
    // TODO: Implement API call to save settings
  };

  return (
    <ServiceSettingsComponent
      serviceName="Boarding"
      serviceIcon={<Home className="h-6 w-6" />}
      locations={locations}
      settings={settings}
      onSave={handleSave}
      priceLabel="Price per Night"
      showCapacity={true}
      showOperatingHours={false}
      showCheckInOut={true}
      showPackages={true}
    />
  );
}
