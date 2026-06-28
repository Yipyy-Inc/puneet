"use client";

import { useState } from "react";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateIntegrationCredentials } from "@/lib/integrations-store";

export function UpdateCredentialsDialog({
  open,
  integrationId,
  authenticationType,
  onOpenChange,
}: {
  open: boolean;
  integrationId: string;
  authenticationType: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);

  const label =
    authenticationType === "OAuth"
      ? "OAuth token"
      : authenticationType === "Token"
        ? "Auth token"
        : authenticationType === "Basic Auth"
          ? "Password"
          : "API key";

  const save = () => {
    if (!secret.trim()) {
      toast.error(`Enter a new ${label.toLowerCase()}`);
      return;
    }
    updateIntegrationCredentials(integrationId);
    toast.success("Credentials updated");
    setSecret("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Update Credentials
          </DialogTitle>
          <DialogDescription>
            Rotate the {label.toLowerCase()} for this integration. The new value
            is stored encrypted.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="new-secret">New {label}</Label>
          <div className="relative">
            <Input
              id="new-secret"
              type={show ? "text" : "password"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={`Paste the new ${label.toLowerCase()}…`}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label={show ? "Hide" : "Reveal"}
            >
              {show ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!secret.trim()}
            onClick={save}
          >
            Save Credentials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
