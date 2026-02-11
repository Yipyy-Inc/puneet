"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, Plus, Trash2, GripVertical, Calendar, Clock, Users, AlertTriangle } from "lucide-react";
// Note: DatePickerWithRange component would need to be created or use a different date picker
// For now, using Input type="date" for simplicity
import { toast } from "sonner";

interface ServiceCatalogItem {
  id: string;
  name: string;
  enabled: boolean;
  sizePricing: {
    small: number;
    medium: number;
    large: number;
    xl: number;
  };
  order: number;
}

interface AddOnRestriction {
  id: string;
  addOnId: string;
  addOnName: string;
  requiresService?: string;
  requiresServiceName?: string;
  condition: "requires" | "excludes";
}

interface SchedulingRule {
  id: string;
  name: string;
  type: "advance_booking" | "zone_restriction" | "day_restriction";
  enabled: boolean;
  // For advance_booking
  dayOfWeek?: number; // 0 = Sunday, 6 = Saturday
  daysInAdvance?: number;
  // For zone_restriction
  zoneId?: string;
  zoneName?: string;
  noticeDays?: number;
  // For day_restriction
  restrictionType?: "block" | "limit";
}

interface GroomerBuffer {
  groomerId: string;
  groomerName: string;
  buffers: Array<{
    id: string;
    startTime: string;
    endTime: string;
    reason: string;
    recurring: boolean; // Daily recurring or one-time
    date?: string; // If not recurring
  }>;
}

interface CapacityGuard {
  enabled: boolean;
  threshold: number; // Percentage (0-100)
  action: "stop_online" | "warn_only";
  message?: string;
}

interface BlackoutDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  allowManualBooking: boolean;
}

