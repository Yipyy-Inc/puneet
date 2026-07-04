import {
  loadInvoiceTemplate,
  saveInvoiceTemplate,
} from "@/data/invoice-template";
import type { InvoiceTemplate } from "@/types/invoice-template";

export const invoiceTemplateQueries = {
  detail: () => ({
    queryKey: ["invoice-template"] as const,
    queryFn: async (): Promise<InvoiceTemplate> => loadInvoiceTemplate(),
  }),
};

export const invoiceTemplateMutations = {
  save: (template: InvoiceTemplate) => ({
    mutationFn: async (): Promise<InvoiceTemplate> => {
      saveInvoiceTemplate(template);
      return template;
    },
  }),
};
