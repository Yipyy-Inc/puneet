import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface EvaluationInput {
  petName: string;
  petBreed: string;
  petAge?: string;
  facilityName: string;
  evaluatorName: string;
  evaluationDate: string;
  result: "pass" | "fail";
  temperament: {
    dogFriendly: boolean;
    humanFriendly: boolean;
    energy: "low" | "medium" | "high";
    anxiety: "low" | "medium" | "high";
    reactivity: "low" | "medium" | "high";
  };
  playStyle?: string;
  playGroup?: string;
  behaviorTags: string[];
  staffNotes: string;
  approvedServices: string[];
  answers: Record<string, unknown>;
}

function buildMockSummary(input: EvaluationInput): string {
  const {
    petName,
    result,
    temperament,
    behaviorTags,
    staffNotes,
    approvedServices,
    playStyle,
    playGroup,
  } = input;
  const passed = result === "pass";

  const energyDesc =
    temperament.energy === "high"
      ? "brought wonderful high energy to every interaction"
      : temperament.energy === "low"
        ? "was calm and relaxed throughout the session"
        : "showed a nicely balanced energy level";
  const dogDesc = temperament.dogFriendly
    ? "showed excellent social skills with other dogs"
    : "was a bit cautious around other dogs, which is completely normal for a first visit";
  const humanDesc = temperament.humanFriendly
    ? "warmed up to our staff quickly and enjoyed lots of attention"
    : "took some time to warm up to new people, which we completely understand";
  const anxietyDesc =
    temperament.anxiety === "high"
      ? `${petName} did show some signs of anxiety, which is understandable in a new environment.`
      : temperament.anxiety === "medium"
        ? `${petName} showed mild nervousness at first but settled in nicely.`
        : "";

  const tagsText =
    behaviorTags.length > 0
      ? ` Our team noted the following traits: ${behaviorTags.join(", ")}.`
      : "";
  const notesText = staffNotes ? ` ${staffNotes}` : "";
  const playText = playStyle
    ? `${petName} displayed a ${playStyle.toLowerCase()} play style`
    : `${petName} engaged well during play time`;
  const groupText = playGroup
    ? `, and we think the ${playGroup} group would be a great fit`
    : "";

  if (passed) {
    return `Opening
We had the absolute pleasure of meeting ${petName} today, and we are excited to share how the evaluation went!

Temperament Summary
${petName} ${dogDesc} and ${energyDesc}. ${petName} ${humanDesc}. ${anxietyDesc}

Play and Social Profile
${playText}${groupText}. We look forward to seeing more of that personality during regular visits.

Key Observations
Overall, ${petName} made a fantastic impression on our team.${tagsText}${notesText}

Next Steps
Great news -- ${petName} has been approved for ${approvedServices.length > 0 ? approvedServices.join(" and ") : "services"} at our facility! You can now book sessions through your account.`;
  }

  return `Opening
Thank you for bringing ${petName} in for an evaluation today. We genuinely enjoyed getting to know your pup.

Temperament Summary
${petName} ${dogDesc} and ${energyDesc}. ${petName} ${humanDesc}. ${anxietyDesc}

Play and Social Profile
${playText}${groupText}. With some additional socialization, we believe ${petName} will become even more confident.

Key Observations
While ${petName} showed many wonderful qualities, we noticed a few areas where some additional preparation would help ensure the best experience.${tagsText}${notesText}

Next Steps
We recommend some additional socialization or training sessions before re-evaluating. Many dogs pass on their second visit once they are more familiar with the environment. Please do not hesitate to reach out if you would like guidance on next steps.`;
}

export async function POST(req: NextRequest) {
  const input: EvaluationInput = await req.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ summary: buildMockSummary(input) });
  }

  const client = new Anthropic();

  const prompt = `You are a professional pet care facility staff writer. Based on the following evaluation data for a pet, write a warm, professional summary that will be sent to the pet's owner (the "pet parent").

**Pet Details:**
- Name: ${input.petName}
- Breed: ${input.petBreed}
${input.petAge ? `- Age: ${input.petAge}` : ""}

**Evaluation Result:** ${input.result === "pass" ? "PASSED" : "DID NOT PASS"}
**Evaluated by:** ${input.evaluatorName} at ${input.facilityName}
**Date:** ${input.evaluationDate}

**Temperament Observations:**
- Dog-friendly: ${input.temperament.dogFriendly ? "Yes" : "No"}
- Human-friendly: ${input.temperament.humanFriendly ? "Yes" : "No"}
- Energy level: ${input.temperament.energy}
- Anxiety level: ${input.temperament.anxiety}
- Reactivity: ${input.temperament.reactivity}

**Play Style:** ${input.playStyle || "Not assessed"}
**Recommended Play Group:** ${input.playGroup || "Not assigned"}
**Behavior Tags:** ${input.behaviorTags.join(", ") || "None"}
**Staff Notes:** ${input.staffNotes || "No notes"}
**Services Approved For:** ${input.approvedServices.join(", ") || "None"}

**Additional Answers:** ${JSON.stringify(input.answers)}

Write the summary in these sections:
1. **Opening** (1-2 sentences): A warm greeting addressing the pet by name. Set a positive, professional tone.
2. **Temperament Summary** (2-3 sentences): Describe the pet's personality based on the temperament data. Use friendly language — translate "dog-friendly: true, energy: high" into something like "Buddy showed wonderful social skills with other dogs and brought high energy to every interaction."
3. **Play & Social Profile** (1-2 sentences): Describe their play style and which group they'd fit best with.
4. **Key Observations** (2-3 sentences): Expand on the staff notes and behavior tags into natural prose. Highlight positive traits. If the pet didn't pass, frame concerns diplomatically and constructively.
5. **Next Steps** (1-2 sentences): What the owner can expect next. If passed, mention the services unlocked. If not passed, suggest what might help (more socialization, training, etc.).

Keep the total under 200 words. Be warm, professional, and reassuring. Avoid clinical language. Write as if you're a caring staff member who genuinely enjoyed meeting the pet. Do NOT use emojis. Do NOT use markdown formatting — output plain text with section labels on their own lines.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error("AI summary error:", error);
    return NextResponse.json({ summary: buildMockSummary(input) });
  }
}
