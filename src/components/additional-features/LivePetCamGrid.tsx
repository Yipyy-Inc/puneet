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
  VolumeX,
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
                <p className="text-sm font-medium text-muted-foreground">
                  Active Cameras
                </p>
                <p className="text-2xl font-bold">
                  {onlineCameras} / {cameras.length}
                </p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
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
                <Camera className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
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
                  <CardTitle className="text-base flex items-center gap-2">
                    {camera.name}
                    {camera.isOnline ? (
                      <CircleDot className="h-4 w-4 text-green-500 animate-pulse" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
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
              <div className="relative bg-slate-900 rounded-lg aspect-video overflow-hidden">
                {camera.isOnline ? (
                  <>
                    {/* Simulated video feed */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <Video className="h-16 w-16 text-slate-600" />
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <CircleDot className="h-2 w-2 animate-pulse" />
                        LIVE
                      </div>
                      <div className="absolute top-2 right-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                        {camera.resolution}
                      </div>
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-white hover:bg-white/20"
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                          {camera.hasPanTilt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white hover:bg-white/20"
                            >
                              <Move className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-white hover:bg-white/20"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                    <p className="text-sm text-white">Camera Offline</p>
                  </div>
                )}
              </div>

              {/* Camera Features */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {camera.hasAudio && (
                    <Badge variant="outline" className="text-xs">
                      <Volume2 className="h-3 w-3 mr-1" />
                      Audio
                    </Badge>
                  )}
                  {camera.hasPanTilt && (
                    <Badge variant="outline" className="text-xs">
                      <Move className="h-3 w-3 mr-1" />
                      Pan/Tilt
                    </Badge>
                  )}
                  {camera.hasNightVision && (
                    <Badge variant="outline" className="text-xs">
                      <Moon className="h-3 w-3 mr-1" />
                      Night Vision
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {camera.accessLevel.replace(/_/g, " ")}
                  </Badge>
                </div>
                <Button size="sm" variant="outline">
                  Configure
                </Button>
              </div>

              {/* Kennel Coverage */}
              {camera.kennelIds.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
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
