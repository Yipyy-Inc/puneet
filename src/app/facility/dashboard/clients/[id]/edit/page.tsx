"use client";

import { use, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientRecord } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

export default function ClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // The client, from Postgres. This was `clients.find(...)` over
  // `src/data/clients.ts`, so every client created since the migration was
  // told they did not exist on their own file.
  const { client } = useClientRecord(id);

  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [street, setStreet] = useState(client?.address?.street ?? "");
  const [city, setCity] = useState(client?.address?.city ?? "");
  const [state, setState] = useState(client?.address?.state ?? "");
  const [zip, setZip] = useState(client?.address?.zip ?? "");

  if (!client) return null;

  return (
    <div className="space-y-6 p-4 pt-5 md:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Pencil className="size-5" />
        Edit Client
      </h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Phone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label className="text-xs">Street</Label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Province / State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Postal Code</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => toast.success("Client profile updated")}
        className="gap-1.5"
      >
        Save Changes
      </Button>
    </div>
  );
}
