"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { FormOverrideDialogHost } from "@/components/forms/form-override-dialog";
import { CareOverrideDialogHost } from "@/components/bookings/care-override-dialog";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Renders nothing until a booking asks staff why it goes ahead
          without a required form. */}
      <FormOverrideDialogHost />
      {/* And nothing until a check-out asks why the pet goes home with
          today's meals or doses unlogged. */}
      <CareOverrideDialogHost />
    </QueryClientProvider>
  );
}
