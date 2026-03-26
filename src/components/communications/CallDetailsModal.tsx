"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Download,
  Phone,
  Zap,
  User,
  Clock,
  FileText,
  Play,
} from "lucide-react";
import { type CallLog } from "@/data/communications-hub";

interface CallDetailsModalProps {
  call: CallLog;
  onClose: () => void;
}

export function CallDetailsModal({ call, onClose }: CallDetailsModalProps) {
  const duration = {
    minutes: Math.floor(call.duration / 60),
    seconds: call.duration % 60,
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Call Details</DialogTitle>
        <DialogDescription>
          Call information, recording, and transcription
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Call Info */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Type</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Phone className="size-4" />
                  <Badge
                    variant={call.type === "inbound" ? "default" : "outline"}
                  >
                    {call.type === "inbound" ? "↓ Inbound" : "↑ Outbound"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      call.status === "completed"
                        ? "default"
                        : call.status === "missed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize"
                  >
                    {call.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">From</Label>
                <div className="mt-1 font-medium">{call.from}</div>
                {call.clientName && (
                  <div className="text-muted-foreground text-sm">
                    {call.clientName}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">To</Label>
                <div className="mt-1 font-medium">{call.to}</div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">
                  Duration
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <Clock className="size-4" />
                  <span className="font-medium">
                    {duration.minutes}:
                    {duration.seconds.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">
                  Handled By
                </Label>
                <div className="mt-1">
                  <Badge variant={call.aiHandled ? "default" : "outline"}>
                    {call.aiHandled ? (
                      <>
                        <Zap className="mr-1 inline size-3" />
                        AI Receptionist
                      </>
                    ) : (
                      <>
                        <User className="mr-1 inline size-3" />
                        Staff
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-muted-foreground text-sm">Time</Label>
                <div className="mt-1 font-medium">
                  {new Date(call.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Outcome */}
        {call.outcome && (
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block text-base">AI Outcome</Label>
              <div className="bg-muted flex items-start gap-3 rounded-lg p-3">
                <Zap className="text-primary mt-0.5 size-5" />
                <div>
                  <div className="mb-1 font-medium capitalize">
                    {call.outcome.replace(/_/g, " ")}
                  </div>
                  {call.notes && (
                    <div className="text-muted-foreground text-sm">
                      {call.notes}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recording */}
        {call.recordingUrl && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base">Call Recording</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Play className="mr-2 size-4" />
                    Play
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 size-4" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Audio Player Placeholder */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm">
                    <Play className="size-4" />
                  </Button>
                  <div className="bg-background h-2 flex-1 rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: "30%" }}
                    />
                  </div>
                  <span className="text-muted-foreground text-sm">
                    0:{duration.seconds.toString().padStart(2, "0")} /{" "}
                    {duration.minutes}:
                    {duration.seconds.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcription */}
        {call.transcription && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base">Call Transcription</Label>
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 size-4" />
                  Copy Text
                </Button>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">
                  {call.transcription}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voicemail (if applicable) */}
        {call.status === "voicemail" && !call.transcription && (
          <Card>
            <CardContent className="pt-6">
              <Label className="mb-3 block text-base">Voicemail</Label>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  Caller left a voicemail. Recording available above.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}
