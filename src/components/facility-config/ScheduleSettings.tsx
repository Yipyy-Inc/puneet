import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  Save,
  ChevronDown,
  ChevronRight,
  Edit,
  X,
  Info,
} from "lucide-react";
import { facilityConfig } from "@/data/facility-config";
import { WarningModal } from "./WarningModal";

type FacilityConfig = typeof facilityConfig;

interface ScheduleSettingsProps {
  config: FacilityConfig;
  setConfig: React.Dispatch<React.SetStateAction<FacilityConfig>>;
  isOpen: boolean;
  onToggle: () => void;
  onSave: () => void;
}

export function ScheduleSettings({
  config,
  setConfig,
  isOpen,
  onToggle,
  onSave,
}: ScheduleSettingsProps) {
  const [editingCheckInOut, setEditingCheckInOut] = useState(false);
  const [editingOperatingHours, setEditingOperatingHours] = useState(false);
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    type: "checkInOut" | "operatingHours";
  }>({
    isOpen: false,
    type: "checkInOut",
  });

  const handleSaveCheckInOut = () => {
    setWarningModal({ isOpen: true, type: "checkInOut" });
  };

  const handleCancelCheckInOut = () => {
    setEditingCheckInOut(false);
    // Reset to original if needed, but for now, just cancel edit
  };

  const handleSaveOperatingHours = () => {
    setWarningModal({ isOpen: true, type: "operatingHours" });
  };

  const handleCancelOperatingHours = () => {
    setEditingOperatingHours(false);
  };

  const confirmSave = () => {
    if (warningModal.type === "checkInOut") {
      setEditingCheckInOut(false);
    } else {
      setEditingOperatingHours(false);
    }
    onSave();
  };

  const cancelWarning = () => {
    setWarningModal({ isOpen: false, type: "checkInOut" });
  };

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Check-in/Out Times & Operating Hours
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="text-muted-foreground size-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <div className="space-y-2">
                        <div>
                          <strong>Check-in/Out Times:</strong> Default times for
                          boarding and daycare services. Changes may affect
                          existing bookings.
                        </div>
                        <div>
                          <strong>Operating Hours:</strong> Facility operating
                          hours per day. Changes may impact scheduling and
                          availability.
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {isOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Check-in/Out Times */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">
                    Default Check-in/Out Times
                  </CardTitle>
                  {!editingCheckInOut ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCheckInOut(true)}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelCheckInOut}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveCheckInOut}>
                        <Save className="mr-2 size-4" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Check-in Times</Label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {Object.entries(
                        config.checkInOutTimes.defaultSchedules.checkIn,
                      ).map(([service, time]) => (
                        <div key={service}>
                          <Label className="text-sm capitalize">
                            {service}
                          </Label>
                          <Input
                            type="time"
                            value={time}
                            disabled={!editingCheckInOut}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                checkInOutTimes: {
                                  ...prev.checkInOutTimes,
                                  defaultSchedules: {
                                    ...prev.checkInOutTimes.defaultSchedules,
                                    checkIn: {
                                      ...prev.checkInOutTimes.defaultSchedules
                                        .checkIn,
                                      [service]: e.target.value,
                                    },
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Check-out Times</Label>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {Object.entries(
                        config.checkInOutTimes.defaultSchedules.checkOut,
                      ).map(([service, time]) => (
                        <div key={service}>
                          <Label className="text-sm capitalize">
                            {service}
                          </Label>
                          <Input
                            type="time"
                            value={time}
                            disabled={!editingCheckInOut}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                checkInOutTimes: {
                                  ...prev.checkInOutTimes,
                                  defaultSchedules: {
                                    ...prev.checkInOutTimes.defaultSchedules,
                                    checkOut: {
                                      ...prev.checkInOutTimes.defaultSchedules
                                        .checkOut,
                                      [service]: e.target.value,
                                    },
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Operating Hours */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Operating Hours</CardTitle>
                  {!editingOperatingHours ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingOperatingHours(true)}
                    >
                      <Edit className="mr-2 size-4" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelOperatingHours}
                      >
                        <X className="mr-2 size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveOperatingHours}>
                        <Save className="mr-2 size-4" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(config.checkInOutTimes.operatingHours).map(
                      ([day, hours]) => (
                        <div key={day} className="flex items-center space-x-4">
                          <Label className="w-20 capitalize">{day}</Label>
                          <Input
                            type="time"
                            value={hours.open}
                            disabled={!editingOperatingHours}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                checkInOutTimes: {
                                  ...prev.checkInOutTimes,
                                  operatingHours: {
                                    ...prev.checkInOutTimes.operatingHours,
                                    [day]: {
                                      ...hours,
                                      open: e.target.value,
                                    },
                                  },
                                },
                              }))
                            }
                          />
                          <span className="text-muted-foreground text-sm">
                            to
                          </span>
                          <Input
                            type="time"
                            value={hours.close}
                            disabled={!editingOperatingHours}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                checkInOutTimes: {
                                  ...prev.checkInOutTimes,
                                  operatingHours: {
                                    ...prev.checkInOutTimes.operatingHours,
                                    [day]: {
                                      ...hours,
                                      close: e.target.value,
                                    },
                                  },
                                },
                              }))
                            }
                          />
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <WarningModal
        isOpen={warningModal.isOpen}
        onClose={cancelWarning}
        onConfirm={confirmSave}
        title="Confirm Schedule Changes"
        description={`You are about to change the ${
          warningModal.type === "checkInOut"
            ? "check-in/out times"
            : "operating hours"
        }. This may affect existing bookings and facility operations. Please review your changes carefully before proceeding.`}
        confirmText="Confirm Changes"
      />
    </TooltipProvider>
  );
}
