import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface ReportCardInput {
  petName: string;
  facilityName: string;
  serviceType: string;
  date: string;
  mood: string;
  energy: string;
  socialization: string;
  activities: string[];
  meals: string;
  pottyStatus: string;
  conditions: string[];
  staffNotes: string;
  playNotes?: string;
  bestFriends?: string;
}

const FALLBACK_SUMMARY =
  "Unable to generate summary at this time. Please try again or write the summary manually.";

export async function POST(req: NextRequest) {
  const input: ReportCardInput = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json({ summary: FALLBACK_SUMMARY });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a professional pet care facility staff writer. Based on the following daily report card data, write a warm, concise daily update for the pet's owner.

**Pet:** ${input.petName}
**Facility:** ${input.facilityName}
**Service:** ${input.serviceType}
**Date:** ${input.date}

**Today's Report:**
- Mood: ${input.mood}
- Energy Level: ${input.energy}
- Socialization: ${input.socialization}
- Activities: ${input.activities.join(", ") || "Regular play"}
- Meals: ${input.meals}
- Potty: ${input.pottyStatus}
- Conditions noted: ${input.conditions.join(", ") || "None"}
- Staff notes: ${input.staffNotes || "None"}
${input.playNotes ? `- Play notes: ${input.playNotes}` : ""}
${input.bestFriends ? `- Best friends today: ${input.bestFriends}` : ""}

Write a warm, natural 3-4 sentence summary of the pet's day. Address the pet by name. Mention mood, key activities, and any notable observations. Keep it under 100 words. Be warm and reassuring. Do NOT use emojis. Do NOT use markdown formatting — output plain text only.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const usage = message.usage;
    console.log(
      `[AI Usage] type=report_card_summary input=${usage?.input_tokens ?? 0} output=${usage?.output_tokens ?? 0}`,
    );

    return NextResponse.json({
      summary: text,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
      },
    });
  } catch (error) {
    console.error("AI report card summary error:", error);
    return NextResponse.json({ summary: FALLBACK_SUMMARY });
  }
}
