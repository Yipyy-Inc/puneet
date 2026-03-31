"use client";

import { use } from "react";
import { clients } from "@/data/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock } from "lucide-react";

const MOCK_FORMS = [
  { id: "f1", name: "New Client Intake Form", status: "completed", date: "2025-06-15" },
  { id: "f2", name: "Liability Waiver", status: "completed", date: "2025-06-15" },
  { id: "f3", name: "Vaccination Proof Upload", status: "completed", date: "2025-07-01" },
  { id: "f4", name: "Daycare Agreement", status: "completed", date: "2025-06-15" },
  { id: "f5", name: "Swimming Waiver", status: "pending", date: "" },
  { id: "f6", name: "Annual Health Update", status: "pending", date: "" },
];

export default function ClientFormsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = clients.find((c) => c.id === parseInt(id, 10));
  if (!client) return null;

  const completed = MOCK_FORMS.filter((f) => f.status === "completed");
  const pending = MOCK_FORMS.filter((f) => f.status === "pending");

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Forms & Agreements</h2>

      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <Clock className="size-4" />
              Pending ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-sm font-medium">{f.name}</span>
                <Badge variant="secondary" className="text-[10px]">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle className="size-4 text-emerald-500" />
            Completed ({completed.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completed.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="text-muted-foreground size-4" />
                <span className="text-sm">{f.name}</span>
              </div>
              <span className="text-muted-foreground text-xs">{new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
