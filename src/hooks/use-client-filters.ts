"use client";

import { useState, useMemo, useCallback } from "react";
import { bookings } from "@/data/bookings";
import { vaccinationRecords } from "@/data/pet-data";
import type { Client } from "@/types/client";

// ========================================
// Filter State Types
// ========================================

type TriState = "any" | "yes" | "no";

export interface DayRange {
  preset?: number; // preset button value (e.g., 7, 30, 60)
  min?: number; // custom min days
  max?: number; // custom max days
}

export interface ClientFilters {
  // Client Info
  status: string[]; // multi-select: "active", "inactive"
  preferredLanguages: string[]; // multi-select: "en", "fr", etc.
  hasAddress: TriState;
  hasEmergencyContact: TriState;

  // Pets
  hasPets: TriState;
  petTypes: string[]; // multi-select: "Dog", "Cat", "Other"
  hasAllergies: TriState;
  hasSpecialNeeds: TriState;

  // Pet Basics
  petName: string;
  petBreed: string;
  petWeightMin: string;
  petWeightMax: string;
  petAgeMin: string;
  petAgeMax: string;
  petSex: "any" | "male" | "female";
  petSpayedNeutered: TriState;
  petCoatType: string[];
  petColor: string;
  petEnergyLevel: "any" | "low" | "medium" | "high";
  petStatus: string[];

  // Health
  vaccineExpired: TriState;
  vaccineExpiryDays: DayRange | null;

  // Services
  services: string[]; // multi-select: "daycare", "boarding", etc.
  hasActiveBooking: TriState;

  // Activity
  lastVisitDays: DayRange | null;
}

const DEFAULT_FILTERS: ClientFilters = {
  status: [],
  preferredLanguages: [],
  hasAddress: "any",
  hasEmergencyContact: "any",
  hasPets: "any",
  petTypes: [],
  hasAllergies: "any",
  hasSpecialNeeds: "any",
  petName: "",
  petBreed: "",
  petWeightMin: "",
  petWeightMax: "",
  petAgeMin: "",
  petAgeMax: "",
  petSex: "any",
  petSpayedNeutered: "any",
  petCoatType: [],
  petColor: "",
  petEnergyLevel: "any",
  petStatus: [],
  vaccineExpired: "any",
  vaccineExpiryDays: null,
  services: [],
  hasActiveBooking: "any",
  lastVisitDays: null,
};

// ========================================
// Hook
// ========================================

