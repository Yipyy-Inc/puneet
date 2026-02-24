"use client";

import { useState } from "react";
import { facilities } from "@/data/facilities";
import {
  staffAvailability,
  timeOffRequests,
  TimeOffRequest as BaseTimeOffRequest,
} from "@/data/staff-availability";

// Extend TimeOffRequest to be compatible with DataTable's Record<string, unknown> constraint
type TimeOffRequest = BaseTimeOffRequest & Record<string, unknown>;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Edit,
} from "lucide-react";

const exampleStaff = [
  { id: 1, name: "Admin User", role: "Admin" },
  { id: 2, name: "Manager One", role: "Manager" },
  { id: 3, name: "Mike Chen", role: "Staff" },
  { id: 5, name: "Emily Davis", role: "Staff" },
  { id: 7, name: "David Wilson", role: "Staff" },
  { id: 8, name: "Lisa Rodriguez", role: "Staff" },
  { id: 9, name: "Tom Anderson", role: "Staff" },
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  changes_requested: "bg-orange-100 text-orange-800",
};

const typeColors: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-800",
  sick: "bg-orange-100 text-orange-800",
  personal: "bg-purple-100 text-purple-800",
  bereavement: "bg-gray-100 text-gray-800",
  other: "bg-slate-100 text-slate-800",
};

