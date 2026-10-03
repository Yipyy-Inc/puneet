"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trainingQueries } from "@/lib/api/training";
import { nextSkillRating } from "@/lib/bookings/details/service-view";
import {
  curriculumOf,
  trainingSkills,
  withRating,
} from "@/lib/bookings/details/training-view";

import {
  DetailsCard,
  DetailsCardHeader,
  DetailsCardNote,
} from "../details-card";
import type { BookingDetails } from "../use-booking-details";
import type { ServiceFacts } from "../use-service-facts";

// ============================================================================
// Skills progress, as the mock draws it: each skill of the course with its
// state as a pill — Not started, Practising, Mastered — and a tap moves it on.
//
// A skill is an exercise of the course's curriculum; its state is its latest
// rating at any session (5 is mastered). A tap rates it at THIS session — so
// only once the dog has been checked in to it: rating a session that has not
// happened would be a record of nothing.
// ============================================================================

const STATE_KEY = {
  "not-started": "skillNotStarted",
  practising: "skillPractising",
  mastered: "skillMastered",
} as const;

export function SkillsCard({
  d,
  facts,
}: {
  d: BookingDetails;
  facts: ServiceFacts;
}) {
  const { t, fill } = d.text;
  const queryClient = useQueryClient();
  // The course's curriculum and the exercise library it names.
  const { data: courseTypes = [] } = useQuery(trainingQueries.allCourseTypes());
  const { data: exercises = [] } = useQuery(trainingQueries.allExercises());
  const training = facts.training;
  const booking = d.booking;

  const save = useMutation({
    mutationFn: async (
      exercises: { exerciseName: string; rating: number }[],
    ) => {
      const response = await fetch(`/api/training/attendance/${booking?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises }),
      });
      if (!response.ok) {
        const parsed = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(parsed?.error ?? t("ratingNotSaved"));
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["bookings", booking?.id ?? 0, "training"],
      }),
  });

  if (!booking) return null;
  const series = training?.series ?? null;
  const sessions = training?.sessions ?? [];
  const current = sessions.find((s) => s.id === training?.currentSessionId);
  const skills = trainingSkills({
    curriculum: curriculumOf(courseTypes, series?.courseTypeName),
    exercises,
    sessions,
    currentNumber: current?.number ?? null,
  });
  const attended = Boolean(current?.attendance?.checkedInAt);

  const tap = (name: string) => {
    const skill = skills.find((s) => s.name === name);
    if (!skill) return;
    if (!attended) {
      toast(fill("rateAfterCheckIn", { pet: d.petName }));
      return;
    }
    const next = withRating(
      current?.attendance?.exercises ?? [],
      name,
      nextSkillRating(skill.state),
    );
    save.mutate(next, {
      onError: (error) =>
        toast.error(t("ratingNotSaved"), { description: error.message }),
    });
  };

  return (
    <DetailsCard>
      <DetailsCardHeader title={t("cardSkills")}>
        <DetailsCardNote>{t("tapSkill")}</DetailsCardNote>
      </DetailsCardHeader>
      <ul className="flex flex-col px-5 pt-1.5 pb-3.5">
        {skills.length === 0 ? (
          <li className="text-ink-disabled py-3 text-[14px]">
            {t("skillsNone")}
          </li>
        ) : (
          skills.map((skill) => (
            <li
              key={skill.name}
              className="border-line-soft flex items-center justify-between gap-3 border-b py-[11px]"
            >
              <span className="text-[14px] font-medium">{skill.name}</span>
              <button
                type="button"
                data-kind={skill.state}
                disabled={save.isPending}
                aria-label={fill("skillTapLabel", {
                  skill: skill.name,
                  state: t(STATE_KEY[skill.state]),
                })}
                onClick={() => tap(skill.name)}
                className="h-8 rounded-full bg-(--chip-bg) px-3 text-[13px] font-semibold whitespace-nowrap text-(--chip-ink)"
              >
                {t(STATE_KEY[skill.state])}
              </button>
            </li>
          ))
        )}
      </ul>
    </DetailsCard>
  );
}
