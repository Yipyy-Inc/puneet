import { z } from "zod";

export const savedReplyCategorySchema = z.enum([
  "boarding",
  "grooming",
  "daycare",
  "pricing",
  "general",
]);
export type SavedReplyCategory = z.infer<typeof savedReplyCategorySchema>;

export const savedReplySchema = z.object({
  id: z.string(),
  shortcut: z.string(),
  title: z.string(),
  body: z.string(),
  category: savedReplyCategorySchema,
  createdBy: z.string().optional(),
  createdAt: z.string(),
  useCount: z.number().default(0),
});
export type SavedReply = z.infer<typeof savedReplySchema>;

export const SAVED_REPLY_CATEGORY_LABELS: Record<SavedReplyCategory, string> = {
  boarding: "Boarding",
  grooming: "Grooming",
  daycare: "Daycare",
  pricing: "Pricing",
  general: "General",
};

export const SAVED_REPLY_CATEGORY_COLORS: Record<SavedReplyCategory, string> = {
  boarding: "bg-emerald-100 text-emerald-700 border-emerald-200",
  grooming: "bg-pink-100 text-pink-700 border-pink-200",
  daycare: "bg-blue-100 text-blue-700 border-blue-200",
  pricing: "bg-amber-100 text-amber-700 border-amber-200",
  general: "bg-slate-100 text-slate-600 border-slate-200",
};
