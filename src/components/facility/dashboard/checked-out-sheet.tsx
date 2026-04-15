"use client";

import { useState } from "react";
import { LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookingCard } from "@/components/facility/dashboard/booking-card";
import type { UnifiedBooking } from "@/hooks/use-unified-bookings";

interface CheckedOutSheetProps {
  bookings: UnifiedBooking[];
  count: number;
}

export function CheckedOutSheet({ bookings, count }: CheckedOutSheetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = bookings.filter((b) => {
    if (!query.trim()) return true;
    const v = query.toLowerCase();
    return (
      b.petName.toLowerCase().includes(v) ||
      b.ownerName.toLowerCase().includes(v) ||
      b.serviceLabel.toLowerCase().includes(v)
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          <LogOut className="size-3.5" />
          Checked Out Today
          <Badge className="ml-1 border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {count}
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[90vw] !max-w-[960px] gap-0 overflow-hidden p-0 sm:!max-w-[960px]">
        <DialogHeader className="items-center border-b p-5 pr-12 text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-base">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-sm">
              <LogOut className="size-4" />
            </span>
            Checked Out Today
            <Badge variant="secondary" className="ml-1">
              {count}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-center">
            Pets that already departed your facility today.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search by pet, owner, or service…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>

        <div className="p-5">
          {filtered.length === 0 ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
              {query ? "No matches" : "No checkouts yet today"}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((b) => (
                <BookingCard key={b.id} booking={b} primaryAction="none" />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
