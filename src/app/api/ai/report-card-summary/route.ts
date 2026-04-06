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

function buildMockSummary(input: ReportCardInput): string {
  const {
    petName,
    mood,
    energy,
    socialization,
    meals,
    activities,
    bestFriends,
    playNotes,
    conditions,
    staffNotes,
  } = input;

  const moodMap: Record<string, string> = {
    happy: "in wonderful spirits",
    excited: "absolutely bursting with excitement",
    calm: "calm and relaxed",
    anxious: "a little anxious at first but settled in nicely",
    tired: "on the mellow side today",
  };
  const moodText = moodMap[mood] || "in good spirits";

  const energyMap: Record<string, string> = {
    high: "bringing tons of energy to every activity",
    medium: "with a nice balanced energy throughout the day",
    low: "taking it easy and enjoying a more relaxed pace",
  };
  const energyText = energyMap[energy] || "with good energy levels";

  const mealText =
    meals === "all" || meals === "excellent"
      ? `${petName} enjoyed all meals with a healthy appetite.`
      : meals === "picky" || meals === "some"
        ? `${petName} was a bit selective with meals today, which can happen.`
        : `${petName}'s appetite was moderate today.`;

  const friendsText = bestFriends
    ? ` ${petName} especially enjoyed spending time with ${bestFriends}.`
    : "";
  const playText = playNotes ? ` ${playNotes}` : "";
  const activitiesText =
    activities.length > 0
      ? ` Favorite activities included ${activities.slice(0, 3).join(", ")}.`
      : "";
  const condText =
    conditions.length > 0 ? ` We noted: ${conditions.join(", ")}.` : "";
  const notesText = staffNotes ? ` ${staffNotes}` : "";

  return `${petName} had a great ${input.serviceType} day! ${petName} was ${moodText}, ${energyText}. ${mealText}${friendsText}${playText}${activitiesText}${condText}${notesText}

We always love having ${petName} here and look forward to the next visit!`;
}

export async function POST(req: NextRequest) {
  const input: ReportCardInput = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ summary: buildMockSummary(input) });
  }

  const client = new Anthropic();

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
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error("AI report card summary error:", error);
    return NextResponse.json({ summary: buildMockSummary(input) });
  }
}
