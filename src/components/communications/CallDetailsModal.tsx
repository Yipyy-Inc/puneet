"use client";

import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Play, Download, Phone, Zap, User, Clock, FileText } from "lucide-react";

interface CallDetailsModalProps {
  call: any;
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
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Type</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4" />
                  <Badge variant={call.type === "inbound" ? "default" : "outline"}>
                    {call.type === "inbound" ? "↓ Inbound" : "↑ Outbound"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      call.status === "completed" ? "default" :
                      call.status === "missed" ? "destructive" :
                      "secondary"
                    }
                    className="capitalize"
                  >
                    {call.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">From</Label>
                <div className="font-medium mt-1">{call.from}</div>
                {call.clientName && (
                  <div className="text-sm text-muted-foreground">{call.clientName}</div>
                )}
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">To</Label>
                <div className="font-medium mt-1">{call.to}</div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Duration</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {duration.minutes}:{duration.seconds.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Handled By</Label>
                <div className="mt-1">
                  <Badge variant={call.aiHandled ? "default" : "outline"}>
                    {call.aiHandled ? (
                      <>
                        <Zap className="h-3 w-3 mr-1 inline" />
                        AI Receptionist
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3 mr-1 inline" />
                        Staff
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-sm text-muted-foreground">Time</Label>
                <div className="font-medium mt-1">
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
              <Label className="text-base mb-3 block">AI Outcome</Label>
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Zap className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium capitalize mb-1">
                    {call.outcome.replace(/_/g, " ")}
                  </div>
                  {call.notes && (
                    <div className="text-sm text-muted-foreground">{call.notes}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recording */}
        {call.recordingUrl && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Call Recording</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Audio Player Placeholder */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm">
                    <Play className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 h-2 bg-background rounded-full">
                    <div className="h-2 bg-primary rounded-full" style={{ width: "30%" }} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    0:{duration.seconds.toString().padStart(2, "0")} /{" "}
                    {duration.minutes}:{duration.seconds.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcription */}
        {call.transcription && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Call Transcription</Label>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{call.transcription}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voicemail (if applicable) */}
        {call.status === "voicemail" && !call.transcription && (
          <Card>
            <CardContent className="pt-6">
              <Label className="text-base mb-3 block">Voicemail</Label>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
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

