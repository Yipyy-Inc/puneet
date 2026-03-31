"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { ModuleRequestForm } from "@/components/facility/ModuleRequestForm";
import { getRequestsForFacility } from "@/data/module-requests";

export default function ModuleRequestPage() {
  const [formOpen, setFormOpen] = useState(false);
  const requests = getRequestsForFacility(11);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-4 text-emerald-500" />;
      case "declined":
        return <XCircle className="size-4 text-red-500" />;
      default:
        return <Clock className="text-muted-foreground size-4" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Module Requests</h2>
          <p className="text-muted-foreground text-sm">
            Request new service modules for your facility
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Request New Module
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4" />
            Your Requests
            {requests.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {requests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardList className="text-muted-foreground mx-auto mb-3 size-10 opacity-50" />
              <p className="text-muted-foreground text-sm">
                No module requests yet. Click &ldquo;Request New Module&rdquo;
                to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start gap-3 rounded-lg border p-4"
                >
                  {statusIcon(req.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {req.serviceName}
                      </h4>
                      <Badge
                        variant={
                          req.status === "completed"
                            ? "outline"
                            : req.status === "declined"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] capitalize"
                      >
                        {req.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {req.description}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      Requested {formatDate(req.requestedAt)} · Category:{" "}
                      {req.suggestedCategory === "unsure"
                        ? "Unsure"
                        : req.suggestedCategory.replace("_", " ")}
                    </p>
                    {req.notes && (
                      <p className="mt-1 text-xs text-emerald-600 italic">
                        {req.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModuleRequestForm
        open={formOpen}
        onOpenChange={setFormOpen}
        facilityId={11}
        facilityName="Example Pet Care Facility"
      />
    </div>
  );
}
