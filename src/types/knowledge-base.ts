// Knowledge Base article (admin-managed help content that feeds the facility
// Help Center via lib/api/help.ts — Task 57).

export type KbArticleStatus = "Draft" | "Published" | "Archived";

export interface KbArticle {
  id: string;
  title: string;
  category: string;
  /** Rich HTML body (from the WYSIWYG editor). */
  body: string;
  status: KbArticleStatus;
  /** Times the article was viewed in the facility Help Center. */
  views: number;
  /** "Was this helpful?" votes. */
  helpfulYes: number;
  helpfulNo: number;
  author: string;
  updatedAt: string;
}
