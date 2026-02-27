"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, X, FileText, Image as ImageIcon, FileCheck, Upload } from "lucide-react";
import { toast } from "sonner";

export interface Attachment {
  id: string;
  file: File;
  type: "vaccine_record" | "document" | "photo" | "signed_form";
  name: string;
  size: number;
}

interface MessageAttachmentUploadProps {
  onAttachmentsChange: (attachments: Attachment[]) => void;
  attachments: Attachment[];
}

export function MessageAttachmentUpload({
  onAttachmentsChange,
  attachments,
}: MessageAttachmentUploadProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<Attachment["type"] | "">("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setIsUploadDialogOpen(true);
    }
  };

  const handleAddAttachment = () => {
    if (!selectedFile || !attachmentType) {
      toast.error("Please select a file and attachment type");
      return;
    }

    const newAttachment: Attachment = {
      id: `att-${Date.now()}`,
      file: selectedFile,
      type: attachmentType as Attachment["type"],
      name: selectedFile.name,
      size: selectedFile.size,
    };

    onAttachmentsChange([...attachments, newAttachment]);
    setSelectedFile(null);
    setAttachmentType("");
    setIsUploadDialogOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Attachment added");
  };

  const handleRemoveAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((att) => att.id !== id));
  };

  const getAttachmentTypeIcon = (type: Attachment["type"]) => {
    switch (type) {
      case "vaccine_record":
        return <FileCheck className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "photo":
        return <ImageIcon className="h-4 w-4" />;
      case "signed_form":
        return <FileCheck className="h-4 w-4" />;
    }
  };

  const getAttachmentTypeLabel = (type: Attachment["type"]) => {
    switch (type) {
      case "vaccine_record":
        return "Vaccine Record";
      case "document":
        return "Document";
      case "photo":
        return "Photo";
      case "signed_form":
        return "Signed Form";
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
        />
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs"
              >
                {getAttachmentTypeIcon(att.type)}
                <span className="max-w-[100px] truncate">{att.name}</span>
                <span className="text-muted-foreground">
                  ({(att.size / 1024).toFixed(1)} KB)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => handleRemoveAttachment(att.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attachment</DialogTitle>
            <DialogDescription>
              Select the type of attachment you're uploading
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="attachment-type">Attachment Type</Label>
              <Select value={attachmentType} onValueChange={(value) => setAttachmentType(value as Attachment["type"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select attachment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vaccine_record">Vaccine Record</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="photo">Photo of Pet</SelectItem>
                  <SelectItem value="signed_form">Signed Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAttachment} disabled={!selectedFile || !attachmentType}>
              Add Attachment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
