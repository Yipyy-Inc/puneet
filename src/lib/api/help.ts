import { helpArticles } from "@/data/help-articles";
import type { HelpArticle } from "@/data/help-articles";

// Query factory for help/FAQ content. Swap the queryFn for the Knowledge Base
// API (Task 57) without touching the drawer UI.
export const helpQueries = {
  articles: () => ({
    queryKey: ["help", "articles"] as const,
    queryFn: async (): Promise<HelpArticle[]> => helpArticles,
  }),
};
