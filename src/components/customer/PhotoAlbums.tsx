"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Calendar,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { PetPhoto } from "@/data/pet-data";
import type { ReportCard } from "@/types/report-card";
import type { Booking } from "@/types/booking";

interface UnifiedPhoto {
  id: string;
  url: string;
  thumbnail?: string;
  caption?: string;
  uploadedBy?: string;
  uploadedAt: string;
  source: "upload" | "report_card";
  bookingId?: number;
  reportCardId?: string;
}

interface PhotoAlbumsProps {
  photos: PetPhoto[];
  bookings: Booking[];
  reportCards: ReportCard[];
  formatDate: (dateString: string) => string;
}

interface PhotoAlbum {
  id: string;
  date: string;
  bookingId?: number;
  service?: string;
  photos: UnifiedPhoto[];
  title: string;
}

export function PhotoAlbums({
  photos,
  bookings,
  reportCards,
  formatDate,
}: PhotoAlbumsProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<UnifiedPhoto | null>(null);
  const [viewMode, setViewMode] = useState<"albums" | "grid">("albums");

  // Combine all photos (direct uploads + report card photos)
  const allUnifiedPhotos = useMemo(() => {
    const unified: UnifiedPhoto[] = [];

    // Add direct photo uploads
    photos.forEach((photo) => {
      unified.push({
        id: photo.id,
        url: photo.url,
        thumbnail: photo.thumbnail,
        caption: photo.caption,
        uploadedBy: photo.uploadedBy,
        uploadedAt: photo.uploadedAt,
        source: "upload",
      });
    });

    // Add report card photos.
    //
    // `photos` is now a list of records in a PRIVATE bucket, not a list of URL
    // strings, so a photo that failed to sign is skipped rather than pushed as
    // a broken image.
    reportCards.forEach((report) => {
      report.photos.forEach((photo) => {
        if (!photo.url) return;
        unified.push({
          id: `report-${report.id}-photo-${photo.id}`,
          url: photo.url,
          thumbnail: photo.url,
          caption:
            photo.caption ??
            `${report.serviceType} report card - ${formatDate(report.visitDate)}`,
          // Deliberately absent. `created_by` is the staff member's profile id,
          // and this renders as "Uploaded by {x}" — an owner should not be
          // shown a uuid, and the card does not join the name.
          uploadedBy: undefined,
          uploadedAt: report.sentAt ?? report.visitDate,
          source: "report_card",
          // Also deliberately absent: a card's booking is a uuid and these
          // bookings are keyed by number, so the comparison below can only
          // ever be false — and a false match OVERWRITES the album's
          // date-matched booking with nothing. Date matching is the path that
          // works, and it is the one direct uploads already take.
          bookingId: undefined,
          reportCardId: report.id,
        });
      });
    });

    return unified;
  }, [photos, reportCards, formatDate]);

  // Organize photos by date/stay
  const albums = useMemo(() => {
    const albumsMap = new Map<string, PhotoAlbum>();

    allUnifiedPhotos.forEach((photo) => {
      const photoDate = new Date(photo.uploadedAt);
      const dateKey = photoDate.toISOString().split("T")[0]; // YYYY-MM-DD

      // Try to find a matching booking for this date
      let matchingBooking = bookings.find((booking) => {
        if (photo.bookingId && booking.id === photo.bookingId) {
          return true;
        }
        const bookingDate = new Date(booking.startDate);
        const bookingDateKey = bookingDate.toISOString().split("T")[0];
        return (
          bookingDateKey === dateKey ||
          (booking.endDate &&
            new Date(booking.endDate).toISOString().split("T")[0] === dateKey)
        );
      });

      // If photo has bookingId, use that booking
      if (photo.bookingId) {
        matchingBooking = bookings.find((b) => b.id === photo.bookingId);
      }

      if (!albumsMap.has(dateKey)) {
        albumsMap.set(dateKey, {
          id: dateKey,
          date: dateKey,
          bookingId: matchingBooking?.id,
          service: matchingBooking?.service,
          photos: [],
          title: matchingBooking
            ? `${matchingBooking.service} - ${formatDate(photoDate.toISOString())}`
            : formatDate(photoDate.toISOString()),
        });
      }

      albumsMap.get(dateKey)!.photos.push(photo);
    });

    // Sort albums by date (newest first)
    return Array.from(albumsMap.values()).sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [allUnifiedPhotos, bookings, formatDate]);

  // All photos for grid view (sorted by date)
  const allPhotos = useMemo(() => {
    return [...allUnifiedPhotos].sort((a, b) => {
      return (
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    });
  }, [allUnifiedPhotos]);

  const currentPhotoIndex = selectedPhoto
    ? allPhotos.findIndex((p) => p.id === selectedPhoto.id)
    : -1;

  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setSelectedPhoto(allPhotos[currentPhotoIndex - 1]);
    }
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < allPhotos.length - 1) {
      setSelectedPhoto(allPhotos[currentPhotoIndex + 1]);
    }
  };

  if (viewMode === "grid") {
    return (
      <>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("albums")}
            >
              <Calendar className="mr-2 size-4" />
              View by Date
            </Button>
            <span className="text-muted-foreground text-sm">
              {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {allPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group bg-muted relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-80"
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- may be a signed private-bucket URL, which next/image is configured to refuse */}
              <img
                src={photo.thumbnail || photo.url}
                alt={photo.caption || "Pet photo"}
                className="absolute inset-0 size-full object-cover"
              />
              {photo.caption && (
                <div className="absolute inset-0 flex items-end bg-black/0 transition-colors group-hover:bg-black/40">
                  <p className="w-full truncate p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {photo.caption}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Photo Viewer Dialog */}
        {selectedPhoto && (
          <Dialog
            open={!!selectedPhoto}
            onOpenChange={() => setSelectedPhoto(null)}
          >
            <DialogContent className="max-h-[90vh] max-w-4xl p-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 absolute top-4 right-4 z-10"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="size-4" />
                </Button>
                {currentPhotoIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 absolute top-1/2 left-4 z-10 -translate-y-1/2"
                    onClick={handlePreviousPhoto}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                )}
                {currentPhotoIndex < allPhotos.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 absolute top-1/2 right-4 z-10 -translate-y-1/2"
                    onClick={handleNextPhoto}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                )}
                <div className="bg-muted relative flex aspect-video items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- may be a signed private-bucket URL */}
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.caption || "Pet photo"}
                    className="absolute inset-0 size-full object-contain"
                  />
                </div>
                <div className="border-t p-4">
                  {selectedPhoto.caption && (
                    <p className="mb-1 font-medium">{selectedPhoto.caption}</p>
                  )}
                  <div className="text-muted-foreground flex items-center justify-between text-sm">
                    <span>{formatDate(selectedPhoto.uploadedAt)}</span>
                    <span>
                      Photo {currentPhotoIndex + 1} of {allPhotos.length}
                    </span>
                  </div>
                  {selectedPhoto.uploadedBy && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Uploaded by {selectedPhoto.uploadedBy}
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <ImageIcon className="mr-2 size-4" />
            View All
          </Button>
          <span className="text-muted-foreground text-sm">
            {albums.length} album{albums.length !== 1 ? "s" : ""} •{" "}
            {allUnifiedPhotos.length} photo
            {allUnifiedPhotos.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {albums.map((album) => (
          <Card key={album.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{album.title}</CardTitle>
                  <CardDescription>
                    {formatDate(album.date)} • {album.photos.length} photo
                    {album.photos.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                {album.service && (
                  <Badge variant="outline" className="capitalize">
                    {album.service}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {album.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group bg-muted relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-80"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- may be a signed private-bucket URL */}
                    <img
                      src={photo.thumbnail || photo.url}
                      alt={photo.caption || "Pet photo"}
                      className="absolute inset-0 size-full object-cover"
                    />
                    {photo.caption && (
                      <div className="absolute inset-0 flex items-end bg-black/0 transition-colors group-hover:bg-black/40">
                        <p className="w-full truncate p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {photo.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo Viewer Dialog */}
      {selectedPhoto && (
        <Dialog
          open={!!selectedPhoto}
          onOpenChange={() => setSelectedPhoto(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/80 absolute top-4 right-4 z-10"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="size-4" />
              </Button>
              {currentPhotoIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 absolute top-1/2 left-4 z-10 -translate-y-1/2"
                  onClick={handlePreviousPhoto}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              )}
              {currentPhotoIndex < allPhotos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 absolute top-1/2 right-4 z-10 -translate-y-1/2"
                  onClick={handleNextPhoto}
                >
                  <ChevronRight className="size-4" />
                </Button>
              )}
              <div className="bg-muted relative flex aspect-video items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- may be a signed private-bucket URL */}
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Pet photo"}
                  className="absolute inset-0 size-full object-contain"
                />
              </div>
              <div className="border-t p-4">
                {selectedPhoto.caption && (
                  <p className="mb-1 font-medium">{selectedPhoto.caption}</p>
                )}
                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>{formatDate(selectedPhoto.uploadedAt)}</span>
                  <span>
                    Photo {currentPhotoIndex + 1} of {allPhotos.length}
                  </span>
                </div>
                {selectedPhoto.uploadedBy && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Uploaded by {selectedPhoto.uploadedBy}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
