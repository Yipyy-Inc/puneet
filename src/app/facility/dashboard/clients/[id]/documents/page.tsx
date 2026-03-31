"use client";

import { use } from "react";
import { clients } from "@/data/clients";
import { clientDocuments } from "@/data/documents";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default function ClientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;

  const docs = clientDocuments.filter((d) => d.clientId === clientId);

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Documents ({docs.length})</h2>
      {docs.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No documents uploaded
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-md border px-4 py-3"
            >
              <FileText className="text-muted-foreground size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{doc.name}</p>
                <p className="text-muted-foreground text-xs">
                  {doc.type} ·{" "}
                  {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">
                {doc.type}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
