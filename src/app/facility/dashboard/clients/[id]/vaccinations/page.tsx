"use client";

import { use, useState } from "react";
import { clients } from "@/data/clients";
import { vaccinationRecords } from "@/data/pet-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function ClientVaccinationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const client = clients.find((c) => c.id === parseInt(id, 10));
  const [now] = useState(() => Date.now());
  if (!client) return null;
  const petIds = client.pets.map((p) => p.id);
  const records = vaccinationRecords.filter((v) => petIds.includes(v.petId));
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Vaccinations</h2>

      {records.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No vaccination records
        </p>
      ) : (
        client.pets
          .filter((pet) => records.some((r) => r.petId === pet.id))
          .map((pet) => {
            const petRecords = records.filter((r) => r.petId === pet.id);
            return (
              <Card key={pet.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    {pet.name} — {pet.breed}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {petRecords.map((v) => {
                    const expired = new Date(v.expiryDate).getTime() < now;
                    const expiringSoon =
                      !expired &&
                      new Date(v.expiryDate).getTime() - now <
                        30 * 24 * 60 * 60 * 1000;
                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          {expired ? (
                            <XCircle className="size-4 text-red-500" />
                          ) : expiringSoon ? (
                            <AlertTriangle className="size-4 text-amber-500" />
                          ) : (
                            <CheckCircle className="size-4 text-emerald-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {v.vaccineName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Given: {formatDate(v.administeredDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              expired
                                ? "destructive"
                                : expiringSoon
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px]"
                          >
                            {expired
                              ? "Expired"
                              : expiringSoon
                                ? "Expiring Soon"
                                : "Current"}
                          </Badge>
                          <p className="text-muted-foreground mt-0.5 text-[11px]">
                            Expires: {formatDate(v.expiryDate)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })
      )}
    </div>
  );
}
