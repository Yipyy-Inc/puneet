"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PetPhoto, ReportCard } from "@/data/pet-data";
import type { Booking } from "@/lib/types";

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

export function PhotoAlbums({ photos, bookings, reportCards, formatDate }: PhotoAlbumsProps) {
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

    // Add report card photos
    reportCards.forEach((report) => {
      report.photos.forEach((photoUrl, index) => {
        // Try to find matching booking for this report card
        const matchingBooking = bookings.find((b) => b.id === report.bookingId);
        
        unified.push({
          id: `report-${report.id}-photo-${index}`,
          url: photoUrl,
          thumbnail: photoUrl,
          caption: `${report.serviceType} report card - ${formatDate(report.date)}`,
          uploadedBy: report.createdBy,
          uploadedAt: report.sentAt || report.date,
          source: "report_card",
          bookingId: report.bookingId,
          reportCardId: report.id,
        });
      });
    });

    return unified;
  }, [photos, reportCards, bookings, formatDate]);

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
        return bookingDateKey === dateKey || 
               (booking.endDate && new Date(booking.endDate).toISOString().split("T")[0] === dateKey);
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
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("albums")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View by Date
            </Button>
            <span className="text-sm text-muted-foreground">
              {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allPhotos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square rounded-lg bg-muted overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group relative"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.thumbnail || photo.url}
                alt={photo.caption || "Pet photo"}
                className="w-full h-full object-cover"
              />
              {photo.caption && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                  <p className="text-white text-xs p-2 truncate w-full opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.caption}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Photo Viewer Dialog */}
        {selectedPhoto && (
          <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 z-10 bg-background/80"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {currentPhotoIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80"
                    onClick={handlePreviousPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {currentPhotoIndex < allPhotos.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80"
                    onClick={handleNextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <img
                    src={selectedPhoto.url}
                    alt={selectedPhoto.caption || "Pet photo"}
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                </div>
                <div className="p-4 border-t">
                  {selectedPhoto.caption && (
                    <p className="font-medium mb-1">{selectedPhoto.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatDate(selectedPhoto.uploadedAt)}</span>
                    <span>Photo {currentPhotoIndex + 1} of {allPhotos.length}</span>
                  </div>
                  {selectedPhoto.uploadedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            View All
          </Button>
          <span className="text-sm text-muted-foreground">
            {albums.length} album{albums.length !== 1 ? "s" : ""} • {allUnifiedPhotos.length} photo{allUnifiedPhotos.length !== 1 ? "s" : ""}
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
                    {formatDate(album.date)} • {album.photos.length} photo{album.photos.length !== 1 ? "s" : ""}
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {album.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg bg-muted overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group relative"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.thumbnail || photo.url}
                      alt={photo.caption || "Pet photo"}
                      className="w-full h-full object-cover"
                    />
                    {photo.caption && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                        <p className="text-white text-xs p-2 truncate w-full opacity-0 group-hover:opacity-100 transition-opacity">
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
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-background/80"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              {currentPhotoIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80"
                  onClick={handlePreviousPhoto}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {currentPhotoIndex < allPhotos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80"
                  onClick={handleNextPhoto}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              <div className="aspect-video bg-muted flex items-center justify-center">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Pet photo"}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
              <div className="p-4 border-t">
                {selectedPhoto.caption && (
                  <p className="font-medium mb-1">{selectedPhoto.caption}</p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatDate(selectedPhoto.uploadedAt)}</span>
                  <span>Photo {currentPhotoIndex + 1} of {allPhotos.length}</span>
                </div>
                {selectedPhoto.uploadedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
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
