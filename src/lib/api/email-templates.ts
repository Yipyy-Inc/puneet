import { emailTemplates } from "@/data/email-templates";
import type { EmailTemplate } from "@/types/email-templates";

// Query factory for the email-template system (shared by the Email Templates
// admin page and automated senders such as dunning).
export const emailTemplateQueries = {
  list: () => ({
    queryKey: ["email-templates"] as const,
    queryFn: async (): Promise<EmailTemplate[]> => emailTemplates,
  }),
};
