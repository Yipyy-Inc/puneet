import type { DataSubjectRequest } from "@/data/security-compliance";

import { createZip } from "./zip";

// GDPR Article 20 (data portability) export — builds a structured,
// machine-readable ZIP of the requester's record and triggers a download.

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "subject"
  );
}

export function downloadDsrExport(request: DataSubjectRequest): string {
  const payload = {
    article: "GDPR Article 20 — Right to Data Portability",
    generatedAt: new Date().toISOString(),
    requester: {
      id: request.requesterId,
      name: request.requesterName,
      email: request.requesterEmail,
    },
    facility: request.facilityName ?? null,
    request: {
      id: request.id,
      type: request.requestType,
      submittedAt: request.submittedAt,
      deadline: request.deadline,
      status: request.status,
      verificationStatus: request.verificationStatus,
    },
    dataCategories: request.dataCategories,
  };

  const readme = [
    "GDPR Article 20 — Data Portability Export",
    "",
    `Subject: ${request.requesterName} <${request.requesterEmail}>`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "personal-data.json contains the structured, machine-readable export of the",
    "data categories requested. Provide this archive to the data subject.",
  ].join("\n");

  const enc = new TextEncoder();
  const blob = createZip([
    {
      name: "personal-data.json",
      data: enc.encode(JSON.stringify(payload, null, 2)),
    },
    { name: "README.txt", data: enc.encode(readme) },
  ]);

  const fileName = `${slug(request.requesterName)}-gdpr-export.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return fileName;
}
