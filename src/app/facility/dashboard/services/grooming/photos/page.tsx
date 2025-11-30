"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Camera,
  Share2,
  Image as ImageIcon,
  ArrowLeftRight,
  Check,
  Clock,
  Search,
} from "lucide-react";
import {
  photoAlbums,
  getRecentPhotoAlbums,
  type PhotoAlbum,
} from "@/data/grooming";

export default function PhotoAlbumsPage() {
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const recentAlbums = getRecentPhotoAlbums(20);

  // Filter albums by search term
  const filteredAlbums = recentAlbums.filter(
    (album) =>
      album.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      album.stylistName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Stats
  const totalAlbums = photoAlbums.length;
  const sharedAlbums = photoAlbums.filter((a) => a.sharedWithOwner).length;
  const totalPhotos = photoAlbums.reduce(
    (sum, a) => sum + a.beforePhotos.length + a.afterPhotos.length,
    0,
  );

  const handleViewAlbum = (album: PhotoAlbum) => {
    setSelectedAlbum(album);
    setIsDetailModalOpen(true);
  };

  const handleShareWithOwner = () => {
    // In a real app, this would trigger sharing
    setIsDetailModalOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Albums</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlbums}</div>
            <p className="text-xs text-muted-foreground">
              Before/after collections
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPhotos}</div>
            <p className="text-xs text-muted-foreground">Across all albums</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Shared with Owners
            </CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sharedAlbums}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((sharedAlbums / totalAlbums) * 100)}% share rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Photos/Album
            </CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalPhotos / totalAlbums).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Before + After</p>
          </CardContent>
        </Card>
      </div>

      {/* Albums Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Photo Albums</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Before and after photos from grooming sessions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by pet or stylist..."
                className="pl-8 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Album
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAlbums.map((album) => (
              <Card
                key={album.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleViewAlbum(album)}
              >
                <div className="relative">
                  {/* Photo Preview Grid */}
                  <div className="grid grid-cols-2 h-48">
                    <div className="bg-muted flex items-center justify-center border-r border-b relative">
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="secondary"
                          className="text-xs bg-white/90"
                        >
                          Before
                        </Badge>
                      </div>
                      {album.beforePhotos[0] ? (
                        <div className="w-full h-full bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="bg-muted flex items-center justify-center border-b relative">
                      <div className="absolute top-2 right-2">
                        <Badge className="text-xs bg-green-500 text-white">
                          After
                        </Badge>
                      </div>
                      {album.afterPhotos[0] ? (
                        <div className="w-full h-full bg-linear-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-pink-400" />
                        </div>
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {album.sharedWithOwner && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2">
                      <Badge
                        variant="outline"
                        className="bg-white/90 text-green-600 border-green-600"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Shared
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-pink-100 text-pink-700">
                          {album.petName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{album.petName}</p>
                        <p className="text-xs text-muted-foreground">
                          {album.stylistName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatDate(album.date)}</p>
                      <p>
                        {album.beforePhotos.length + album.afterPhotos.length}{" "}
                        photos
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAlbums.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No photo albums found</p>
              <p className="text-sm">
                Try adjusting your search or create a new album
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Album Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo Album - {selectedAlbum?.petName}
            </DialogTitle>
            <DialogDescription>
              Grooming session on{" "}
              {selectedAlbum && formatDate(selectedAlbum.date)} by{" "}
              {selectedAlbum?.stylistName}
            </DialogDescription>
          </DialogHeader>

          {selectedAlbum && (
            <div className="space-y-6">
              {/* Pet & Session Info */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-pink-100 text-pink-700 text-lg">
                      {selectedAlbum.petName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedAlbum.petName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Groomed by {selectedAlbum.stylistName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAlbum.sharedWithOwner ? (
                    <Badge className="bg-green-100 text-green-700">
                      <Check className="h-3 w-3 mr-1" />
                      Shared with Owner
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={handleShareWithOwner}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share with Owner
                    </Button>
                  )}
                </div>
              </div>

              {/* Before/After Comparison */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Before Photos */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge variant="secondary">Before</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({selectedAlbum.beforePhotos.length} photos)
                    </span>
                  </h4>
                  <div className="space-y-3">
                    {selectedAlbum.beforePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="rounded-lg overflow-hidden border"
                      >
                        <div className="aspect-video bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-400" />
                        </div>
                        <div className="p-3 bg-muted/50">
                          {photo.caption && (
                            <p className="text-sm">{photo.caption}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(photo.takenAt)}</span>
                            <span>•</span>
                            <span>{photo.takenBy}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedAlbum.beforePhotos.length === 0 && (
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">
                          No before photos
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* After Photos */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge className="bg-green-500">After</Badge>
                    <span className="text-sm text-muted-foreground">
                      ({selectedAlbum.afterPhotos.length} photos)
                    </span>
                  </h4>
                  <div className="space-y-3">
                    {selectedAlbum.afterPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="rounded-lg overflow-hidden border"
                      >
                        <div className="aspect-video bg-linear-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                          <Camera className="h-12 w-12 text-pink-400" />
                        </div>
                        <div className="p-3 bg-muted/50">
                          {photo.caption && (
                            <p className="text-sm">{photo.caption}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(photo.takenAt)}</span>
                            <span>•</span>
                            <span>{photo.takenBy}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedAlbum.afterPhotos.length === 0 && (
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No after photos</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedAlbum.notes && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Stylist Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAlbum.notes}
                  </p>
                </div>
              )}

              {/* Share Info */}
              {selectedAlbum.sharedWithOwner && selectedAlbum.sharedAt && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Shared with owner on{" "}
                  {new Date(selectedAlbum.sharedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Close
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Album Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Photo Album</DialogTitle>
            <DialogDescription>
              Start a new before/after photo collection for a grooming session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="appointmentId">Grooming Appointment</Label>
              <Input
                id="appointmentId"
                placeholder="Search for an appointment..."
              />
              <p className="text-xs text-muted-foreground">
                Link this album to a grooming appointment
              </p>
            </div>
            <div className="space-y-2">
              <Label>Before Photos</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop photos here or click to upload
                </p>
                <Button variant="outline" className="mt-2" size="sm">
                  Upload Photos
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>After Photos</Label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop photos here or click to upload
                </p>
                <Button variant="outline" className="mt-2" size="sm">
                  Upload Photos
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about the grooming session..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsAddModalOpen(false)}>
              Create Album
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
