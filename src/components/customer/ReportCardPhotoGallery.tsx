"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, X, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";

interface ReportCardPhotoGalleryProps {
  photos: string[];
  petName: string;
  reportCardId: string;
  serviceType: string;
  date: string;
}

export function ReportCardPhotoGallery({
  photos,
  petName,
  reportCardId,
  serviceType,
  date,
}: ReportCardPhotoGalleryProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Check if photo download/share is enabled (facility-controlled)
  const photoSharingEnabled = facilityConfig.reports?.photoSharing?.enabled ?? true;
  const photoDownloadEnabled = facilityConfig.reports?.photoSharing?.allowDownload ?? true;

  const handleDownloadPhoto = (photoUrl: string, index: number) => {
    if (!photoDownloadEnabled) {
      toast.error("Photo downloads are not available");
      return;
    }

    // Create a temporary link to download the photo
    const link = document.createElement("a");
    link.href = photoUrl;
    link.download = `${petName}-${serviceType}-${date}-photo-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Photo downloaded");
  };

  const handleSharePhoto = async (photoUrl: string) => {
    if (!photoSharingEnabled) {
      toast.error("Photo sharing is not available");
      return;
    }

    try {
      if (navigator.share) {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const file = new File([blob], `${petName}-photo.jpg`, { type: blob.type });

        await navigator.share({
          title: `${petName}'s ${serviceType} photos`,
          text: `Check out ${petName}'s photos from ${date}!`,
          files: [file],
        });
        toast.success("Photo shared");
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(photoUrl);
        toast.success("Photo link copied to clipboard");
      }
    } catch (error) {
      console.error("Error sharing photo:", error);
      toast.error("Failed to share photo");
    }
  };

  if (photos.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Photos from this stay
          </p>
          {photos.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGalleryOpen(true)}
              className="text-xs"
            >
              View all {photos.length} photos
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.slice(0, 4).map((photo, idx) => (
            <div
              key={`${reportCardId}-photo-${idx}`}
              className="aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                setSelectedPhotoIndex(idx);
                setIsGalleryOpen(true);
              }}
            >
              <img
                src={photo}
                alt={`${petName} at the facility`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gallery Modal */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <span>
                {petName}'s {serviceType} photos - {date}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGalleryOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden">
            {/* Main Photo */}
            <div className="relative aspect-video bg-muted">
              <img
                src={photos[selectedPhotoIndex]}
                alt={`${petName} photo ${selectedPhotoIndex + 1}`}
                className="h-full w-full object-contain"
              />
            </div>

            {/* Photo Actions */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              {photoDownloadEnabled && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownloadPhoto(photos[selectedPhotoIndex], selectedPhotoIndex)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {photoSharingEnabled && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSharePhoto(photos[selectedPhotoIndex])}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              )}
            </div>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={() =>
                    setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={() =>
                    setSelectedPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {photos.length > 1 && (
            <div className="px-6 pb-6 pt-4 border-t">
              <div className="flex gap-2 overflow-x-auto">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedPhotoIndex === idx
                        ? "border-primary"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