export function useClientFilters() {
  const [filters, setFilters] = useState<ClientFilters>({ ...DEFAULT_FILTERS });

  const setFilter = useCallback(
    <K extends keyof ClientFilters>(key: K, value: ClientFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleArrayItem = useCallback(
    (
      key:
        | "status"
        | "preferredLanguages"
        | "petTypes"
        | "services"
        | "petCoatType"
        | "petStatus",
      item: string,
    ) => {
      setFilters((prev) => {
        const arr = prev[key];
        return {
          ...prev,
          [key]: arr.includes(item)
            ? arr.filter((v) => v !== item)
            : [...arr, item],
        };
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.preferredLanguages.length > 0) count++;
    if (filters.hasAddress !== "any") count++;
    if (filters.hasEmergencyContact !== "any") count++;
    if (filters.hasPets !== "any") count++;
    if (filters.petTypes.length > 0) count++;
    if (filters.hasAllergies !== "any") count++;
    if (filters.hasSpecialNeeds !== "any") count++;
    if (filters.petName) count++;
    if (filters.petBreed) count++;
    if (filters.petWeightMin || filters.petWeightMax) count++;
    if (filters.petAgeMin || filters.petAgeMax) count++;
    if (filters.petSex !== "any") count++;
    if (filters.petSpayedNeutered !== "any") count++;
    if (filters.petCoatType.length > 0) count++;
    if (filters.petColor) count++;
    if (filters.petEnergyLevel !== "any") count++;
    if (filters.petStatus.length > 0) count++;
    if (filters.vaccineExpired !== "any") count++;
    if (filters.vaccineExpiryDays !== null) count++;
    if (filters.services.length > 0) count++;
    if (filters.hasActiveBooking !== "any") count++;
    if (filters.lastVisitDays !== null) count++;
    return count;
  }, [filters]);

  const applyFilters = useCallback(
    (clients: Client[]): Client[] => {
      return clients.filter((client) => {
        // Status
        if (
          filters.status.length > 0 &&
          !filters.status.includes(client.status)
        )
          return false;

        // Preferred Language
        if (filters.preferredLanguages.length > 0) {
          const clientPreferredLanguage =
            client.preferredLanguage?.trim().toLowerCase() ?? "";
          const hasMatch = filters.preferredLanguages.some(
            (languageCode) =>
              languageCode.trim().toLowerCase() === clientPreferredLanguage,
          );

          if (!hasMatch) return false;
        }

        // Has Address
        if (filters.hasAddress === "yes" && !client.address?.street)
          return false;
        if (filters.hasAddress === "no" && client.address?.street) return false;

        // Has Emergency Contact
        if (
          filters.hasEmergencyContact === "yes" &&
          !client.emergencyContact?.name
        )
          return false;
        if (
          filters.hasEmergencyContact === "no" &&
          client.emergencyContact?.name
        )
          return false;

        // Has Pets
        if (filters.hasPets === "yes" && client.pets.length === 0) return false;
        if (filters.hasPets === "no" && client.pets.length > 0) return false;

        // Pet Types
        if (filters.petTypes.length > 0) {
          const clientPetTypes = client.pets.map((p) => p.type);
          if (!filters.petTypes.some((t) => clientPetTypes.includes(t)))
            return false;
        }

        // Has Allergies
        if (filters.hasAllergies !== "any") {
          const hasAllergy = client.pets.some(
            (p) => p.allergies && p.allergies !== "None" && p.allergies !== "",
          );
          if (filters.hasAllergies === "yes" && !hasAllergy) return false;
          if (filters.hasAllergies === "no" && hasAllergy) return false;
        }

        // Has Special Needs
        if (filters.hasSpecialNeeds !== "any") {
          const hasNeeds = client.pets.some(
            (p) =>
              p.specialNeeds &&
              p.specialNeeds !== "None" &&
              p.specialNeeds !== "",
          );
          if (filters.hasSpecialNeeds === "yes" && !hasNeeds) return false;
          if (filters.hasSpecialNeeds === "no" && hasNeeds) return false;
        }

        // Pet Name
        if (filters.petName) {
          const q = filters.petName.toLowerCase();
          if (!client.pets.some((p) => p.name.toLowerCase().includes(q)))
            return false;
        }

        // Pet Breed
        if (filters.petBreed) {
          const q = filters.petBreed.toLowerCase();
          if (!client.pets.some((p) => p.breed.toLowerCase().includes(q)))
            return false;
        }

        // Pet Weight Range
        if (filters.petWeightMin || filters.petWeightMax) {
          const min = filters.petWeightMin
            ? parseFloat(filters.petWeightMin)
            : 0;
          const max = filters.petWeightMax
            ? parseFloat(filters.petWeightMax)
            : Infinity;
          if (!client.pets.some((p) => p.weight >= min && p.weight <= max))
            return false;
        }

        // Pet Age Range
        if (filters.petAgeMin || filters.petAgeMax) {
          const min = filters.petAgeMin ? parseFloat(filters.petAgeMin) : 0;
          const max = filters.petAgeMax
            ? parseFloat(filters.petAgeMax)
            : Infinity;
          if (!client.pets.some((p) => p.age >= min && p.age <= max))
            return false;
        }

        // Pet Sex
        if (filters.petSex !== "any") {
          if (!client.pets.some((p) => p.sex === filters.petSex)) return false;
        }

        // Spayed / Neutered
        if (filters.petSpayedNeutered !== "any") {
          const want = filters.petSpayedNeutered === "yes";
          if (!client.pets.some((p) => p.spayedNeutered === want)) return false;
        }

        // Coat Type
        if (filters.petCoatType.length > 0) {
          if (
            !client.pets.some(
              (p) => p.coatType && filters.petCoatType.includes(p.coatType),
            )
          )
            return false;
        }

        // Pet Color
        if (filters.petColor) {
          const q = filters.petColor.toLowerCase();
          if (!client.pets.some((p) => p.color.toLowerCase().includes(q)))
            return false;
        }

        // Energy Level
        if (filters.petEnergyLevel !== "any") {
          if (
            !client.pets.some((p) => p.energyLevel === filters.petEnergyLevel)
          )
            return false;
        }

        // Pet Status
        if (filters.petStatus.length > 0) {
          if (
            !client.pets.some(
              (p) => p.petStatus && filters.petStatus.includes(p.petStatus),
            )
          )
            return false;
        }

        // Services
        if (filters.services.length > 0) {
          const clientServices = bookings
            .filter((b) => b.clientId === client.id)
            .map((b) => b.service.toLowerCase());
          if (!filters.services.some((s) => clientServices.includes(s)))
            return false;
        }

        // Has Active Booking
        if (filters.hasActiveBooking !== "any") {
          const hasActive = bookings.some(
            (b) =>
              b.clientId === client.id &&
              (b.status === "confirmed" || b.status === "pending"),
          );
          if (filters.hasActiveBooking === "yes" && !hasActive) return false;
          if (filters.hasActiveBooking === "no" && hasActive) return false;
        }

        // Vaccine expired/missing
        if (filters.vaccineExpired !== "any") {
          const petIds = client.pets.map((p) => p.id);
          const records = vaccinationRecords.filter((v) =>
            petIds.includes(v.petId),
          );
          const now = Date.now();

          const hasExpiredVaccine = records.some(
            (record) => new Date(record.expiryDate).getTime() < now,
          );
          const hasMissingVaccineRecord =
            petIds.length > 0 &&
            petIds.some(
              (petId) => !records.some((record) => record.petId === petId),
            );
          const hasExpiredOrMissing =
            hasExpiredVaccine || hasMissingVaccineRecord;

          if (filters.vaccineExpired === "yes" && !hasExpiredOrMissing)
            return false;
          if (filters.vaccineExpired === "no" && hasExpiredOrMissing)
            return false;
        }

        // Last Visit (day range)
        if (filters.lastVisitDays !== null) {
          const clientBookings = bookings.filter(
            (b) => b.clientId === client.id,
          );
          if (clientBookings.length === 0) return false;
          const latest = Math.max(
            ...clientBookings.map((b) => new Date(b.startDate).getTime()),
          );
          const daysAgo = (Date.now() - latest) / (1000 * 60 * 60 * 24);
          const range = filters.lastVisitDays;
          const maxDays = range.max ?? range.preset;
          if (maxDays != null && daysAgo > maxDays) return false;
          if (range.min != null && daysAgo < range.min) return false;
        }

        // Vaccine expiry (day range)
        if (filters.vaccineExpiryDays !== null) {
          const petIds = client.pets.map((p) => p.id);
          const records = vaccinationRecords.filter((v) =>
            petIds.includes(v.petId),
          );
          if (records.length === 0) return false;
          const now = Date.now();
          const range = filters.vaccineExpiryDays;
          const minDays = range.min;
          const maxDays = range.max ?? range.preset;
          const match = records.some((v) => {
            const daysUntil =
              (new Date(v.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24);
            if (daysUntil < 0) return false; // already expired
            if (maxDays != null && daysUntil > maxDays) return false;
            if (minDays != null && daysUntil < minDays) return false;
            return true;
          });
          if (!match) return false;
        }

        return true;
      });
    },
    [filters],
  );

  return {
    filters,
    setFilter,
    toggleArrayItem,
    clearAll,
    activeCount,
    applyFilters,
  };
}
