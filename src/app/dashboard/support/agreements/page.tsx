import { FileSignature } from "lucide-react";

import { AgreementsTabs } from "./_components/agreements-tabs";

export default function AgreementsPage() {
  return (
    <div className="p-4">
      <header className="mb-4 px-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <FileSignature className="text-muted-foreground size-5" />
          Agreements & Waivers
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Build reusable document templates and track every agreement sent to
          your facilities.
        </p>
      </header>

      <AgreementsTabs />
    </div>
  );
}
