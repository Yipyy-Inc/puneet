"use client";

import { useState } from "react";

import {
  defaultConfig,
  REPORT_SOURCES,
  type ReportConfig,
} from "@/lib/report-data-sources";
import type { SavedReport } from "@/lib/saved-reports-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ReportBuilder } from "./report-builder";
import { SavedReportsList } from "./saved-reports-list";

interface BuilderSeed {
  config: ReportConfig;
  name: string;
  id: string | null;
  autorun: boolean;
  nonce: number;
}

export function CustomReportsClient() {
  const [tab, setTab] = useState("saved");
  const [seed, setSeed] = useState<BuilderSeed>(() => ({
    config: defaultConfig(REPORT_SOURCES[0].id),
    name: "",
    id: null,
    autorun: false,
    nonce: 0,
  }));

  const openBuilder = (next: Omit<BuilderSeed, "nonce">) => {
    setSeed((prev) => ({ ...next, nonce: prev.nonce + 1 }));
    setTab("builder");
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="saved">Saved Reports</TabsTrigger>
        <TabsTrigger value="builder">Report Builder</TabsTrigger>
      </TabsList>

      <TabsContent value="saved" className="mt-4">
        <SavedReportsList
          onNew={() =>
            openBuilder({
              config: defaultConfig(REPORT_SOURCES[0].id),
              name: "",
              id: null,
              autorun: false,
            })
          }
          onRun={(r: SavedReport) =>
            openBuilder({
              config: r.config,
              name: r.name,
              id: r.id,
              autorun: true,
            })
          }
          onEdit={(r: SavedReport) =>
            openBuilder({
              config: r.config,
              name: r.name,
              id: r.id,
              autorun: false,
            })
          }
        />
      </TabsContent>

      <TabsContent value="builder" className="mt-4">
        <ReportBuilder
          key={seed.nonce}
          initialConfig={seed.config}
          initialName={seed.name}
          editingId={seed.id}
          autorun={seed.autorun}
        />
      </TabsContent>
    </Tabs>
  );
}
