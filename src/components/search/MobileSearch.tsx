"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GlobalSearchNext } from "@/components/search/GlobalSearchNext";

/**
 * Mobile-only search affordance. The full-width header search bar is hidden on
 * phones (it can't share the row with the action cluster), so this renders a
 * search icon that opens the same global search inside a dialog — giving phones
 * the search access the desktop header has.
 */
export function MobileSearch({
  canCreateCustomer,
  className,
}: {
  canCreateCustomer?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className={cn("hover:bg-muted size-9 rounded-xl", className)}
      >
        <Search className="size-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-20 max-w-[calc(100vw-1.5rem)] translate-y-0 gap-0 p-3"
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <GlobalSearchNext
            canCreateCustomer={canCreateCustomer}
            className="w-full max-w-none"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
