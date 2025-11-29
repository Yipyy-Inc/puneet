"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  User,
} from "lucide-react";
import { Lead, leadSourceLabels, expectedTierLabels } from "@/data/crm/leads";
import { salesTeamMembers } from "@/data/crm/sales-team";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  isDragging?: boolean;
}

const tierColors: Record<string, string> = {
  beginner: "bg-blue-100 text-blue-800",
  pro: "bg-purple-100 text-purple-800",
  enterprise: "bg-amber-100 text-amber-800",
  custom: "bg-emerald-100 text-emerald-800",
};

export function LeadCard({ lead, onClick, isDragging }: LeadCardProps) {
  const assignedRep = salesTeamMembers.find((m) => m.id === lead.assignedTo);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card
      className={`p-3 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? "opacity-50 rotate-2 shadow-lg" : ""
      }`}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {lead.facilityName}
            </h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <User className="h-3 w-3" />
              <span className="truncate">{lead.contactPerson}</span>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={`text-[10px] shrink-0 ${tierColors[lead.expectedTier]}`}
          >
            {expectedTierLabels[lead.expectedTier]}
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{lead.email}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{lead.phone}</span>
            </div>
          )}
        </div>

        {/* Value & Date */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-green-600 font-medium">
            <DollarSign className="h-3 w-3" />
            <span>${lead.estimatedAnnualValue.toLocaleString()}/yr</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(lead.expectedCloseDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant="outline" className="text-[10px]">
            {leadSourceLabels[lead.source]}
          </Badge>
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-muted-foreground">
              {lead.probability}%
            </div>
            {assignedRep && (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-primary/10">
                  {getInitials(assignedRep.name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
