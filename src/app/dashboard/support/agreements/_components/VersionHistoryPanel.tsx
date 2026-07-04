"use client";

import { useQuery } from "@tanstack/react-query";
import { History, RotateCcw, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  agreementQueries,
  type AgreementTemplateVersion,
} from "@/lib/api/agreements";

export function VersionHistoryPanel({
  templateId,
  currentVersion,
  onRestore,
  onClose,
}: {
  templateId: string | null;
  currentVersion: number;
  onRestore: (version: AgreementTemplateVersion) => void;
  onClose: () => void;
}) {
  const { data, isPending } = useQuery({
    ...agreementQueries.versions(templateId ?? "__none__"),
    enabled: templateId !== null,
  });

  const versions = templateId ? (data ?? []) : [];

  return (
    <aside className="bg-muted/20 flex w-72 shrink-0 flex-col border-l">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <History className="text-muted-foreground size-4" />
          Version History
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
          aria-label="Close version history"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {templateId === null ? (
            <p className="text-muted-foreground px-1 py-6 text-center text-xs">
              Save this template to create its first version.
            </p>
          ) : isPending ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : versions.length === 0 ? (
            <p className="text-muted-foreground px-1 py-6 text-center text-xs">
              No versions yet.
            </p>
          ) : (
            versions.map((v) => {
              const isCurrent = v.version === currentVersion;
              return (
                <div
                  key={v.version}
                  className="bg-background rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      Version {v.version}
                      {isCurrent ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Current
                        </Badge>
                      ) : null}
                    </span>
                    {!isCurrent ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => onRestore(v)}
                      >
                        <RotateCcw className="size-3.5" />
                        Restore
                      </Button>
                    ) : null}
                  </div>
                  <div className="text-muted-foreground mt-1 space-y-0.5 text-[11px]">
                    <p>{new Date(v.savedAt).toLocaleString()}</p>
                    <p className="flex items-center gap-1">
                      <User className="size-3" />
                      {v.author}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
