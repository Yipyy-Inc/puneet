"use client";

import { useState } from "react";
import { GroomingBookingFlow } from "@/components/grooming/GroomingBookingFlow";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export default function TestGroomingBookingPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Test: Grooming Booking Flow"
          description="Phase 2, Step 1: Pet Identification"
        />

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setIsOpen(true)}>
            <Calendar className="mr-2 size-5" />
            Start Grooming Booking
          </Button>
        </div>

        <GroomingBookingFlow open={isOpen} onOpenChange={setIsOpen} />
      </div>
    </div>
  );
}