export default function GroomingBookingRulesPage() {
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItem[]>([
    {
      id: "full-groom",
      name: "Full Groom",
      enabled: true,
      sizePricing: { small: 50, medium: 75, large: 100, xl: 125 },
      order: 1,
    },
    {
      id: "bath-only",
      name: "Bath Only",
      enabled: true,
      sizePricing: { small: 25, medium: 35, large: 45, xl: 55 },
      order: 2,
    },
    {
      id: "haircut",
      name: "Haircut",
      enabled: true,
      sizePricing: { small: 40, medium: 60, large: 80, xl: 100 },
      order: 3,
    },
    {
      id: "nail-trim",
      name: "Nail Trim",
      enabled: true,
      sizePricing: { small: 12, medium: 15, large: 18, xl: 20 },
      order: 4,
    },
  ]);

  const [addOnRestrictions, setAddOnRestrictions] = useState<AddOnRestriction[]>([
    {
      id: "1",
      addOnId: "teeth-brushing",
      addOnName: "Teeth Brushing",
      requiresService: "bath-only",
      requiresServiceName: "Bath Only",
      condition: "requires",
    },
  ]);

  const [schedulingRules, setSchedulingRules] = useState<SchedulingRule[]>([
    {
      id: "1",
      name: "Saturday slots - 30 days advance",
      type: "advance_booking",
      enabled: true,
      dayOfWeek: 6, // Saturday
      daysInAdvance: 30,
    },
    {
      id: "2",
      name: "Mobile Zone C - 2 week notice",
      type: "zone_restriction",
      enabled: true,
      zoneId: "zone-c",
      zoneName: "Zone C",
      noticeDays: 14,
    },
  ]);

  const [groomerBuffers, setGroomerBuffers] = useState<GroomerBuffer[]>([
    {
      groomerId: "stylist-001",
      groomerName: "Jessica Martinez",
      buffers: [
        {
          id: "1",
          startTime: "12:00",
          endTime: "12:30",
          reason: "Lunch break",
          recurring: true,
        },
      ],
    },
  ]);

  const [capacityGuard, setCapacityGuard] = useState<CapacityGuard>({
    enabled: true,
    threshold: 80,
    action: "stop_online",
    message: "We're almost fully booked. Please call for availability.",
  });

  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Save to backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Booking rules saved successfully");
    } catch (error) {
      toast.error("Failed to save booking rules");
    } finally {
      setIsSaving(false);
    }
  };

  const addSchedulingRule = () => {
    const newRule: SchedulingRule = {
      id: Date.now().toString(),
      name: "New Rule",
      type: "advance_booking",
      enabled: true,
      daysInAdvance: 7,
    };
    setSchedulingRules([...schedulingRules, newRule]);
  };

  const removeSchedulingRule = (id: string) => {
    setSchedulingRules(schedulingRules.filter((r) => r.id !== id));
  };

  const addBlackoutDate = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const newBlackout: BlackoutDate = {
      id: Date.now().toString(),
      startDate: today.toISOString().split("T")[0],
      endDate: tomorrow.toISOString().split("T")[0],
      reason: "Holiday",
      allowManualBooking: true,
    };
    setBlackoutDates([...blackoutDates, newBlackout]);
  };

  const removeBlackoutDate = (id: string) => {
    setBlackoutDates(blackoutDates.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Booking Rule Engine</h2>
          <p className="text-muted-foreground">
            Configure advanced booking rules and restrictions
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      {/* Service Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5" />
            Service Catalog
          </CardTitle>
          <CardDescription>
            Drag and drop to reorder, toggle to activate/deactivate services, set prices per size
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Service Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Small</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Large</TableHead>
                <TableHead>XL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceCatalog.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={service.enabled}
                      onCheckedChange={(checked) => {
                        setServiceCatalog(
                          serviceCatalog.map((s) =>
                            s.id === service.id ? { ...s, enabled: checked } : s
                          )
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={service.sizePricing.small}
                      onChange={(e) => {
                        setServiceCatalog(
                          serviceCatalog.map((s) =>
                            s.id === service.id
                              ? {
                                  ...s,
                                  sizePricing: {
                                    ...s.sizePricing,
                                    small: parseFloat(e.target.value) || 0,
                                  },
                                }
                              : s
                          )
                        );
                      }}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={service.sizePricing.medium}
                      onChange={(e) => {
                        setServiceCatalog(
                          serviceCatalog.map((s) =>
                            s.id === service.id
                              ? {
                                  ...s,
                                  sizePricing: {
                                    ...s.sizePricing,
                                    medium: parseFloat(e.target.value) || 0,
                                  },
                                }
                              : s
                          )
                        );
                      }}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={service.sizePricing.large}
                      onChange={(e) => {
                        setServiceCatalog(
                          serviceCatalog.map((s) =>
                            s.id === service.id
                              ? {
                                  ...s,
                                  sizePricing: {
                                    ...s.sizePricing,
                                    large: parseFloat(e.target.value) || 0,
                                  },
                                }
                              : s
                          )
                        );
                      }}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={service.sizePricing.xl}
                      onChange={(e) => {
                        setServiceCatalog(
                          serviceCatalog.map((s) =>
                            s.id === service.id
                              ? {
                                  ...s,
                                  sizePricing: {
                                    ...s.sizePricing,
                                    xl: parseFloat(e.target.value) || 0,
                                  },
                                }
                              : s
                          )
                        );
                      }}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add-On Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle>Add-On Restrictions</CardTitle>
          <CardDescription>
            Configure conditional rules for add-ons (e.g., "Don't show Teeth Brushing if Bath not selected")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {addOnRestrictions.map((restriction) => (
            <div
              key={restriction.id}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">{restriction.addOnName}</p>
                <p className="text-sm text-muted-foreground">
                  {restriction.condition === "requires"
                    ? `Requires: ${restriction.requiresServiceName}`
                    : `Excludes: ${restriction.requiresServiceName}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddOnRestrictions(
                    addOnRestrictions.filter((r) => r.id !== restriction.id)
                  );
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={() => {}}>
            <Plus className="mr-2 h-4 w-4" />
            Add Restriction
          </Button>
        </CardContent>
      </Card>

      {/* Scheduling Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduling Rules
          </CardTitle>
          <CardDescription>
            Configure advance booking limits, zone restrictions, and day-specific rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedulingRules.map((rule) => (
            <div key={rule.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) => {
                      setSchedulingRules(
                        schedulingRules.map((r) =>
                          r.id === rule.id ? { ...r, enabled: checked } : r
                        )
                      );
                    }}
                  />
                  <Label className="font-medium">{rule.name}</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSchedulingRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {rule.type === "advance_booking" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Day of Week</Label>
                    <Select
                      value={rule.dayOfWeek?.toString()}
                      onValueChange={(value) => {
                        setSchedulingRules(
                          schedulingRules.map((r) =>
                            r.id === rule.id
                              ? { ...r, dayOfWeek: parseInt(value) }
                              : r
                          )
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Days in Advance Required</Label>
                    <Input
                      type="number"
                      value={rule.daysInAdvance}
                      onChange={(e) => {
                        setSchedulingRules(
                          schedulingRules.map((r) =>
                            r.id === rule.id
                              ? { ...r, daysInAdvance: parseInt(e.target.value) || 0 }
                              : r
                          )
                        );
                      }}
                    />
                  </div>
                </div>
              )}
              {rule.type === "zone_restriction" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Zone</Label>
                    <Input value={rule.zoneName} readOnly />
                  </div>
                  <div>
                    <Label>Notice Required (days)</Label>
                    <Input
                      type="number"
                      value={rule.noticeDays}
                      onChange={(e) => {
                        setSchedulingRules(
                          schedulingRules.map((r) =>
                            r.id === rule.id
                              ? { ...r, noticeDays: parseInt(e.target.value) || 0 }
                              : r
                          )
                        );
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addSchedulingRule}>
            <Plus className="mr-2 h-4 w-4" />
            Add Scheduling Rule
          </Button>
        </CardContent>
      </Card>

      {/* Buffer Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Buffer Times (Per Groomer)
          </CardTitle>
          <CardDescription>
            Set custom break times between appointments per groomer (e.g., Jessica needs 30 min lunch at 12 PM)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groomerBuffers.map((groomer) => (
            <div key={groomer.groomerId} className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium">{groomer.groomerName}</h4>
              {groomer.buffers.map((buffer) => (
                <div key={buffer.id} className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      type="time"
                      value={buffer.startTime}
                      onChange={(e) => {
                        setGroomerBuffers(
                          groomerBuffers.map((g) =>
                            g.groomerId === groomer.groomerId
                              ? {
                                  ...g,
                                  buffers: g.buffers.map((b) =>
                                    b.id === buffer.id
                                      ? { ...b, startTime: e.target.value }
                                      : b
                                  ),
                                }
                              : g
                          )
                        );
                      }}
                    />
                    <Input
                      type="time"
                      value={buffer.endTime}
                      onChange={(e) => {
                        setGroomerBuffers(
                          groomerBuffers.map((g) =>
                            g.groomerId === groomer.groomerId
                              ? {
                                  ...g,
                                  buffers: g.buffers.map((b) =>
                                    b.id === buffer.id
                                      ? { ...b, endTime: e.target.value }
                                      : b
                                  ),
                                }
                              : g
                          )
                        );
                      }}
                    />
                    <Input
                      value={buffer.reason}
                      onChange={(e) => {
                        setGroomerBuffers(
                          groomerBuffers.map((g) =>
                            g.groomerId === groomer.groomerId
                              ? {
                                  ...g,
                                  buffers: g.buffers.map((b) =>
                                    b.id === buffer.id
                                      ? { ...b, reason: e.target.value }
                                      : b
                                  ),
                                }
                              : g
                          )
                        );
                      }}
                      placeholder="Reason (e.g., Lunch break)"
                    />
                  </div>
                  <Switch
                    checked={buffer.recurring}
                    onCheckedChange={(checked) => {
                      setGroomerBuffers(
                        groomerBuffers.map((g) =>
                          g.groomerId === groomer.groomerId
                            ? {
                                ...g,
                                buffers: g.buffers.map((b) =>
                                  b.id === buffer.id
                                    ? { ...b, recurring: checked }
                                    : b
                                ),
                              }
                            : g
                        )
                      );
                    }}
                  />
                  <Badge variant={buffer.recurring ? "default" : "outline"}>
                    {buffer.recurring ? "Daily" : "One-time"}
                  </Badge>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Capacity Guards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Capacity Guards
          </CardTitle>
          <CardDescription>
            Stop accepting bookings when a percentage threshold is reached (leave room for urgent/emergency grooms)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Capacity Guard</Label>
              <p className="text-sm text-muted-foreground">
                Automatically stop online bookings when capacity threshold is reached
              </p>
            </div>
            <Switch
              checked={capacityGuard.enabled}
              onCheckedChange={(checked) => {
                setCapacityGuard({ ...capacityGuard, enabled: checked });
              }}
            />
          </div>
          {capacityGuard.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Threshold (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={capacityGuard.threshold}
                    onChange={(e) => {
                      setCapacityGuard({
                        ...capacityGuard,
                        threshold: parseInt(e.target.value) || 0,
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Stop online booking when {capacityGuard.threshold}% of slots are full
                  </p>
                </div>
                <div>
                  <Label>Action</Label>
                  <Select
                    value={capacityGuard.action}
                    onValueChange={(value: "stop_online" | "warn_only") => {
                      setCapacityGuard({ ...capacityGuard, action: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop_online">Stop Online Booking</SelectItem>
                      <SelectItem value="warn_only">Warn Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Message to Customers</Label>
                <Textarea
                  value={capacityGuard.message}
                  onChange={(e) => {
                    setCapacityGuard({ ...capacityGuard, message: e.target.value });
                  }}
                  placeholder="We're almost fully booked. Please call for availability."
                  rows={2}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Blackout Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Blackout Dates
          </CardTitle>
          <CardDescription>
            Block online booking for specific dates (holidays, staff training) while keeping calendar open for manual entry
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {blackoutDates.map((blackout) => (
            <div key={blackout.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={blackout.startDate}
                      onChange={(e) => {
                        setBlackoutDates(
                          blackoutDates.map((b) =>
                            b.id === blackout.id
                              ? { ...b, startDate: e.target.value }
                              : b
                          )
                        );
                      }}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={blackout.endDate}
                      onChange={(e) => {
                        setBlackoutDates(
                          blackoutDates.map((b) =>
                            b.id === blackout.id
                              ? { ...b, endDate: e.target.value }
                              : b
                          )
                        );
                      }}
                    />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Input
                      value={blackout.reason}
                      onChange={(e) => {
                        setBlackoutDates(
                          blackoutDates.map((b) =>
                            b.id === blackout.id
                              ? { ...b, reason: e.target.value }
                              : b
                          )
                        );
                      }}
                      placeholder="Holiday, Training, etc."
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBlackoutDate(blackout.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={blackout.allowManualBooking}
                  onCheckedChange={(checked) => {
                    setBlackoutDates(
                      blackoutDates.map((b) =>
                        b.id === blackout.id
                          ? { ...b, allowManualBooking: checked }
                          : b
                      )
                    );
                  }}
                />
                <Label className="text-sm">
                  Allow manual booking by staff (override online restriction)
                </Label>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addBlackoutDate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Blackout Date
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
