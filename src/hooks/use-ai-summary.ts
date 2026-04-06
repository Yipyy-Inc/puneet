import { useState } from "react";

export interface UseAiSummaryReturn {
  summary: string;
  isGenerating: boolean;
  error: string | null;
  generate: (endpoint: string, input: Record<string, unknown>) => Promise<void>;
  reset: () => void;
  setSummary: (text: string) => void;
}

export function useAiSummary(): UseAiSummaryReturn {
  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (endpoint: string, input: Record<string, unknown>) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setSummary(data.summary ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setSummary("");
    setError(null);
  };

  return { summary, isGenerating, error, generate, reset, setSummary };
}
