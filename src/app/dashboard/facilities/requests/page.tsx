"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Eye, Check, X, ArrowLeft } from "lucide-react";
import { facilityRequests, FacilityRequest } from "@/data/facility-requests";

export default function FacilitiesRequestsPage() {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [requests, setRequests] = useState(facilityRequests);
  const [selectedRequest, setSelectedRequest] =
    useState<FacilityRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApprove = (id: number) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
    );
    setIsModalOpen(false);
  };

  const handleDeny = (id: number) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "denied" } : r)),
    );
    setIsModalOpen(false);
  };

  const columns: ColumnDef<FacilityRequest>[] = [
    {
      key: "facilityName",
      label: tCommon("facility"),
      defaultVisible: true,
    },
    {
      key: "requestType",
      label: tCommon("type"),
      defaultVisible: true,
    },
    {
      key: "description",
      label: "Description",
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (request) => (
        <Badge
          variant={
            request.status === "pending"
              ? "secondary"
              : request.status === "approved"
                ? "default"
                : "destructive"
          }
        >
          {request.status}
        </Badge>
      ),
    },
    {
      key: "time",
      label: "Time",
      defaultVisible: true,
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "denied", label: "Denied" },
      ],
    },
    {
      key: "requestType",
      label: "Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "Trial", label: "Trial" },
        { value: "Plan Upgrade", label: "Plan Upgrade" },
        { value: "Plan Downgrade", label: "Plan Downgrade" },
        { value: "Add Service", label: "Add Service" },
        { value: "Remove Service", label: "Remove Service" },
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex flex-col gap-8">
        <Button
          variant="outline"
          className="w-min"
          onClick={() => router.push("/dashboard/facilities")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Facilities
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Facility Requests</h2>
      </div>

      <DataTable
        data={requests}
        columns={columns}
        filters={filters}
        searchKey="facilityName"
        searchPlaceholder="Search requests..."
        itemsPerPage={10}
        actions={(request) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedRequest(request);
              setIsModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        rowClassName={(request) =>
          request.status !== "pending" ? "opacity-50" : ""
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="min-w-7xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-0">
              <DialogTitle>
                {selectedRequest?.facilityName} - {selectedRequest?.requestType}{" "}
                Request
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Facility Name</h4>
                      <p>{selectedRequest.facilityName}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Business Type</h4>
                      <p>{selectedRequest.businessType}</p>
                    </div>
                    <div className="col-span-2">
                      <h4 className="font-semibold">Description</h4>
                      <p>{selectedRequest.description}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h4 className="font-semibold">Address</h4>
                      <p>
                        {selectedRequest.address}, {selectedRequest.city},{" "}
                        {selectedRequest.state} {selectedRequest.zipCode},{" "}
                        {selectedRequest.country}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Phone</h4>
                      <p>{selectedRequest.phone}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Email</h4>
                      <p>{selectedRequest.email}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Admin Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Admin Name</h4>
                      <p>{selectedRequest.adminName}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Admin Email</h4>
                      <p>{selectedRequest.adminEmail}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Plan & Status</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Current Plan</h4>
                      <StatusBadge type="plan" value={selectedRequest.plan} />
                    </div>
                    {(selectedRequest.requestType === "Plan Upgrade" ||
                      selectedRequest.requestType === "Plan Downgrade") && (
                      <div>
                        <h4 className="font-semibold">Requested Plan</h4>
                        <StatusBadge
                          type="plan"
                          value={selectedRequest.requestedPlan || ""}
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold">Status</h4>
                      <Badge
                        variant={
                          selectedRequest.status === "pending"
                            ? "secondary"
                            : selectedRequest.status === "approved"
                              ? "default"
                              : "destructive"
                        }
                      >
                        {selectedRequest.status}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <h4 className="font-semibold">Time</h4>
                      <p>{selectedRequest.time}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Request Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold">Request Type</h4>
                        <p>{selectedRequest.requestType}</p>
                      </div>
                      {(selectedRequest.requestType === "Add Service" ||
                        selectedRequest.requestType === "Remove Service") && (
                        <div>
                          <h4 className="font-semibold">Service</h4>
                          <p>{selectedRequest.requestedService}</p>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold">Additional Details</h4>
                        <p>{selectedRequest.details}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          {selectedRequest?.status === "pending" && (
            <DialogFooter className="p-6 pt-0">
              <Button
                variant="outline"
                onClick={() => handleDeny(selectedRequest.id)}
              >
                <X className="mr-2 h-4 w-4" />
                Deny
              </Button>
              <Button onClick={() => handleApprove(selectedRequest.id)}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
