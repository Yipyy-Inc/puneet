"use client";

import { useState } from "react";
import { GroomingBookingFlow } from "@/components/grooming/GroomingBookingFlow";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function TestGroomingBookingPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Test: Grooming Booking Flow</h1>
          <p className="text-muted-foreground">
            Phase 2, Step 1: Pet Identification
          </p>
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setIsOpen(true)}>
            <Calendar className="mr-2 h-5 w-5" />
            Start Grooming Booking
          </Button>
        </div>

        <GroomingBookingFlow open={isOpen} onOpenChange={setIsOpen} />
      </div>
    </div>
  );
}
