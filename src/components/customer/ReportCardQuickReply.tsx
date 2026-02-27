"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReportCardQuickReplyProps {
  reportCardId: string;
  petName: string;
  serviceType: string;
  onReplySent?: (message: string) => void;
}

const QUICK_REPLIES = [
  {
    id: "thank-you",
    label: "Awww thank you!",
    icon: Heart,
    message: "Awww thank you so much! We're so happy to see {petName} had a great time! ❤️",
  },
  {
    id: "concerns",
    label: "Any concerns?",
    icon: MessageCircle,
    message: "Thank you for the update! Is there anything we should be aware of or any concerns?",
  },
  {
    id: "book-again",
    label: "Can we book again?",
    icon: Calendar,
    message: "Thank you! We'd love to book {petName} again. When would be a good time?",
  },
];

export function ReportCardQuickReply({
  reportCardId,
  petName,
  serviceType,
  onReplySent,
}: ReportCardQuickReplyProps) {
  const [isCustomReplyOpen, setIsCustomReplyOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedQuickReply, setSelectedQuickReply] = useState<string | null>(null);

  const handleQuickReply = async (replyId: string) => {
    const reply = QUICK_REPLIES.find((r) => r.id === replyId);
    if (!reply) return;

    const message = reply.message.replace(/{petName}/g, petName);
    setSelectedQuickReply(replyId);
    
    try {
      // TODO: API call to send reply
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      toast.success("Reply sent!");
      onReplySent?.(message);
      setSelectedQuickReply(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reply");
      setSelectedQuickReply(null);
    }
  };

  const handleCustomReply = async () => {
    if (!customMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      // TODO: API call to send custom reply
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      toast.success("Reply sent!");
      onReplySent?.(customMessage);
      setIsCustomReplyOpen(false);
      setCustomMessage("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reply");
    }
  };

  return (
    <div className="space-y-2 pt-4 border-t">
      <p className="text-sm font-medium">Quick Reply</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_REPLIES.map((reply) => {
          const Icon = reply.icon;
          return (
            <Button
              key={reply.id}
              variant="outline"
              size="sm"
              onClick={() => handleQuickReply(reply.id)}
              disabled={selectedQuickReply === reply.id}
              className="text-xs"
            >
              <Icon className="h-3 w-3 mr-1" />
              {reply.label}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCustomReplyOpen(true)}
          className="text-xs"
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          Custom message
        </Button>
      </div>

      {/* Custom Reply Dialog */}
      <Dialog open={isCustomReplyOpen} onOpenChange={setIsCustomReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a Custom Reply</DialogTitle>
            <DialogDescription>
              Send a personalized message about {petName}'s {serviceType} visit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomReplyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomReply}>Send Reply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
