"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import {
  petCams,
  type PetCam,
  mobileAppSettings,
} from "@/data/additional-features";
import { bookings } from "@/data/bookings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Video,
  CircleDot,
  AlertCircle,
  Clock,
  Eye,
  Volume2,
  Moon,
  Move,
} from "lucide-react";
import { facilityConfig } from "@/data/facility-config";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerCamerasPage() {
  const { selectedFacility } = useCustomerFacility();
  const [selectedCamera, setSelectedCamera] = useState<PetCam | null>(null);

  // Check if customer has an active stay (today within a confirmed booking at this facility)
  const hasActiveStay = useMemo(() => {
    if (!selectedFacility) return false;
    const today = new Date().toISOString().split("T")[0];
    return bookings.some(
      (b) =>
        b.clientId === MOCK_CUSTOMER_ID &&
        b.facilityId === selectedFacility.id &&
        b.status === "confirmed" &&
        b.startDate <= today &&
        b.endDate >= today,
    );
  }, [selectedFacility]);

  // TODO: Replace with real membership logic when membership data is available
  const hasCameraMembership = false;

  const hasCameraAccess = hasActiveStay || hasCameraMembership;

  // Check if cameras are enabled for this facility and customer
  const camerasEnabled = useMemo(() => {
    if (!mobileAppSettings.enableLiveCamera) return false;
    if (!hasCameraAccess) return false;

    // Check if facility has any cameras accessible to customers
    const customerAccessibleCameras = petCams.filter(
      (cam) =>
        cam.accessLevel === "public" || cam.accessLevel === "customers_only",
    );
    return customerAccessibleCameras.length > 0;
  }, [hasCameraAccess]);

  // Get allowed access times from facility config
  const allowedAccessTimes = useMemo(() => {
    // Default to facility operating hours
    return facilityConfig.checkInOutTimes.operatingHours;
  }, []);

  // Check if cameras are currently accessible based on time
  const isWithinAccessHours = useMemo(() => {
    const now = new Date();
    const currentDay = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][now.getDay()] as keyof typeof allowedAccessTimes;

    const hours = allowedAccessTimes[currentDay];
    if (!hours) return false;

    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    return currentTime >= hours.open && currentTime <= hours.close;
  }, [allowedAccessTimes]);

  // Filter cameras to only show customer-accessible ones
  const customerCameras = useMemo(() => {
    return petCams.filter(
      (cam) =>
        (cam.accessLevel === "public" ||
          cam.accessLevel === "customers_only") &&
        cam.isOnline,
    );
  }, []);

  // If cameras are not enabled, don't show the page
  if (!camerasEnabled) {
    return (
      <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
              <h2 className="mb-2 text-2xl font-bold">
                Live Cameras Not Available
              </h2>
              <p className="text-muted-foreground">
                Live camera access is only available for active stays or
                memberships at facilities that have cameras enabled.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If outside access hours, show message
  if (!isWithinAccessHours) {
    const now = new Date();
    const currentDay = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][now.getDay()] as keyof typeof allowedAccessTimes;
    const hours = allowedAccessTimes[currentDay];

    return (
      <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Live Cameras</h1>
            <p className="text-muted-foreground">
              View live feeds from {selectedFacility?.name ?? "the facility"}
            </p>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
              <h2 className="mb-2 text-2xl font-bold">
                Cameras Currently Unavailable
              </h2>
              <p className="text-muted-foreground mb-4">
                Live cameras are only available during facility operating hours.
              </p>
              {hours && (
                <p className="text-muted-foreground text-sm">
                  Today&apos;s hours: {hours.open} - {hours.close}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Live Cameras</h1>
          <p className="text-muted-foreground">
            Watch your pet in real-time at{" "}
            {selectedFacility?.name ?? "the facility"}
          </p>
        </div>

        {/* Privacy Notice */}
        <Alert>
          <AlertDescription className="space-y-1 text-sm">
            <p>
              Cameras are provided for your convenience while your pet is
              staying with us. Access is limited to active stays and may be
              unavailable outside of operating hours.
            </p>
            <p>
              We do not record audio on customer-facing cameras, and live
              streams are only visible to authorized customers and staff.
            </p>
            <p>
              Video quality automatically adjusts based on your network
              connection. On slower networks, the stream may appear lower
              resolution or pause briefly.
            </p>
          </AlertDescription>
        </Alert>

        {customerCameras.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
              <h2 className="mb-2 text-2xl font-bold">No Cameras Available</h2>
              <p className="text-muted-foreground">
                There are currently no active cameras available for viewing.
              </p>
            </CardContent>
          </Card>
        ) : (
          // One camera per row on mobile, multiple per row on larger screens
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {customerCameras.map((camera) => (
              <Card
                key={camera.id}
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                onClick={() => setSelectedCamera(camera)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        {camera.name}
                        {camera.isOnline ? (
                          <CircleDot className="size-4 shrink-0 animate-pulse text-green-500" />
                        ) : (
                          <AlertCircle className="size-4 shrink-0 text-red-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 truncate text-xs">
                        {camera.location}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Video Preview */}
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
                    {camera.isOnline ? (
                      <>
                        {/* Simulated video feed */}
                        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-slate-800 to-slate-900">
                          <Video className="h-12 w-12 text-slate-600" />
                          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-sm bg-red-600 px-2 py-1 text-xs text-white">
                            <CircleDot className="h-2 w-2 animate-pulse" />
                            LIVE
                          </div>
                          <div className="absolute top-2 right-2 rounded-sm bg-black/50 px-2 py-1 text-xs text-white">
                            {camera.resolution}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                        <AlertCircle className="h-12 w-12 text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Camera Features */}
                  <div className="flex flex-wrap gap-2">
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
                      {camera.resolution}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Full Screen Camera View Modal */}
        {selectedCamera && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedCamera(null)}
          >
            <div
              className="relative aspect-video w-full max-w-6xl rounded-lg bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedCamera(null)}
                className="absolute top-4 right-4 z-10 rounded-lg bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <AlertCircle className="h-5 w-5" />
              </button>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Video className="mx-auto mb-4 h-24 w-24 text-slate-600" />
                  <h3 className="mb-2 text-xl font-semibold">
                    {selectedCamera.name}
                  </h3>
                  <p className="mb-4 text-sm text-slate-400">
                    {selectedCamera.location}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <CircleDot className="h-3 w-3 animate-pulse text-green-500" />
                    <span className="text-sm">Live Stream</span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Stream URL: {selectedCamera.streamUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
