import { Bot, AlertCircle, Sparkles, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiCallSummaries } from "@/data/calling";

/**
 * Transcript + AI summary for a call, looked up from the shared call data by
 * `callId`. Single source of truth reused by the Call Log, Voicemail, and
 * Recordings views — no per-view data duplication.
 */
export function CallTranscriptSummary({
  callId,
  transcription,
}: {
  callId: string;
  transcription?: string;
}) {
  const aiSummary = aiCallSummaries.find((s) => s.callId === callId);

  if (!transcription && !aiSummary) {
    return (
      <p className="text-xs text-muted-foreground">
        No transcription available for this call.
      </p>
    );
  }

  const sentimentColor = !aiSummary
    ? ""
    : aiSummary.sentimentScore >= 7
      ? "text-green-600"
      : aiSummary.sentimentScore >= 4
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div className="space-y-2">
      {transcription && (
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3" />
            Transcript
          </p>
          <p className="text-xs leading-relaxed text-foreground">{transcription}</p>
        </div>
      )}

      {aiSummary && (
        <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Bot className="size-3.5 text-violet-500" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              AI Summary
            </p>
            <span className={cn("ml-auto text-[11px] font-semibold", sentimentColor)}>
              Sentiment {aiSummary.sentimentScore}/10
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <p>
              <span className="font-semibold text-violet-800">Reason: </span>
              <span className="text-muted-foreground">{aiSummary.callReason}</span>
            </p>
            {aiSummary.followUpTask && (
              <p>
                <span className="font-semibold text-violet-800">Follow-up: </span>
                <span className="text-muted-foreground">{aiSummary.followUpTask}</span>
              </p>
            )}
            {aiSummary.riskFlag !== "none" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-red-700">
                <AlertCircle className="size-3" />
                {aiSummary.riskFlag.replace(/_/g, " ")}
              </span>
            )}
            {aiSummary.upsellOpportunities.length > 0 && (
              <div>
                <p className="mb-0.5 flex items-center gap-1 font-semibold text-violet-800">
                  <Sparkles className="size-3" />
                  Upsell opportunities
                </p>
                <ul className="space-y-0.5">
                  {aiSummary.upsellOpportunities.map((u) => (
                    <li key={u} className="text-muted-foreground">• {u}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
