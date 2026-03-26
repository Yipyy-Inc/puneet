"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Video,
  Volume2,
  Maximize2,
  Settings,
  CircleDot,
  Moon,
  Move,
  Eye,
  AlertCircle,
} from "lucide-react";
import { petCams } from "@/data/additional-features";

export function LivePetCamGrid() {
  const [cameras] = useState(petCams);
  const [selectedLocation, setSelectedLocation] = useState("all");

  const filteredCameras =
    selectedLocation === "all"
      ? cameras
      : cameras.filter((cam) => cam.location.includes(selectedLocation));

  const onlineCameras = cameras.filter((cam) => cam.isOnline).length;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Active Cameras
                </p>
                <p className="text-2xl font-bold">
                  {onlineCameras} / {cameras.length}
                </p>
              </div>
              <div className="bg-border h-12 w-px" />
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Filter by Location
                </p>
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="Main Facility">Main Facility</SelectItem>
                    <SelectItem value="Branch">Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Camera className="mr-2 size-4" />
                Add Camera
              </Button>
              <Button variant="outline">
                <Settings className="mr-2 size-4" />
                Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredCameras.map((camera) => (
          <Card key={camera.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {camera.name}
                    {camera.isOnline ? (
                      <CircleDot className="size-4 animate-pulse text-green-500" />
                    ) : (
                      <AlertCircle className="size-4 text-red-500" />
                    )}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {camera.location}
                  </p>
                </div>
                <Badge
                  className={
                    camera.isOnline
                      ? "bg-green-500/10 text-green-700"
                      : "bg-red-500/10 text-red-700"
                  }
                >
                  {camera.isOnline ? "Live" : "Offline"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Video Preview */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
                {camera.isOnline ? (
                  <>
                    {/* Simulated video feed */}
                    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-slate-800 to-slate-900">
                      <Video className="h-16 w-16 text-slate-600" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 rounded-sm bg-red-600 px-2 py-1 text-xs text-white">
                        <CircleDot className="size-2 animate-pulse" />
                        LIVE
                      </div>
                      <div className="absolute top-2 right-2 rounded-sm bg-black/50 px-2 py-1 text-xs text-white">
                        {camera.resolution}
                      </div>
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 text-white hover:bg-white/20"
                          >
                            <Volume2 className="size-4" />
                          </Button>
                          {camera.hasPanTilt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="size-8 p-0 text-white hover:bg-white/20"
                            >
                              <Move className="size-4" />
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0 text-white hover:bg-white/20"
                        >
                          <Maximize2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="size-12 text-red-500" />
                    <p className="text-sm text-white">Camera Offline</p>
                  </div>
                )}
              </div>

              {/* Camera Features */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {camera.hasAudio && (
                    <Badge variant="outline" className="text-xs">
                      <Volume2 className="mr-1 size-3" />
                      Audio
                    </Badge>
                  )}
                  {camera.hasPanTilt && (
                    <Badge variant="outline" className="text-xs">
                      <Move className="mr-1 size-3" />
                      Pan/Tilt
                    </Badge>
                  )}
                  {camera.hasNightVision && (
                    <Badge variant="outline" className="text-xs">
                      <Moon className="mr-1 size-3" />
                      Night Vision
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Eye className="mr-1 size-3" />
                    {camera.accessLevel.replace(/_/g, " ")}
                  </Badge>
                </div>
                <Button size="sm" variant="outline">
                  Configure
                </Button>
              </div>

              {/* Kennel Coverage */}
              {camera.kennelIds.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-muted-foreground mb-2 text-xs font-medium">
                    Kennel Coverage
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {camera.kennelIds.map((kennelId) => (
                      <Badge
                        key={kennelId}
                        variant="secondary"
                        className="text-xs"
                      >
                        {kennelId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
