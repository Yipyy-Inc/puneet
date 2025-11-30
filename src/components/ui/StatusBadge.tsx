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
import { useTranslations } from "next-intl";

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
  const tStatus = useTranslations("status");
  const tPlans = useTranslations("plans");
  const tRoles = useTranslations("userRoles");
  const tAdminRoles = useTranslations("adminRoles");
  const tUserMgmt = useTranslations("userManagement");

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

  const getTranslatedValue = () => {
    if (type === "status") {
      const statusKey = value.toLowerCase() as
        | "active"
        | "inactive"
        | "pending"
        | "approved"
        | "denied"
        | "suspended"
        | "online"
        | "offline"
        | "busy"
        | "available"
        | "completed"
        | "confirmed"
        | "cancelled"
        | "paid"
        | "refunded";
      return tStatus(statusKey);
    }
    if (type === "plan") {
      const planKey = value.toLowerCase() as
        | "free"
        | "basic"
        | "premium"
        | "enterprise";
      return tPlans(planKey);
    }
    if (type === "role") {
      if (value === "Super Admin") return tRoles("superAdmin");
      if (value === "Facility Admin" || value === "Admin")
        return tRoles("facilityAdmin");
      if (value === "Manager") return tRoles("manager");
      if (value === "Staff") return tRoles("staff");
      if (value === "Customer") return tRoles("customer");
      return value;
    }
    if (type === "adminRole") {
      if (value === "sales_team") return tAdminRoles("salesTeam");
      if (value === "technical_support") return tAdminRoles("technicalSupport");
      if (value === "account_manager") return tAdminRoles("accountManager");
      if (value === "financial_auditor") return tAdminRoles("financialAuditor");
      if (value === "system_administrator")
        return tAdminRoles("systemAdministrator");
      return value;
    }
    if (type === "accessLevel") {
      if (value === "full") return tUserMgmt("fullAccess");
      if (value === "read_write") return tUserMgmt("readWriteAccess");
      if (value === "read_only") return tUserMgmt("readOnlyAccess");
      if (value === "restricted") return tUserMgmt("restrictedAccess");
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
      {getTranslatedValue()}
    </Badge>
  );
}
