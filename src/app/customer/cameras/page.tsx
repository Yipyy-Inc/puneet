"use client";

import { useMemo, useState } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { petCams, type PetCam, mobileAppSettings } from "@/data/additional-features";
import { cameraIntegrationConfig, petCamAccessConfigs } from "@/data/camera-integration";
import { bookings } from "@/data/bookings";
import { memberships } from "@/data/services-pricing";
import { customerPackagePurchases } from "@/data/services-pricing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Camera,
  Video,
  CircleDot,
  AlertCircle,
  Clock,
  Volume2,
  Moon,
  Move,
  Eye,
  Crown,
  Package,
  CalendarCheck,
  X,
} from "lucide-react";
import { facilityConfig } from "@/data/facility-config";
import type { CameraRuleSet, CameraServiceType } from "@/types/camera-integration";

const MOCK_CUSTOMER_ID = 15;

type AccessReason =
  | { type: "active_stay"; service: CameraServiceType }
  | { type: "membership"; planName: string }
  | { type: "package"; packageName: string }
  | { type: "service_customer"; service: CameraServiceType }
  | { type: "operation_hours" };

function evaluateRuleSet(
  ruleSet: CameraRuleSet,
  context: {
    activeStayServices: CameraServiceType[];
    membershipPlanIds: string[];
    purchasedPackageIds: string[];
    customerServiceTypes: CameraServiceType[];
    isWithinOperatingHours: boolean;
  },
): { passes: boolean; reasons: AccessReason[] } {
  if (!ruleSet.enabled || ruleSet.rules.length === 0) {
    return { passes: false, reasons: [] };
  }

  const results: { passes: boolean; reason: AccessReason | null }[] = ruleSet.rules.map(
    (rule) => {
      if (rule.type === "active_stay") {
        const matchedService = rule.services.find((s) =>
          context.activeStayServices.includes(s),
        );
        return matchedService
          ? { passes: true, reason: { type: "active_stay", service: matchedService } }
          : { passes: false, reason: null };
      }
      if (rule.type === "operation_hours") {
        return context.isWithinOperatingHours
          ? { passes: true, reason: { type: "operation_hours" } }
          : { passes: false, reason: null };
      }
      if (rule.type === "membership") {
        const matchedPlan = rule.membershipPlanIds.find((id) =>
          context.membershipPlanIds.includes(id),
        );
        return matchedPlan
          ? { passes: true, reason: { type: "membership", planName: matchedPlan } }
          : { passes: false, reason: null };
      }
      if (rule.type === "package") {
        const matchedPkg = rule.packageIds.find((id) =>
          context.purchasedPackageIds.includes(id),
        );
        return matchedPkg
          ? { passes: true, reason: { type: "package", packageName: matchedPkg } }
          : { passes: false, reason: null };
      }
      if (rule.type === "service_customer") {
        const matchedService = rule.services.find((s) =>
          context.customerServiceTypes.includes(s),
        );
        return matchedService
          ? { passes: true, reason: { type: "service_customer", service: matchedService } }
          : { passes: false, reason: null };
      }
      return { passes: false, reason: null };
    },
  );

  const passedResults = results.filter((r) => r.passes);
  const passes =
    ruleSet.logic === "any" ? passedResults.length > 0 : passedResults.length === results.length;
  const reasons = passedResults.map((r) => r.reason).filter(Boolean) as AccessReason[];

  return { passes, reasons };
}

function AccessReasonBadge({ reason }: { reason: AccessReason }) {
  if (reason.type === "active_stay") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs gap-1">
        <CalendarCheck className="size-3" />
        Active {reason.service.charAt(0).toUpperCase() + reason.service.slice(1)} Stay
      </Badge>
    );
  }
  if (reason.type === "membership") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs gap-1">
        <Crown className="size-3" />
        Member
      </Badge>
    );
  }
  if (reason.type === "package") {
    return (
      <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs gap-1">
        <Package className="size-3" />
        Package
      </Badge>
    );
  }
  if (reason.type === "service_customer") {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs gap-1">
        <Eye className="size-3" />
        {reason.service.charAt(0).toUpperCase() + reason.service.slice(1)} Customer
      </Badge>
    );
  }
  if (reason.type === "operation_hours") {
    return (
      <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-400 text-xs gap-1">
        <Clock className="size-3" />
        Open Hours
      </Badge>
    );
  }
  return null;
}

