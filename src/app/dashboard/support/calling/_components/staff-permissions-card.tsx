"use client";

import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supportAgents } from "@/hooks/use-support-inbox";
import {
  toggleAgentPermission,
  useSupportCallingSettings,
} from "@/lib/support-calling-settings-store";
import { FacilityAvatar } from "../../chat/_components/facility-avatar";
import { PERMISSION_COLUMNS } from "./settings-utils";

function humanizeRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function StaffPermissionsCard() {
  const settings = useSupportCallingSettings();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-indigo-600" />
          Staff Permissions
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Control which agents can access each calling feature.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left font-medium">Agent</th>
                {PERMISSION_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {supportAgents.map((agent) => {
                const perms = settings.permissions[agent.id];
                return (
                  <tr key={agent.id} className="border-b last:border-0">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <FacilityAvatar
                          name={agent.name}
                          id={agent.id}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{agent.name}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {humanizeRole(agent.role)}
                          </p>
                        </div>
                      </div>
                    </td>
                    {PERMISSION_COLUMNS.map((c) => (
                      <td key={c.key} className="px-2 py-2.5 text-center">
                        <Checkbox
                          checked={perms?.[c.key] ?? false}
                          onCheckedChange={() =>
                            toggleAgentPermission(agent.id, c.key)
                          }
                          aria-label={`${agent.name} — ${c.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
