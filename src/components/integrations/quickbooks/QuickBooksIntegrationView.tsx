"use client";

import { useState } from "react";

import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { useQuickBooksSetup } from "@/lib/quickbooks/setup-store";

import { QuickBooksAccountHealthCheck } from "./QuickBooksAccountHealthCheck";
import { QuickBooksCompanyConfirmCard } from "./QuickBooksCompanyConfirmCard";
import { QuickBooksConsentModal } from "./QuickBooksConsentModal";
import { QuickBooksDashboard } from "./QuickBooksDashboard";
import { QuickBooksEntryPoint } from "./QuickBooksEntryPoint";
import { QuickBooksMappingScreen } from "./QuickBooksMappingScreen";
import { QuickBooksSetupSuccess } from "./QuickBooksSetupSuccess";
import { QuickBooksSyncSettings } from "./QuickBooksSyncSettings";

// The one router for this route. Section 3A RULE: the entry point is a
// PRE-connection screen; once a facility has connected they get the setup
// wizard, and once setup is finished, the management dashboard.
//
// Every step but the success screen is derived from PERSISTED state, so a
// reload puts the facility back exactly where they were.

export function QuickBooksIntegrationView({
  scope,
}: {
  scope: QuickBooksScope;
}) {
  const connection = useQuickBooksConnection(scope);
  const setup = useQuickBooksSetup(scope);
  const [consentOpen, setConsentOpen] = useState(false);
  // Held only for the run that just finished: the success screen is a moment,
  // not a state a facility should land back on after a reload.
  const [testDocument, setTestDocument] = useState<string | undefined>();

  // "Never connected" is the only state the pitch belongs in. An expired or
  // interrupted connection is still a connection — showing the sales page there
  // would lose the facility their mappings and their reconnect path.
  //
  // Step 2 (3C) reads the PERSISTED setup store, not component state, so a
  // facility that connects and then reloads still gets asked. Being silently
  // treated as confirmed is how entries end up in the wrong company's books.
  const step =
    connection.status === "disconnected"
      ? "entry"
      : !setup.companyConfirmed
        ? "confirm"
        : !setup.accountsReviewed
          ? "accounts"
          : !setup.mappingsReviewed
            ? "mapping"
            : !setup.setupComplete
              ? "settings"
              : "connected";

  return (
    <>
      {step === "entry" && (
        <QuickBooksEntryPoint onConnect={() => setConsentOpen(true)} />
      )}
      {step === "confirm" && <QuickBooksCompanyConfirmCard scope={scope} />}
      {step === "accounts" && <QuickBooksAccountHealthCheck scope={scope} />}
      {step === "mapping" && <QuickBooksMappingScreen scope={scope} />}
      {step === "settings" && (
        <QuickBooksSyncSettings scope={scope} onFinished={setTestDocument} />
      )}
      {step === "connected" && testDocument && (
        <QuickBooksSetupSuccess
          scope={scope}
          testDocumentNumber={testDocument}
          onViewDashboard={() => setTestDocument(undefined)}
        />
      )}
      {step === "connected" && !testDocument && (
        <QuickBooksDashboard scope={scope} />
      )}

      {/* Mounted here rather than inside the entry point. Approving writes the
          connection, which flips `step` away from "entry" — a modal owned by
          that branch would unmount mid-flow and its success panel would never
          be seen. */}
      <QuickBooksConsentModal
        open={consentOpen}
        scope={scope}
        onOpenChange={setConsentOpen}
        onContinue={() => setConsentOpen(false)}
      />
    </>
  );
}