export default function CustomerCamerasPage() {
  const { selectedFacility } = useCustomerFacility();
  const [selectedCamera, setSelectedCamera] = useState<{
    cam: PetCam;
    reasons: AccessReason[];
  } | null>(null);

  // ─── Access Context ────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const activeStayServices = useMemo<CameraServiceType[]>(() => {
    if (!selectedFacility) return [];
    const serviceMap: Record<string, CameraServiceType> = {
      boarding: "boarding",
      daycare: "daycare",
      grooming: "grooming",
      training: "training",
    };
    return bookings
      .filter(
        (b) =>
          b.clientId === MOCK_CUSTOMER_ID &&
          b.facilityId === selectedFacility.id &&
          b.status === "confirmed" &&
          b.startDate <= today &&
          b.endDate >= today,
      )
      .map((b) => serviceMap[b.service])
      .filter((s): s is CameraServiceType => Boolean(s));
  }, [selectedFacility, today]);

  const membershipPlanIds = useMemo(() => {
    return memberships
      .filter(
        (m) =>
          m.customerId === String(MOCK_CUSTOMER_ID) &&
          m.status === "active",
      )
      .map((m) => m.planId);
  }, []);

  const purchasedPackageIds = useMemo(() => {
    return customerPackagePurchases
      .filter(
        (p) =>
          p.customerId === String(MOCK_CUSTOMER_ID) &&
          new Date(p.expiresAt) > new Date(),
      )
      .map((p) => p.packageId);
  }, []);

  const customerServiceTypes = useMemo<CameraServiceType[]>(() => {
    if (!selectedFacility) return [];
    const serviceMap: Record<string, CameraServiceType> = {
      boarding: "boarding",
      daycare: "daycare",
      grooming: "grooming",
      training: "training",
    };
    return [
      ...new Set(
        bookings
          .filter(
            (b) =>
              b.clientId === MOCK_CUSTOMER_ID &&
              b.facilityId === selectedFacility.id &&
              b.status === "confirmed",
          )
          .map((b) => serviceMap[b.service])
          .filter((s): s is CameraServiceType => Boolean(s)),
      ),
    ];
  }, [selectedFacility]);

  const isWithinOperatingHours = useMemo(() => {
    const now = new Date();
    const dayKey = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][now.getDay()] as keyof typeof facilityConfig.checkInOutTimes.operatingHours;
    const hours = facilityConfig.checkInOutTimes.operatingHours[dayKey];
    if (!hours) return false;
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= hours.open && currentTime <= hours.close;
  }, []);

  const ruleContext = {
    activeStayServices,
    membershipPlanIds,
    purchasedPackageIds,
    customerServiceTypes,
    isWithinOperatingHours,
  };

  // ─── Filter Accessible Cameras ────────────────────────────────
  const accessibleCameras = useMemo(() => {
    if (!cameraIntegrationConfig.isEnabled || !mobileAppSettings.enableLiveCamera) return [];

    return petCams
      .filter((cam) => {
        const accessConfig = petCamAccessConfigs[cam.id];
        if (!accessConfig?.isCustomerVisible) return false;
        if (!cam.isOnline) return false;

        const ruleSet = accessConfig.useGlobalRules
          ? cameraIntegrationConfig.globalRuleSet
          : accessConfig.customRuleSet;
        if (!ruleSet) return false;

        return evaluateRuleSet(ruleSet, ruleContext).passes;
      })
      .map((cam) => {
        const accessConfig = petCamAccessConfigs[cam.id]!;
        const ruleSet = accessConfig.useGlobalRules
          ? cameraIntegrationConfig.globalRuleSet
          : accessConfig.customRuleSet!;
        const { reasons } = evaluateRuleSet(ruleSet, ruleContext);
        return { cam, reasons };
      });
  }, [ruleContext]);

  // ─── Feature disabled guard ────────────────────────────────────
  if (!cameraIntegrationConfig.isEnabled || !mobileAppSettings.enableLiveCamera) {
    return (
      <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center">
              <Camera className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-30" />
              <h2 className="mb-2 text-2xl font-bold">Live Cameras Not Available</h2>
              <p className="text-muted-foreground">
                Live camera access is not currently enabled at this facility.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── No access guard ──────────────────────────────────────────
  if (accessibleCameras.length === 0) {
    return (
      <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Live Cameras</h1>
            <p className="text-muted-foreground">
              Watch your pet in real-time at {selectedFacility?.name ?? "the facility"}
            </p>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-30" />
              <h2 className="mb-2 text-2xl font-bold">No Cameras Available</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Camera access requires an active stay, qualifying membership, or service package
                at this facility.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main view ────────────────────────────────────────────────
  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Live Cameras</h1>
            <p className="text-muted-foreground">
              Watch your pet in real-time at{" "}
              {selectedFacility?.name ?? "the facility"}
            </p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1.5">
            <CircleDot className="size-2.5 animate-pulse" />
            {accessibleCameras.length} Camera{accessibleCameras.length > 1 ? "s" : ""} Available
          </Badge>
        </div>

        <Alert>
          <AlertDescription className="text-sm text-muted-foreground space-y-1">
            <p>
              Cameras are provided for your peace of mind while your pet is with us. Live
              streams are only visible to you and authorized staff — never recorded for public use.
            </p>
            <p>
              Video quality adjusts automatically based on your connection speed.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accessibleCameras.map(({ cam, reasons }) => (
            <Card
              key={cam.id}
              className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
              onClick={() => setSelectedCamera({ cam, reasons })}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {cam.name}
                      <CircleDot className="size-4 shrink-0 animate-pulse text-green-500" />
                    </CardTitle>
                    <CardDescription className="mt-1 truncate text-xs">
                      {cam.location}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Video Preview */}
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-900">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <Video className="size-12 text-slate-600" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs text-white">
                      <CircleDot className="size-2 animate-pulse" />
                      LIVE
                    </div>
                    <div className="absolute top-2 right-2 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                      {cam.resolution}
                    </div>
                  </div>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {cam.hasAudio && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Volume2 className="size-3" />
                      Audio
                    </Badge>
                  )}
                  {cam.hasPanTilt && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Move className="size-3" />
                      Pan/Tilt
                    </Badge>
                  )}
                  {cam.hasNightVision && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Moon className="size-3" />
                      Night Vision
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs gap-1">
                    <Eye className="size-3" />
                    {cam.resolution}
                  </Badge>
                </div>

                {/* Access Reason */}
                {reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t pt-2">
                    <span className="text-muted-foreground text-xs self-center">Access via:</span>
                    {reasons.slice(0, 2).map((r, i) => (
                      <AccessReasonBadge key={i} reason={r} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Full-Screen Modal */}
        {selectedCamera && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedCamera(null)}
          >
            <div
              className="relative w-full max-w-5xl rounded-2xl bg-slate-900 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div>
                  <h3 className="text-white font-semibold">{selectedCamera.cam.name}</h3>
                  <p className="text-slate-400 text-xs">{selectedCamera.cam.location}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CircleDot className="size-2.5 animate-pulse" />
                    Live
                  </div>
                  <button
                    onClick={() => setSelectedCamera(null)}
                    className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Video area */}
              <div className="relative aspect-video flex items-center justify-center">
                <Video className="size-24 text-slate-700" />
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5">
                  {selectedCamera.reasons.map((r, i) => (
                    <AccessReasonBadge key={i} reason={r} />
                  ))}
                </div>
              </div>

              {/* Feature row */}
              <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-white/10 text-xs text-slate-400">
                {selectedCamera.cam.hasAudio && (
                  <span className="flex items-center gap-1"><Volume2 className="size-3" /> Audio</span>
                )}
                {selectedCamera.cam.hasPanTilt && (
                  <span className="flex items-center gap-1"><Move className="size-3" /> Pan/Tilt</span>
                )}
                {selectedCamera.cam.hasNightVision && (
                  <span className="flex items-center gap-1"><Moon className="size-3" /> Night Vision</span>
                )}
                <span className="flex items-center gap-1"><Eye className="size-3" /> {selectedCamera.cam.resolution}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
