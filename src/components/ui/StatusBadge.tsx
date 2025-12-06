"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  Crown,
  Shield,
  Key,
} from "lucide-react";

interface StatusBadgeProps {
  type:
    | "status"
    | "plan"
    | "role"
    | "inventory"
    | "adminRole"
    | "accessLevel"
    | "severity";
  value: string;
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
}

export function StatusBadge({
  type,
  value,
  size = "default",
  showIcon = false,
}: StatusBadgeProps) {
  const getVariant = () => {
    if (type === "status") {
      if (
        value === "active" ||
        value === "completed" ||
        value === "confirmed" ||
        value === "paid"
      )
        return "success";
      if (value === "pending") return "warning";
      if (value === "cancelled" || value === "inactive") return "secondary";
      if (value === "refunded") return "info";
      if (value === "suspended") return "destructive";
      return "secondary";
    }
    if (type === "inventory") {
      if (value === "in_stock") return "success";
      if (value === "low_stock") return "warning";
      if (value === "out_of_stock") return "destructive";
      return "secondary";
    }
    if (type === "role") {
      if (value === "Admin") return "default";
      if (value === "Manager") return "info";
      return "outline";
    }
    if (type === "adminRole") {
      if (value === "system_administrator") return "destructive";
      if (value === "account_manager") return "default";
      if (value === "sales_team") return "success";
      if (value === "technical_support") return "info";
      if (value === "financial_auditor") return "warning";
      return "outline";
    }
    if (type === "accessLevel") {
      if (value === "full") return "destructive";
      if (value === "read_write") return "default";
      if (value === "read_only") return "info";
      if (value === "restricted") return "secondary";
      return "outline";
    }
    if (type === "severity") {
      if (value === "high") return "destructive";
      if (value === "medium") return "warning";
      if (value === "low") return "success";
      return "secondary";
    }
    if (type === "plan") {
      if (value === "Free") return "outline";
      if (value === "Basic") return "secondary";
      if (value === "Premium") return "default";
      if (value === "Enterprise") return "destructive";
      return "outline";
    }
    return "outline";
  };

  const getIcon = () => {
    if (!showIcon) return null;
    if (type === "status") {
      return value === "active" ? (
        <CheckCircle className="w-3 h-3 mr-1" />
      ) : (
        <XCircle className="w-3 h-3 mr-1" />
      );
    }
    if (type === "plan") {
      if (value === "Enterprise") return <Crown className="w-3 h-3 mr-1" />;
      return <CreditCard className="w-3 h-3 mr-1" />;
    }
    if (type === "adminRole") {
      return <Shield className="w-3 h-3 mr-1" />;
    }
    if (type === "accessLevel") {
      return <Key className="w-3 h-3 mr-1" />;
    }
    return null;
  };

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "text-xs px-2 py-0.5";
      case "lg":
        return "text-base px-3 py-1";
      default:
        return "text-sm px-2.5 py-0.5";
    }
  };

  const getDisplayValue = () => {
    if (type === "status") {
      const statusMap: Record<string, string> = {
        active: "Active",
        inactive: "Inactive",
        pending: "Pending",
        approved: "Approved",
        denied: "Denied",
        suspended: "Suspended",
        online: "Online",
        offline: "Offline",
        busy: "Busy",
        available: "Available",
        completed: "Completed",
        confirmed: "Confirmed",
        cancelled: "Cancelled",
        paid: "Paid",
        refunded: "Refunded",
      };
      return statusMap[value.toLowerCase()] || value;
    }
    if (type === "plan") {
      const planMap: Record<string, string> = {
        free: "Free",
        basic: "Basic",
        premium: "Premium",
        enterprise: "Enterprise",
      };
      return planMap[value.toLowerCase()] || value;
    }
    if (type === "role") {
      if (value === "Super Admin") return "Super Admin";
      if (value === "Facility Admin" || value === "Admin")
        return "Facility Admin";
      if (value === "Manager") return "Manager";
      if (value === "Staff") return "Staff";
      if (value === "Customer") return "Customer";
      return value;
    }
    if (type === "adminRole") {
      if (value === "sales_team") return "Sales Team";
      if (value === "technical_support") return "Technical Support";
      if (value === "account_manager") return "Account Manager";
      if (value === "financial_auditor") return "Financial Auditor";
      if (value === "system_administrator") return "System Administrator";
      return value;
    }
    if (type === "accessLevel") {
      if (value === "full") return "Full Access";
      if (value === "read_write") return "Read/Write Access";
      if (value === "read_only") return "Read Only Access";
      if (value === "restricted") return "Restricted Access";
      return value;
    }
    if (type === "severity") {
      if (value === "high") return "High";
      if (value === "medium") return "Medium";
      if (value === "low") return "Low";
      return value;
    }
    return value;
  };

  return (
    <Badge variant={getVariant()} className={getSizeClass()}>
      {getIcon()}
      {getDisplayValue()}
    </Badge>
  );
}
