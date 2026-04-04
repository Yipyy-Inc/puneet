"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Backpack,
  CheckCircle2,
  Plus,
  Camera,
  Upload,
  AlertTriangle,
  PackageCheck,
  Expand,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BelongingEntry } from "@/types/booking";

interface BelongingsSectionProps {
  entries: BelongingEntry[];
  isCompleted?: boolean;
  required?: boolean;
}

function fmtTimestamp(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

let _belId = 300;

export function BelongingsSection({
  entries,
  isCompleted,
  required,
}: BelongingsSectionProps) {
  const [items, setItems] = useState(entries);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    photoUrl: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalItems = items.length;
  const returnedCount = items.filter((i) => i.returned).length;
  const unreturnedCount = totalItems - returnedCount;

  const handleReturn = (id: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              returned: checked,
              returnedAt: checked ? new Date().toISOString() : undefined,
              returnedBy: checked ? "You" : undefined,
            }
          : e,
      ),
    );
    if (checked) toast.success("Item marked as returned");
  };

  const handleReturnAll = () => {
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((e) =>
        e.returned
          ? e
          : { ...e, returned: true, returnedAt: now, returnedBy: "You" },
      ),
    );
    toast.success(`All ${unreturnedCount} items marked as returned`);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewItem((prev) => ({ ...prev, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    if (!newItem.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    _belId += 1;
    setItems((prev) => [
      ...prev,
      {
        id: `bel-new-${_belId}`,
        name: newItem.name,
        description: newItem.description || undefined,
        photoUrl: newItem.photoUrl || undefined,
        condition: "Good",
        checkedInAt: new Date().toISOString(),
        checkedInBy: "You",
        returned: false,
      },
    ]);
    setNewItem({ name: "", description: "", photoUrl: "" });
    setAddOpen(false);
    toast.success("Belonging added");
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <Backpack className="size-3.5" />
              Belongings
              {required && (
                <Badge
                  variant="destructive"
                  className="text-[10px] normal-case"
                >
                  Required
                </Badge>
              )}
              {totalItems > 0 && (
                <span className="text-muted-foreground font-normal normal-case">
                  — {returnedCount} of {totalItems} returned
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreturnedCount > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={handleReturnAll}
                >
                  <PackageCheck className="size-3" />
                  Return All
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setAddOpen(!addOpen)}
              >
                <Plus className="size-3" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Unreturned items alert — on completed bookings */}
          {isCompleted && unreturnedCount > 0 && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {unreturnedCount} item{unreturnedCount !== 1 ? "s" : ""} not
                  returned
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Please verify all belongings have been returned to the client
                  before closing out this booking.
                </p>
              </div>
            </div>
          )}

          {/* Inline add form */}
          <Collapsible open={addOpen} onOpenChange={setAddOpen}>
            <CollapsibleContent>
              <div className="space-y-3 border-b py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Item Name</Label>
                    <Input
                      value={newItem.name}
                      onChange={(e) =>
                        setNewItem((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. Blue fleece blanket"
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Description</Label>
                    <Input
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Color, features..."
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Photo upload */}
                <div>
                  <Label className="text-[11px]">
                    Photo (optional — documents condition at check-in)
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    {newItem.photoUrl ? (
                      <div className="relative">
                        <img
                          src={newItem.photoUrl}
                          alt="Preview"
                          className="ring-border size-16 rounded-lg object-cover ring-1"
                        />
                        <button
                          className="bg-destructive absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full text-[10px] text-white"
                          onClick={() =>
                            setNewItem((p) => ({ ...p, photoUrl: "" }))
                          }
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="size-3.5" />
                          Upload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            // In production: use navigator.mediaDevices.getUserMedia
                            fileInputRef.current?.click();
                          }}
                        >
                          <Camera className="size-3.5" />
                          Camera
                        </Button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => setAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={handleAdd}
                  >
                    Add Item
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Items list */}
          {items.length === 0 ? (
            <div className="py-6 text-center">
              <Backpack className="text-muted-foreground/20 mx-auto size-8" />
              <p className="text-muted-foreground mt-2 text-xs">
                No belongings checked in — click &quot;Add Item&quot; at
                check-in
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 py-4 transition-opacity first:pt-4",
                    item.returned && "opacity-50",
                  )}
                >
                  {/* Photo thumbnail with action menu */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="group relative shrink-0 overflow-hidden rounded-lg">
                        {item.photoUrl ? (
                          <>
                            <img
                              src={item.photoUrl}
                              alt={item.name}
                              className="size-16 object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                              <Camera className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </>
                        ) : (
                          <div className="bg-muted/50 group-hover:bg-muted flex size-16 items-center justify-center transition-colors">
                            <Camera className="text-muted-foreground/30 group-hover:text-muted-foreground/60 size-5 transition-colors" />
                          </div>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-auto p-1.5"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="flex flex-col gap-0.5">
                        {item.photoUrl && (
                          <button
                            className="hover:bg-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors"
                            onClick={() => setLightboxUrl(item.photoUrl!)}
                          >
                            <Expand className="size-3.5" />
                            View Full Photo
                          </button>
                        )}
                        <button
                          className="hover:bg-muted flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.capture = "environment";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setItems((prev) =>
                                  prev.map((b) =>
                                    b.id === item.id
                                      ? {
                                          ...b,
                                          photoUrl: reader.result as string,
                                        }
                                      : b,
                                  ),
                                );
                                toast.success("Photo updated");
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                        >
                          <Upload className="size-3.5" />
                          {item.photoUrl ? "Replace Photo" : "Upload Photo"}
                        </button>
                        {item.photoUrl && (
                          <button
                            className="hover:bg-destructive/10 text-destructive flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors"
                            onClick={() => {
                              setItems((prev) =>
                                prev.map((b) =>
                                  b.id === item.id
                                    ? { ...b, photoUrl: undefined }
                                    : b,
                                ),
                              );
                              toast.success("Photo removed");
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          item.returned && "line-through",
                        )}
                      >
                        {item.name}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {item.description}
                      </p>
                    )}
                    {item.checkedInBy && (
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        Checked in by {item.checkedInBy}
                        {item.checkedInAt &&
                          ` · ${fmtTimestamp(item.checkedInAt)}`}
                      </p>
                    )}
                    {item.returned && item.returnedBy && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
                        <CheckCircle2 className="size-3" />
                        Returned by {item.returnedBy}
                        {item.returnedAt &&
                          ` · ${fmtTimestamp(item.returnedAt)}`}
                      </p>
                    )}
                  </div>

                  {/* Return checkbox */}
                  <div className="flex shrink-0 items-center gap-1.5 pt-1">
                    <Checkbox
                      id={`return-${item.id}`}
                      checked={item.returned}
                      onCheckedChange={(c) => handleReturn(item.id, c === true)}
                    />
                    <label
                      htmlFor={`return-${item.id}`}
                      className="text-muted-foreground cursor-pointer text-[11px]"
                    >
                      Returned
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent
          className="max-w-lg p-2"
          showCloseButton
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Belonging Photo</DialogTitle>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Belonging photo"
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
