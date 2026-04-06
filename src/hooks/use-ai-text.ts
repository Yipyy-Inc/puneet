import { useState, useCallback } from "react";

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

interface UseAiTextOptions {
  type: TextType;
  tone?: "warm" | "professional" | "playful";
  maxWords?: number;
}

export function useAiText({ type, tone = "warm", maxWords }: UseAiTextOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (context: Record<string, unknown>): Promise<string> => {
      setIsGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, context, tone, maxWords }),
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        return data.text ?? "";
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to generate";
        setError(msg);
        return "";
      } finally {
        setIsGenerating(false);
      }
    },
    [type, tone, maxWords],
  );

  return { generate, isGenerating, error };
}
