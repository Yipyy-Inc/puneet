"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { staffQueries } from "@/lib/api/staff";
import type { StaffMember } from "@/types/staff";

// The facility's own team, in the shape the Daily Care pickers draw: a name, a
// role and whether they are working. Those pickers read `staffMembers` from
// src/data/staff — invented people — so a routine step could only be assigned
// to somebody who does not work here.

const NO_STAFF: StaffMember[] = [];

export function useStaffRoster(): StaffMember[] {
  const { data } = useQuery(staffQueries.profiles());
  return useMemo(
    () =>
      data
        ? data.map((profile) => ({
            id: profile.id,
            name: `${profile.firstName} ${profile.lastName}`.trim(),
            role: profile.primaryRole,
            skills: [],
            isActive: profile.status === "active",
          }))
        : NO_STAFF,
    [data],
  );
}
