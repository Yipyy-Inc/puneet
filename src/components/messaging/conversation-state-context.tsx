"use client";

import { createContext, useCallback, useContext, useState } from "react";
import {
  conversationAssignments as defaultAssignments,
  closedThreadIds as defaultClosed,
  messagingStaff,
  type MessagingStaff,
} from "@/data/saved-replies";

type AssignmentMap = Record<string, string | undefined>;
type ClosedSet = Set<string>;

interface ConversationStateContextValue {
  staff: MessagingStaff[];
  assignments: AssignmentMap;
  closed: ClosedSet;
  assignTo: (threadId: string, staffId: string | null) => void;
  setClosed: (threadId: string, closed: boolean) => void;
  isClosed: (threadId: string) => boolean;
  getAssignee: (threadId: string) => MessagingStaff | undefined;
}

const ConversationStateContext = createContext<ConversationStateContextValue | null>(null);

export function ConversationStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [assignments, setAssignments] = useState<AssignmentMap>(
    () => ({ ...defaultAssignments }),
  );
  const [closed, setClosedState] = useState<ClosedSet>(
    () => new Set(defaultClosed),
  );

  const assignTo = useCallback(
    (threadId: string, staffId: string | null) => {
      setAssignments((prev) => ({ ...prev, [threadId]: staffId ?? undefined }));
    },
    [],
  );

  const setClosed = useCallback((threadId: string, isClosed: boolean) => {
    setClosedState((prev) => {
      const next = new Set(prev);
      if (isClosed) next.add(threadId);
      else next.delete(threadId);
      return next;
    });
  }, []);

  const isClosed = useCallback(
    (threadId: string) => closed.has(threadId),
    [closed],
  );

  const getAssignee = useCallback(
    (threadId: string) => {
      const id = assignments[threadId];
      return id ? messagingStaff.find((s) => s.id === id) : undefined;
    },
    [assignments],
  );

  return (
    <ConversationStateContext.Provider
      value={{
        staff: messagingStaff,
        assignments,
        closed,
        assignTo,
        setClosed,
        isClosed,
        getAssignee,
      }}
    >
      {children}
    </ConversationStateContext.Provider>
  );
}

const FALLBACK: ConversationStateContextValue = {
  staff: messagingStaff,
  assignments: {},
  closed: new Set(),
  assignTo: () => {},
  setClosed: () => {},
  isClosed: () => false,
  getAssignee: () => undefined,
};

export function useConversationState() {
  const ctx = useContext(ConversationStateContext);
  return ctx ?? FALLBACK;
}
