import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

type TextType =
  | "chat_reply"
  | "email_marketing"
  | "email_subject"
  | "sms_message"
  | "incident_description"
  | "incident_client_note"
  | "booking_note"
  | "staff_note"
  | "pet_update"
  | "quick_reply"
  | "automation_template"
  | "general";

interface GenerateTextInput {
  type: TextType;
  context: Record<string, unknown>;
  tone?: "warm" | "professional" | "playful";
  maxWords?: number;
}

const SYSTEM_PROMPTS: Record<TextType, string> = {
  chat_reply: `You are a helpful staff member at a pet care facility replying to a client message. Write a warm, professional reply. Keep it concise (2-3 sentences). Address any questions or concerns directly. Do not use emojis.`,

  email_marketing: `You are a marketing copywriter for a pet care facility. Write engaging email body copy that drives bookings. Use a warm, inviting tone. Include a clear call-to-action. Keep it under 150 words. Do not use emojis. Do not include subject line — just the body.`,

  email_subject: `You are a marketing copywriter. Write a compelling email subject line for a pet care facility. Keep it under 60 characters. Make it specific and action-oriented. Return ONLY the subject line, nothing else.`,

  sms_message: `You are a staff member at a pet care facility. Write a brief SMS message. Keep it under 160 characters. Be friendly but concise. Do not use emojis.`,

  incident_description: `You are a pet care facility staff member documenting an incident. Write a clear, factual description of what happened. Use professional language. Include relevant details about timing, context, and actions taken. Keep it under 100 words.`,

  incident_client_note: `You are a pet care facility staff member writing a note to a pet parent about an incident. Be empathetic, reassuring, and transparent. Explain what happened clearly without being alarming. Include what actions were taken. Keep it under 80 words. Do not use emojis.`,

  booking_note: `You are a pet care staff member adding a note to a booking. Write a clear, concise note about the booking details, special requests, or observations. Keep it under 50 words.`,

  staff_note: `You are a pet care staff member writing an internal note about a pet or client. Be factual and specific. Include relevant behavioral observations, care needs, or important details for other staff. Keep it under 60 words.`,

  pet_update: `You are a pet care staff member sending a live update to a pet parent about their pet's day. Be warm and brief. Describe what the pet is doing right now. Keep it to 1-2 sentences. Do not use emojis.`,

  quick_reply: `You are a pet care staff member creating a reusable quick reply template. Write a professional, friendly response that can be used in multiple situations. Use {{customer_name}} and {{pet_name}} as variables where appropriate. Keep it under 50 words.`,

  automation_template: `You are writing an automated message template for a pet care facility. Use personalization variables like {{customer_name}}, {{pet_name}}, {{booking_date}}, {{service_name}}, {{facility_name}}. Be warm and professional. Keep it under 100 words. Do not use emojis.`,

  general: `You are a helpful assistant at a pet care facility. Write clear, professional text based on the given context. Do not use emojis.`,
};

const TONE_MODIFIERS: Record<string, string> = {
  warm: "Use a warm, caring, and reassuring tone. Write as if you genuinely love pets.",
  professional:
    "Use a formal, concise, and factual tone. Be direct and efficient.",
  playful:
    "Use a fun, lighthearted, and upbeat tone. Be enthusiastic about pets.",
};

export async function POST(req: NextRequest) {
  const input: GenerateTextInput = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return NextResponse.json({
      text: "Unable to generate text. Please configure your API key.",
    });
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = SYSTEM_PROMPTS[input.type] || SYSTEM_PROMPTS.general;
  const toneModifier = TONE_MODIFIERS[input.tone ?? "warm"] ?? "";
  const maxWords = input.maxWords ?? 100;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `${systemPrompt} ${toneModifier} Maximum ${maxWords} words.`,
      messages: [
        {
          role: "user",
          content: `Context:\n${JSON.stringify(input.context, null, 2)}\n\nGenerate the text now.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Token usage tracking
    const usage = message.usage;
    console.log(
      `[AI Usage] type=${input.type} input=${usage?.input_tokens ?? 0} output=${usage?.output_tokens ?? 0} total=${(usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0)}`,
    );

    return NextResponse.json({
      text,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
      },
    });
  } catch (error) {
    console.error("AI text generation error:", error);
    return NextResponse.json({
      text: "Unable to generate text at this time. Please try again.",
    });
  }
}
