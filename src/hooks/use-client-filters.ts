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
  hasAddress: TriState;
  hasEmergencyContact: TriState;

  // Pets
  hasPets: TriState;
  petTypes: string[]; // multi-select: "Dog", "Cat", "Other"
  hasAllergies: TriState;
  hasSpecialNeeds: TriState;

  // Health
  vaccineExpiryDays: DayRange | null;

  // Services
  services: string[]; // multi-select: "daycare", "boarding", etc.
  hasActiveBooking: TriState;

  // Activity
  lastVisitDays: DayRange | null;
}

const DEFAULT_FILTERS: ClientFilters = {
  status: [],
  hasAddress: "any",
  hasEmergencyContact: "any",
  hasPets: "any",
  petTypes: [],
  hasAllergies: "any",
  hasSpecialNeeds: "any",
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
    (key: "status" | "petTypes" | "services", item: string) => {
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
    if (filters.hasAddress !== "any") count++;
    if (filters.hasEmergencyContact !== "any") count++;
    if (filters.hasPets !== "any") count++;
    if (filters.petTypes.length > 0) count++;
    if (filters.hasAllergies !== "any") count++;
    if (filters.hasSpecialNeeds !== "any") count++;
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
