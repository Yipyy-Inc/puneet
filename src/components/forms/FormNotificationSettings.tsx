"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellRing,
  Users,
  ShieldAlert,
  FileText,
  Paperclip,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { facilityConfig } from "@/data/facility-config";

interface NotifToggle {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export function FormNotificationSettings() {
  const initial = facilityConfig.notifications?.forms;

  const [staffToggles, setStaffToggles] = useState<NotifToggle[]>([
    {
      key: "newSubmission",
      label: "New submission received",
      description: "Alert staff when any new form submission comes in",
      icon: <FileText className="h-4 w-4 text-blue-600" />,
      enabled: initial?.staff?.newSubmission ?? true,
    },
    {
      key: "redFlagAnswers",
      label: "Red-flag answers detected",
      description: "Alert when a submission triggers a logic rule alert flag (e.g. aggression, health concern)",
      icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
      enabled: initial?.staff?.redFlagAnswers ?? true,
    },
    {
      key: "hasFileUpload",
      label: "Submission includes file upload",
      description: "Alert when a submission contains file attachments (vaccine records, documents)",
      icon: <Paperclip className="h-4 w-4 text-amber-600" />,
      enabled: initial?.staff?.hasFileUpload ?? true,
    },
  ]);

  const [customerToggles, setCustomerToggles] = useState<NotifToggle[]>([
    {
      key: "submissionConfirmed",
      label: "Submission confirmed",
      description: "Notify customer when staff marks their submission as processed/confirmed",
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      enabled: initial?.customer?.submissionConfirmed ?? true,
    },
    {
      key: "missingRequiredFormsReminder",
      label: "Missing required forms reminder",
      description: "Send reminder when customer has outstanding required forms before a booking",
      icon: <Clock className="h-4 w-4 text-amber-600" />,
      enabled: initial?.customer?.missingRequiredFormsReminder ?? true,
    },
    {
      key: "formRejectedNeedsCorrection",
      label: "Form rejected / needs correction",
      description: "Notify customer when their submission is rejected and needs changes",
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      enabled: initial?.customer?.formRejectedNeedsCorrection ?? true,
    },
  ]);

  const toggleStaff = (key: string) => {
    setStaffToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const toggleCustomer = (key: string) => {
    setCustomerToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleSave = () => {
    toast.success("Form notification settings saved");
  };

  const activeStaffCount = staffToggles.filter((t) => t.enabled).length;
  const activeCustomerCount = customerToggles.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Form Notifications</CardTitle>
            </div>
            <Button size="sm" onClick={handleSave}>
              Save changes
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure when staff and customers are notified about form activity.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Staff notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BellRing className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Notify staff when</h3>
              <Badge variant="secondary" className="text-xs">
                {activeStaffCount}/{staffToggles.length} active
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 gap-1 ml-auto">
                <Bell className="h-3 w-3" />
                In-app
              </Badge>
            </div>
            <div className="space-y-3">
              {staffToggles.map((toggle) => (
                <div
                  key={toggle.key}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    toggle.enabled ? "bg-white" : "bg-muted/20"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{toggle.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium cursor-pointer" htmlFor={`staff-${toggle.key}`}>
                        {toggle.label}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{toggle.description}</p>
                  </div>
                  <Switch
                    id={`staff-${toggle.key}`}
                    checked={toggle.enabled}
                    onCheckedChange={() => toggleStaff(toggle.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Customer notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Notify customer when</h3>
              <Badge variant="secondary" className="text-xs">
                {activeCustomerCount}/{customerToggles.length} active
              </Badge>
              <div className="flex gap-1 ml-auto">
                <Badge variant="outline" className="text-[10px] h-5 gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Badge>
                <Badge variant="outline" className="text-[10px] h-5 gap-1">
                  <MessageSquare className="h-3 w-3" />
                  SMS
                </Badge>
              </div>
            </div>
            <div className="space-y-3">
              {customerToggles.map((toggle) => (
                <div
                  key={toggle.key}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    toggle.enabled ? "bg-white" : "bg-muted/20"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{toggle.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium cursor-pointer" htmlFor={`cust-${toggle.key}`}>
                        {toggle.label}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{toggle.description}</p>
                  </div>
                  <Switch
                    id={`cust-${toggle.key}`}
                    checked={toggle.enabled}
                    onCheckedChange={() => toggleCustomer(toggle.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
