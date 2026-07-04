"use client";

import type { Editor } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Library, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { agreementQueries } from "@/lib/api/agreements";

export function ClauseLibraryDrawer({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { data: categories, isPending } = useQuery(agreementQueries.clauses());

  const insertClause = (content: string) => {
    // Inserted as normal nodes at the cursor — fully editable afterwards.
    editor.chain().focus().insertContent(content).run();
  };

  return (
    <aside className="bg-muted/20 flex w-72 shrink-0 flex-col border-l">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Library className="text-muted-foreground size-4" />
          Clause Library
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onClose}
          aria-label="Close clause library"
        >
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isPending
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))
            : categories?.map((category) => (
                <Collapsible key={category.id} defaultOpen>
                  <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold tracking-wide uppercase">
                    {category.label}
                    <ChevronDown className="size-3.5" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-0.5 pb-1">
                    {category.clauses.map((clause) => (
                      <button
                        key={clause.id}
                        type="button"
                        onClick={() => insertClause(clause.content)}
                        className="group hover:bg-background flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors"
                        title="Insert clause at cursor"
                      >
                        <Plus className="text-muted-foreground group-hover:text-primary size-3.5 shrink-0" />
                        <span
                          className="min-w-0 truncate"
                          dangerouslySetInnerHTML={{ __html: clause.title }}
                        />
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
        </div>
      </ScrollArea>

      <p className="text-muted-foreground border-t px-4 py-2 text-[11px]">
        Click a clause to insert it at the cursor. Inserted text stays fully
        editable.
      </p>
    </aside>
  );
}