export default function StaffAvailabilityPage() {
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [activeTab, setActiveTab] = useState("grid");
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [reviewingRequest, setReviewingRequest] =
    useState<TimeOffRequest | null>(null);

  const [availabilityForm, setAvailabilityForm] = useState<
    Record<number, { startTime: string; endTime: string; isAvailable: boolean }>
  >({});

  const [timeOffForm, setTimeOffForm] = useState({
    staffId: "",
    type: "vacation" as TimeOffRequest["type"],
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [reviewForm, setReviewForm] = useState({
    status: "approved" as "approved" | "denied",
    notes: "",
  });

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const facilityAvailability = staffAvailability.filter(
    (a) => a.facility === "Paws & Play Daycare",
  );
  const facilityTimeOff: TimeOffRequest[] = timeOffRequests.filter(
    (r) => r.facility === "Paws & Play Daycare",
  ) as TimeOffRequest[];

  const pendingRequests = facilityTimeOff.filter((r) => r.status === "pending");
  const upcomingApproved = facilityTimeOff.filter(
    (r) => r.status === "approved" && new Date(r.startDate) >= new Date(),
  );

  const getAvailabilityForStaff = (staffId: number) => {
    return facilityAvailability.filter((a) => a.staffId === staffId);
  };

  const handleEditAvailability = (staffId: number) => {
    const staffAvail = getAvailabilityForStaff(staffId);
    const formData: Record<
      number,
      { startTime: string; endTime: string; isAvailable: boolean }
    > = {};

    for (let day = 0; day < 7; day++) {
      const dayAvail = staffAvail.find((a) => a.dayOfWeek === day);
      formData[day] = dayAvail
        ? {
            startTime: dayAvail.startTime,
            endTime: dayAvail.endTime,
            isAvailable: dayAvail.isAvailable,
          }
        : { startTime: "09:00", endTime: "17:00", isAvailable: false };
    }

    setAvailabilityForm(formData);
    setEditingStaffId(staffId);
    setIsAvailabilityModalOpen(true);
  };

  const handleSaveAvailability = () => {
    setIsAvailabilityModalOpen(false);
    setEditingStaffId(null);
  };

  const handleSubmitTimeOff = () => {
    setIsTimeOffModalOpen(false);
    setTimeOffForm({
      staffId: "",
      type: "vacation",
      startDate: "",
      endDate: "",
      reason: "",
    });
  };

  const handleReviewRequest = (request: TimeOffRequest) => {
    setReviewingRequest(request);
    setReviewForm({ status: "approved", notes: "" });
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = () => {
    setIsReviewModalOpen(false);
    setReviewingRequest(null);
  };

  const timeOffColumns: ColumnDef<TimeOffRequest>[] = [
    {
      key: "staffName",
      label: "Staff Member",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "type",
      label: "Type",
      defaultVisible: true,
      render: (request) => (
        <Badge className={typeColors[request.type] || typeColors.other} variant="secondary">
          {request.type}
        </Badge>
      ),
    },
    {
      key: "startDate",
      label: "Start Date",
      icon: Calendar,
      defaultVisible: true,
    },
    {
      key: "endDate",
      label: "End Date",
      defaultVisible: true,
    },
    {
      key: "reason",
      label: "Reason",
      defaultVisible: true,
      render: (request) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {request.reason}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (request) => (
        <Badge className={statusColors[request.status] || statusColors.pending} variant="secondary">
          {request.status}
        </Badge>
      ),
    },
    {
      key: "requestedAt",
      label: "Requested",
      defaultVisible: true,
    },
  ];

  const timeOffFilters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "denied", label: "Denied" },
      ],
    },
    {
      key: "type",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "vacation", label: "Vacation" },
        { value: "sick", label: "Sick" },
        { value: "personal", label: "Personal" },
        { value: "bereavement", label: "Bereavement" },
        { value: "other", label: "Other" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Staff with Availability
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(facilityAvailability.map((a) => a.staffId)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {exampleStaff.length} total staff
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Time Off
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingApproved.length}</div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityTimeOff.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Availability Grid and Time-off Requests */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">Availability Grid</TabsTrigger>
            <TabsTrigger value="requests">
              Time-off Requests
              {pendingRequests.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 p-0 text-xs"
                >
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-2">
            {activeTab === "requests" && (
              <Button onClick={() => setIsTimeOffModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Availability Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Staff</th>
                      {dayNames.map((day) => (
                        <th key={day} className="text-center p-3 font-medium">
                          {day}
                        </th>
                      ))}
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exampleStaff.map((staff) => {
                      const avail = getAvailabilityForStaff(staff.id);
                      return (
                        <tr
                          key={staff.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{staff.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {staff.role}
                              </p>
                            </div>
                          </td>
                          {dayNames.map((_, dayIndex) => {
                            const dayAvail = avail.find(
                              (a) => a.dayOfWeek === dayIndex,
                            );
                            return (
                              <td key={dayIndex} className="text-center p-3">
                                {dayAvail && dayAvail.isAvailable ? (
                                  <div className="text-xs">
                                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded">
                                      {dayAvail.startTime}-{dayAvail.endTime}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-right p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAvailability(staff.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <DataTable
            data={facilityTimeOff}
            columns={timeOffColumns}
            filters={timeOffFilters}
            searchKey="staffName"
            searchPlaceholder="Search requests..."
            itemsPerPage={10}
            actions={(request) => (
              <div className="flex gap-2">
                {request.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReviewRequest(request)}
                      title="Review Request"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </Button>
                  </>
                )}
                {request.status !== "pending" && (
                  <Button variant="outline" size="sm" disabled>
                    <span className="text-xs">
                      {request.status === "approved" ? "Approved" : "Denied"}
                    </span>
                  </Button>
                )}
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Availability Modal */}
      <Dialog
        open={isAvailabilityModalOpen}
        onOpenChange={setIsAvailabilityModalOpen}
      >
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Availability</DialogTitle>
            <DialogDescription>
              Set working hours for{" "}
              {exampleStaff.find((s) => s.id === editingStaffId)?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {dayNames.map((day, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                <div className="w-16 font-medium">{day}</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availabilityForm[index]?.isAvailable || false}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        [index]: {
                          ...availabilityForm[index],
                          isAvailable: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Available</span>
                </label>
                {availabilityForm[index]?.isAvailable && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      type="time"
                      value={availabilityForm[index]?.startTime || "09:00"}
                      onChange={(e) =>
                        setAvailabilityForm({
                          ...availabilityForm,
                          [index]: {
                            ...availabilityForm[index],
                            startTime: e.target.value,
                          },
                        })
                      }
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={availabilityForm[index]?.endTime || "17:00"}
                      onChange={(e) =>
                        setAvailabilityForm({
                          ...availabilityForm,
                          [index]: {
                            ...availabilityForm[index],
                            endTime: e.target.value,
                          },
                        })
                      }
                      className="w-32"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAvailabilityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAvailability}>Save Availability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Time-off Request Modal */}
      <Dialog open={isTimeOffModalOpen} onOpenChange={setIsTimeOffModalOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription>
              Submit a new time-off request for a staff member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staffMember">Staff Member *</Label>
              <Select
                value={timeOffForm.staffId}
                onValueChange={(value) =>
                  setTimeOffForm({ ...timeOffForm, staffId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {exampleStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type *</Label>
              <Select
                value={timeOffForm.type}
                onValueChange={(value: TimeOffRequest["type"]) =>
                  setTimeOffForm({ ...timeOffForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="bereavement">Bereavement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={timeOffForm.startDate}
                  onChange={(e) =>
                    setTimeOffForm({
                      ...timeOffForm,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={timeOffForm.endDate}
                  onChange={(e) =>
                    setTimeOffForm({ ...timeOffForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={timeOffForm.reason}
                onChange={(e) =>
                  setTimeOffForm({ ...timeOffForm, reason: e.target.value })
                }
                placeholder="Provide a reason for the request..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTimeOffModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitTimeOff}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Request Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle>Review Time-off Request</DialogTitle>
            <DialogDescription>
              Review the request from {reviewingRequest?.staffName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reviewingRequest && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge
                    className={typeColors[reviewingRequest.type] || typeColors.other}
                    variant="secondary"
                  >
                    {reviewingRequest.type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dates:</span>
                  <span>
                    {reviewingRequest.startDate} to {reviewingRequest.endDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="text-right max-w-[60%]">
                    {reviewingRequest.reason}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested:</span>
                  <span>{reviewingRequest.requestedAt}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="decision">Decision *</Label>
              <Select
                value={reviewForm.status}
                onValueChange={(value: "approved" | "denied") =>
                  setReviewForm({ ...reviewForm, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Approve
                    </span>
                  </SelectItem>
                  <SelectItem value="denied">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Deny
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewNotes">Notes for Staff Member</Label>
              <Textarea
                id="reviewNotes"
                value={reviewForm.notes}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, notes: e.target.value })
                }
                placeholder="Optional notes to include with your decision..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              variant={
                reviewForm.status === "denied" ? "destructive" : "default"
              }
            >
              {reviewForm.status === "approved" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Request
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Deny Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
