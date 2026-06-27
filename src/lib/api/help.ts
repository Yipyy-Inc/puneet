import type { HelpArticle } from "@/data/help-articles";
import { getPublishedHelpArticles } from "@/lib/kb-articles-store";

// Query factory for help/FAQ content. The facility Help Center renders whatever
// is Published in the Knowledge Base admin (Task 57) — admins manage it there,
// facilities read it here.
export const helpQueries = {
  articles: () => ({
    queryKey: ["help", "articles"] as const,
    queryFn: async (): Promise<HelpArticle[]> => getPublishedHelpArticles(),
  }),
};
