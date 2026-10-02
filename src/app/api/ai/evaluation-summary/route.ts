import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { recordAiUsage } from "@/lib/ai-usage-recorder";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  cleanNote,
  fallbackNote,
  noteFacts,
  noteSystemPrompt,
  type NoteInput,
} from "@/lib/evaluations/ai-note";
import { evaluationDetail } from "@/lib/evaluations/detail-server";
import { NOTE_TONES, RESULTS } from "@/lib/evaluations/questions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// POST /api/ai/evaluation-summary — "Write with AI" on the evaluator's note to
// the owner (the client's evaluation mock, 2026-10-02): the answers so far,
// the strengths, what the team will help with and a few words from the
// evaluator, turned into two to four kind sentences in the owner's language.
//
// This route SPENDS MONEY, so it is staff only: the caller must be able to
// read the evaluation (RLS) and either run evaluations or review its card.
// The answers come from the dialog — they may not be saved yet — but the
// pet, the owner and their language come from the evaluation's own rows.
//
// No key, or a failed call: a plain note from the same facts, flagged
// `fallback` so the dialog can say it was not written by AI.
// ============================================================================

const MODEL = "claude-haiku-4-5-20251001";

const bodySchema = z.object({
  evaluationId: z.string().uuid(),
  tone: z.enum(NOTE_TONES),
  points: z.string().max(500).default(""),
  answers: z.record(z.string().max(64), z.string().max(500)).default({}),
  strengths: z.array(z.string().max(60)).max(20).default([]),
  watchFor: z.array(z.string().max(60)).max(20).default([]),
  result: z.enum(RESULTS).nullable().default(null),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That note could not be written." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const detail = await evaluationDetail(supabase, parsed.data.evaluationId);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!detail.viewer.mayRun && !detail.viewer.mayReview) {
    return NextResponse.json(
      { error: "Writing report cards is not part of your role here." },
      { status: 403 },
    );
  }
  const { data: language } = await supabase
    .from("clients")
    .select("preferred_language")
    .eq("id", detail.client.id)
    .maybeSingle();

  const input: NoteInput = {
    locale: (
      language as { preferred_language: string | null } | null
    )?.preferred_language?.startsWith("fr")
      ? "fr"
      : "en",
    petName: detail.pet.name,
    petSex: detail.pet.sex,
    breed: detail.pet.breed,
    ownerName: detail.client.name,
    result: parsed.data.result,
    answers: parsed.data.answers,
    strengths: parsed.data.strengths,
    watchFor: parsed.data.watchFor,
    points: parsed.data.points,
    tone: parsed.data.tone,
  };
  const fallback = () =>
    NextResponse.json({ note: fallbackNote(input), fallback: true });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") return fallback();

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: MODEL,
      // Two to four sentences: room to finish one, never a page.
      max_tokens: 400,
      system: noteSystemPrompt(input),
      messages: [
        {
          role: "user",
          content: `Facts from the evaluation:\n${noteFacts(input)
            .map((fact) => `- ${fact}`)
            .join("\n")}`,
        },
      ],
    });

    recordAiUsage({
      // From the SESSION, not the body: spend is filed against the facility
      // the caller is working in, never one a request names.
      facilityId: (await getFacilityContext())?.legacyRef ?? undefined,
      type: "evaluation_summary",
      model: MODEL,
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
    });

    if (message.stop_reason === "refusal") return fallback();
    const text = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join(" ");
    const note = cleanNote(text);
    if (!note) return fallback();
    return NextResponse.json({ note, fallback: false });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn("[ai] evaluation note: rate limited");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`[ai] evaluation note: API error ${error.status}`);
    } else {
      console.error("[ai] evaluation note:", error);
    }
    return fallback();
  }
}
