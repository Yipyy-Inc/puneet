// Words in a transcription that auto-flag a recording for manager review.
export const FLAG_KEYWORDS = ["complaint", "upset", "cancel"] as const;

const KEYWORD_RE = /\b(complaint|upset|cancel)/i;

/** The flag keyword found in a transcription, if any (lowercased). */
export function matchedFlagKeyword(transcription?: string): string | null {
  if (!transcription) return null;
  const m = transcription.match(KEYWORD_RE);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Whether a recorded call should be auto-flagged for manager review:
 *   - AI sentiment is 4/10 or below, OR
 *   - the transcription mentions complaint / upset / cancel.
 */
export function shouldAutoFlag(
  transcription: string | undefined,
  sentimentScore: number | undefined,
): boolean {
  if (typeof sentimentScore === "number" && sentimentScore <= 4) return true;
  return matchedFlagKeyword(transcription) !== null;
}
