"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share2,
  X,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { facilityConfig } from "@/data/facility-config";

interface ReportCardPhotoGalleryProps {
  photos: string[];
  petName: string;
  reportCardId: string;
  serviceType: string;
  date: string;
}

/** next/image with a pulsing skeleton until it loads. Requires a positioned parent. */
function GalleryImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          className="bg-muted absolute inset-0 animate-pulse"
          aria-hidden="true"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={cn(
          "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
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
  const touchStartX = useRef<number | null>(null);

  // Check if photo download/share is enabled (facility-controlled)
  const photoSharingEnabled =
    facilityConfig.reports?.photoSharing?.enabled ?? true;
  const photoDownloadEnabled =
    facilityConfig.reports?.photoSharing?.allowDownload ?? true;

  const goNext = useCallback(
    () =>
      setSelectedPhotoIndex((prev) =>
        prev < photos.length - 1 ? prev + 1 : 0,
      ),
    [photos.length],
  );
  const goPrev = useCallback(
    () =>
      setSelectedPhotoIndex((prev) =>
        prev > 0 ? prev - 1 : photos.length - 1,
      ),
    [photos.length],
  );

  // Keyboard arrow navigation while the lightbox is open.
  useEffect(() => {
    if (!isGalleryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isGalleryOpen, goNext, goPrev]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40 && photos.length > 1) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

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
        const file = new File([blob], `${petName}-photo.jpg`, {
          type: blob.type,
        });
        // Prefer sharing the image file; fall back to a text/title share.
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `${petName}'s ${serviceType} photos`,
            text: `Check out ${petName}'s photos from ${date}!`,
            files: [file],
          });
        } else {
          await navigator.share({
            title: `${petName}'s ${serviceType} photos`,
            text: `Check out ${petName}'s photos from ${date}!`,
            url: photoUrl,
          });
        }
        toast.success("Photo shared");
      } else {
        // Desktop fallback: copy link to clipboard
        await navigator.clipboard.writeText(photoUrl);
        toast.success("Photo link copied to clipboard");
      }
    } catch (error) {
      // AbortError = user dismissed the share sheet; don't surface an error.
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Error sharing photo:", error);
      toast.error("Failed to share photo");
    }
  };

  if (photos.length === 0) return null;

  const openAt = (idx: number) => {
    setSelectedPhotoIndex(idx);
    setIsGalleryOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="size-4" /> Photos from this stay
          </p>
          {photos.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openAt(0)}
              className="text-xs"
            >
              View all {photos.length} photos
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {photos.slice(0, 4).map((photo, idx) => (
            <button
              type="button"
              key={`${reportCardId}-photo-${idx}`}
              className="bg-muted relative aspect-4/3 cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-90"
              onClick={() => openAt(idx)}
              aria-label={`Open photo ${idx + 1} of ${petName}`}
            >
              <GalleryImage
                src={photo}
                alt={`${petName} at the facility`}
                sizes="(max-width: 768px) 50vw, 200px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Full-screen lightbox */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="flex h-[95vh] w-[96vw] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center justify-between gap-4">
              <span className="truncate">
                {petName}&apos;s {serviceType} photos — {date}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGalleryOpen(false)}
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden">
            {/* Main Photo */}
            <div
              className="relative size-full bg-black"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <GalleryImage
                key={selectedPhotoIndex}
                src={photos[selectedPhotoIndex]}
                alt={`${petName} photo ${selectedPhotoIndex + 1}`}
                sizes="96vw"
                priority
                className="object-contain"
              />
            </div>

            {/* Photo Actions */}
            <div className="absolute right-4 bottom-4 flex gap-2">
              {photoDownloadEnabled && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    handleDownloadPhoto(
                      photos[selectedPhotoIndex],
                      selectedPhotoIndex,
                    )
                  }
                >
                  <Download className="mr-2 size-4" />
                  Download
                </Button>
              )}
              {photoSharingEnabled && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSharePhoto(photos[selectedPhotoIndex])}
                >
                  <Share2 className="mr-2 size-4" />
                  Share
                </Button>
              )}
            </div>

            {/* Navigation */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full opacity-90"
                  onClick={goPrev}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full opacity-90"
                  onClick={goNext}
                  aria-label="Next photo"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {selectedPhotoIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {photos.length > 1 && (
            <div className="border-t px-6 pt-4 pb-6">
              <div className="flex gap-2 overflow-x-auto">
                {photos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={cn(
                      "relative size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                      selectedPhotoIndex === idx
                        ? "border-primary"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                    aria-label={`View photo ${idx + 1}`}
                  >
                    <GalleryImage
                      src={photo}
                      alt={`Thumbnail ${idx + 1}`}
                      sizes="80px"
                      className="object-cover"
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
