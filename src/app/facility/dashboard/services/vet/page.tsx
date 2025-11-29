"use client";

import { useState } from "react";
import {
  ServiceSettingsComponent,
  ServiceSettings,
} from "@/components/facility/service-settings";
import { Stethoscope } from "lucide-react";
import { facilities } from "@/data/facilities";

export default function VetServicePage() {
  // Static facility ID for now
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const locations = facility?.locationsList || [];

  // Mock vet settings
  const [settings] = useState<ServiceSettings>({
    enabled: true,
    basePrice: 60,
    operatingHours: {
      start: "09:00",
      end: "17:00",
    },
    availableLocations: locations.length > 0 ? [locations[0].name] : [],
    description:
      "Professional veterinary care including check-ups, vaccinations, and emergency services. Our licensed veterinarians provide comprehensive medical care with state-of-the-art equipment and compassionate service.",
    rules:
      "Appointments required for non-emergencies. Bring vaccination records and any medications. Emergency services available 24/7 with additional fees. Please arrive 10 minutes early for first-time visits.",
    packages: [
      {
        id: "pkg-1",
        name: "Wellness Exam",
        price: 60,
        duration: 30,
        description: "Routine check-up and preventive care",
        includes: [
          "Physical examination",
          "Weight and vitals check",
          "Health consultation",
          "Vaccination review",
          "Basic health report",
        ],
      },
      {
        id: "pkg-2",
        name: "Vaccination Package",
        price: 85,
        duration: 30,
        description: "Core vaccinations and protection",
        includes: [
          "Wellness exam",
          "Core vaccines (DHPP/FVRCP)",
          "Rabies vaccination",
          "Vaccination certificate",
          "Next visit reminder",
        ],
      },
      {
        id: "pkg-3",
        name: "Senior Pet Care",
        price: 120,
        duration: 60,
        description: "Comprehensive care for aging pets",
        includes: [
          "Complete physical exam",
          "Blood work panel",
          "Urinalysis",
          "Arthritis screening",
          "Nutritional counseling",
          "Detailed health report",
        ],
      },
      {
        id: "pkg-4",
        name: "Dental Cleaning",
        price: 250,
        duration: 120,
        description: "Professional dental care under anesthesia",
        includes: [
          "Pre-anesthetic blood work",
          "Anesthesia & monitoring",
          "Ultrasonic cleaning",
          "Polishing",
          "Dental exam & X-rays",
          "Post-care instructions",
        ],
      },
      {
        id: "pkg-5",
        name: "Emergency Visit",
        price: 150,
        duration: 45,
        description: "Urgent care for critical situations",
        includes: [
          "Immediate assessment",
          "Emergency treatment",
          "Pain management",
          "Stabilization care",
          "Follow-up plan",
        ],
      },
    ],
    sessions: [
      {
        id: "1",
        date: "2024-01-15",
        time: "09:00 - 09:30",
        staff: ["Dr. Sarah Williams"],
        pets: ["Buddy"],
        status: "scheduled",
        capacity: 1,
        bookedCount: 1,
      },
      {
        id: "2",
        date: "2024-01-15",
        time: "10:00 - 10:30",
        staff: ["Dr. Michael Chen"],
        pets: ["Max"],
        status: "scheduled",
        capacity: 1,
        bookedCount: 1,
      },
      {
        id: "3",
        date: "2024-01-15",
        time: "14:00 - 14:30",
        staff: ["Dr. Sarah Williams"],
        pets: ["Charlie"],
        status: "scheduled",
        capacity: 1,
        bookedCount: 1,
      },
      {
        id: "4",
        date: "2024-01-16",
        time: "09:30 - 10:00",
        staff: ["Dr. Michael Chen"],
        pets: ["Luna"],
        status: "scheduled",
        capacity: 1,
        bookedCount: 1,
      },
      {
        id: "5",
        date: "2024-01-16",
        time: "11:00 - 11:30",
        staff: ["Dr. Sarah Williams"],
        pets: ["Bella"],
        status: "scheduled",
        capacity: 1,
        bookedCount: 1,
      },
      {
        id: "6",
        date: "2024-01-14",
        time: "10:00 - 10:30",
        staff: ["Dr. Sarah Williams"],
        pets: ["Rocky"],
        status: "completed",
        capacity: 1,
        bookedCount: 1,
      },
      {
        id: "7",
        date: "2024-01-13",
        time: "14:00 - 14:30",
        staff: ["Dr. Michael Chen"],
        pets: ["Daisy"],
        status: "completed",
        capacity: 1,
        bookedCount: 1,
      },
      {
        id: "8",
        date: "2024-01-12",
        time: "09:00 - 09:30",
        staff: ["Dr. Sarah Williams"],
        pets: ["Cooper"],
        status: "completed",
        capacity: 1,
        bookedCount: 1,
      },
    ],
    requirements: [
      "Valid pet identification",
      "Previous medical records (for new patients)",
      "Current medication list",
      "Insurance information (if applicable)",
      "Emergency contact information",
    ],
    amenities: [
      "Licensed veterinarians",
      "Digital X-ray equipment",
      "In-house laboratory",
      "Surgical suite",
      "Pharmacy on-site",
      "Separate cat & dog waiting areas",
      "Emergency care available",
      "Pet health records portal",
    ],
  });

  const handleSave = () => {
    // TODO: Implement API call to save settings
  };

  return (
    <ServiceSettingsComponent
      serviceName="Veterinary"
      serviceIcon={<Stethoscope className="h-6 w-6" />}
      locations={locations}
      settings={settings}
      onSave={handleSave}
      priceLabel="Consultation Fee"
      showCapacity={false}
      showOperatingHours={true}
      showCheckInOut={false}
      showPackages={true}
    />
  );
}
