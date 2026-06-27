"use client";

import { useState } from "react";
import { Megaphone, Voicemail as VoicemailIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSupportGreetings } from "@/lib/support-greeting-store";
import { useSupportVoicemails } from "@/lib/support-voicemail-store";
import type { VoicemailGreeting } from "@/types/calling";
import { GreetingCard } from "./greeting-card";
import { GreetingEditModal } from "./greeting-edit-modal";
import { VoicemailRow } from "./voicemail-row";

export function VoicemailTab() {
  const voicemails = useSupportVoicemails();
  const greetings = useSupportGreetings();
  const hydrated = useHydrated();

  const [editing, setEditing] = useState<VoicemailGreeting | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function openEdit(greeting: VoicemailGreeting) {
    setEditing(greeting);
    setEditOpen(true);
  }

  const newCount = voicemails.filter((v) => v.isNew).length;

  return (
    <div className="space-y-8">
      {/* Voicemail Messages */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
            <VoicemailIcon className="size-4" />
          </span>
          <h2 className="text-base font-semibold">Voicemail Messages</h2>
          {hydrated && newCount > 0 && (
            <Badge className="bg-blue-600 text-white hover:bg-blue-600">
              {newCount} new
            </Badge>
          )}
        </div>

        {!hydrated ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : voicemails.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
            No voicemails — you&apos;re all caught up.
          </p>
        ) : (
          <div className="space-y-2">
            {voicemails.map((vm) => (
              <VoicemailRow key={vm.id} voicemail={vm} />
            ))}
          </div>
        )}
      </section>

      {/* Greetings */}
      <section className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
              <Megaphone className="size-4" />
            </span>
            <h2 className="text-base font-semibold">Greetings</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Select which greeting plays on the support line, or edit any script.
            The Main Greeting is auto-managed by business hours.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {greetings.map((g) => (
            <GreetingCard key={g.id} greeting={g} onEdit={openEdit} />
          ))}
        </div>
      </section>

      <GreetingEditModal
        greeting={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
