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
  resultType?: string;
  resultLabel?: string;
  denialReason?: string;
  denialNotes?: string;
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
  evaluatorNotes?: string;
  approvedServices: string[];
  answers: Record<string, unknown>;
}

const FALLBACK_SUMMARY =
  "Unable to generate summary at this time. Please try again or write the summary manually.";

export async function POST(req: NextRequest) {
  const input: EvaluationInput = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json({ summary: FALLBACK_SUMMARY });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a professional pet care facility staff writer. Based on the following evaluation data for a pet, write a warm, professional summary that will be sent to the pet's owner (the "pet parent").

**Pet Details:**
- Name: ${input.petName}
- Breed: ${input.petBreed}
${input.petAge ? `- Age: ${input.petAge}` : ""}

**Evaluation Result:** ${input.resultLabel || (input.result === "pass" ? "PASSED" : "DID NOT PASS")}
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
**Denial/Re-evaluation Reason:** ${input.denialReason || "None"}
**Denial/Re-evaluation Notes:** ${input.denialNotes || "None"}
**Internal Evaluator Notes:** ${input.evaluatorNotes || "None"}
**Services Approved For:** ${input.approvedServices.join(", ") || "None"}

**Additional Answers:** ${JSON.stringify(input.answers)}

Write the summary in these sections:
1. **Opening** (1-2 sentences): A warm greeting addressing the pet by name. Set a positive, professional tone.
2. **Temperament Summary** (2-3 sentences): Describe the pet's personality based on the temperament data. Use friendly language — translate "dog-friendly: true, energy: high" into something like "Buddy showed wonderful social skills with other dogs and brought high energy to every interaction."
3. **Play & Social Profile** (1-2 sentences): Describe their play style and which group they'd fit best with.
4. **Key Observations** (2-3 sentences): Expand on the staff notes, denial/re-evaluation reason, and behavior tags into natural prose. Highlight positive traits where appropriate. If the pet didn't pass or needs re-evaluation, frame concerns diplomatically and constructively.
5. **Next Steps** (1-2 sentences): What the owner can expect next. If passed, mention the services unlocked. If approved with restrictions, clearly mention that staff will follow the noted restrictions. If not passed or re-evaluation is needed, suggest what might help (more socialization, training, health follow-up, or another evaluation).

Keep the total under 200 words. Be warm, professional, and reassuring. Avoid clinical language. Write as if you're a caring staff member who genuinely enjoyed meeting the pet. Do NOT use emojis. Do NOT use markdown formatting — output plain text with section labels on their own lines.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const usage = message.usage;
    console.log(
      `[AI Usage] type=evaluation_summary input=${usage?.input_tokens ?? 0} output=${usage?.output_tokens ?? 0}`,
    );

    return NextResponse.json({
      summary: text,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
      },
    });
  } catch (error) {
    console.error("AI summary error:", error);
    return NextResponse.json({ summary: FALLBACK_SUMMARY });
  }
}
