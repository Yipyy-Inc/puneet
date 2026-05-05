"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
  scheduledMessages as defaultScheduled,
  type ScheduledMessage,
} from "@/data/saved-replies";

interface ScheduledMessagesContextValue {
  scheduled: ScheduledMessage[];
  schedule: (message: ScheduledMessage) => void;
  cancel: (id: string) => void;
  reschedule: (id: string, iso: string) => void;
  count: number;
}

const ScheduledMessagesContext = createContext<ScheduledMessagesContextValue | null>(null);

export function ScheduledMessagesProvider({ children }: { children: React.ReactNode }) {
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>(defaultScheduled);

  const schedule = useCallback((message: ScheduledMessage) => {
    setScheduled((prev) =>
      [message, ...prev].sort(
        (a, b) =>
          new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
      ),
    );
  }, []);

  const cancel = useCallback((id: string) => {
    setScheduled((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const reschedule = useCallback((id: string, iso: string) => {
    setScheduled((prev) =>
      prev
        .map((m) => (m.id === id ? { ...m, scheduledFor: iso } : m))
        .sort(
          (a, b) =>
            new Date(a.scheduledFor).getTime() -
            new Date(b.scheduledFor).getTime(),
        ),
    );
  }, []);

  return (
    <ScheduledMessagesContext.Provider
      value={{ scheduled, schedule, cancel, reschedule, count: scheduled.length }}
    >
      {children}
    </ScheduledMessagesContext.Provider>
  );
}

export function useScheduledMessages() {
  const ctx = useContext(ScheduledMessagesContext);
  if (!ctx) {
    throw new Error(
      "useScheduledMessages must be used within ScheduledMessagesProvider",
    );
  }
  return ctx;
}
