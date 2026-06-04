import type {
  CallRoutingRule,
  RoutingField,
  RoutingOperator,
} from "@/types/calling";

// ============================================================
// Smart routing-rule metadata + display helpers.
// Single source of truth for which operators/values each CRM
// field supports, the staff groups a rule can target, and the
// human-readable summaries shown in the builder.
// ============================================================

/** Staff groups a rule can route to. */
export const STAFF_GROUPS = [
  { id: "grp-management", name: "Management" },
  { id: "grp-reception", name: "Reception Team" },
  { id: "grp-billing", name: "Billing Team" },
  { id: "grp-vet", name: "Vet Team" },
  { id: "grp-grooming", name: "Grooming Team" },
  { id: "grp-boarding", name: "Boarding Team" },
] as const;

/** Client tags sourced from the CRM (mirrors the active-call tag set). */
export const CLIENT_TAG_OPTIONS = [
  { value: "vip", label: "VIP" },
  { value: "high_maintenance", label: "High-Maintenance" },
  { value: "frequent_no_show", label: "Frequent No-Show" },
  { value: "allergy_alert", label: "Allergy Alert" },
  { value: "aggression_flag", label: "Aggression Flag" },
] as const;

export const SERVICE_TYPE_OPTIONS = [
  { value: "grooming", label: "Grooming" },
  { value: "boarding", label: "Boarding" },
  { value: "daycare", label: "Daycare" },
  { value: "training", label: "Training" },
  { value: "veterinary", label: "Veterinary" },
  { value: "retail", label: "Retail" },
] as const;

export type RoutingValueType = "tag" | "number" | "service" | "none";

interface RoutingFieldConfig {
  label: string;
  /** Operators valid for this field, in display order. */
  operators: RoutingOperator[];
  valueType: RoutingValueType;
}

export const ROUTING_FIELD_META: Record<RoutingField, RoutingFieldConfig> = {
  clientTags: {
    label: "Client tag",
    operators: ["includes", "excludes"],
    valueType: "tag",
  },
  outstandingBalance: {
    label: "Outstanding balance",
    operators: ["gt", "lt", "eq"],
    valueType: "number",
  },
  careAlerts: {
    label: "Care alert",
    operators: ["has_any"],
    valueType: "none",
  },
  lastServiceType: {
    label: "Last service type",
    operators: ["eq", "excludes"],
    valueType: "service",
  },
  isNewClient: {
    label: "New client",
    operators: ["is_true", "is_false"],
    valueType: "none",
  },
};

export const ROUTING_FIELD_OPTIONS = (
  Object.keys(ROUTING_FIELD_META) as RoutingField[]
).map((field) => ({ value: field, label: ROUTING_FIELD_META[field].label }));

export const ROUTING_OPERATOR_LABEL: Record<RoutingOperator, string> = {
  includes: "includes",
  excludes: "does not include",
  gt: "is greater than",
  lt: "is less than",
  eq: "equals",
  has_any: "exists",
  is_true: "is true",
  is_false: "is false",
};

export const ROUTING_TARGET_LABEL = {
  staff_group: "Staff group",
  staff: "Specific staff member",
  voicemail: "Send to voicemail",
  operator: "Route to operator",
} as const;

export function staffGroupName(id?: string): string {
  return STAFF_GROUPS.find((g) => g.id === id)?.name ?? "a staff group";
}

function tagLabel(value: string): string {
  return CLIENT_TAG_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

function serviceLabel(value: string): string {
  return SERVICE_TYPE_OPTIONS.find((s) => s.value === value)?.label ?? value;
}

/** Human-readable "If …" summary for a rule's condition. */
export function describeCondition(c: CallRoutingRule["condition"]): string {
  switch (c.field) {
    case "careAlerts":
      return "A care alert exists on the profile";
    case "isNewClient":
      return c.operator === "is_true"
        ? "Caller is a new client"
        : "Caller is a returning client";
    case "clientTags":
      return `Client tag ${ROUTING_OPERATOR_LABEL[c.operator]} ${tagLabel(c.value)}`;
    case "lastServiceType":
      return `Last service ${ROUTING_OPERATOR_LABEL[c.operator]} ${serviceLabel(c.value)}`;
    case "outstandingBalance":
      return `Outstanding balance ${ROUTING_OPERATOR_LABEL[c.operator]} $${c.value || "0"}`;
  }
}

/** Human-readable "Then route to …" summary for a rule's action. */
export function describeAction(
  a: CallRoutingRule["action"],
  staffName?: string,
): string {
  switch (a.routeTo) {
    case "staff_group":
      return `Route to ${staffGroupName(a.staffGroupId)}`;
    case "staff":
      return `Route to ${staffName ?? "a staff member"}`;
    case "voicemail":
      return "Send to voicemail";
    case "operator":
      return "Route to an operator";
  }
}

/** A fresh, sensible default rule for the "Add Rule" action. */
export function makeDefaultRoutingRule(
  id: string,
  priority: number,
): CallRoutingRule {
  return {
    id,
    name: "New routing rule",
    condition: { field: "clientTags", operator: "includes", value: "vip" },
    action: { routeTo: "staff_group", staffGroupId: "grp-management" },
    priority,
    enabled: true,
  };
}

/**
 * When the condition field changes, reset the operator to the first one the
 * new field supports and clear the value to a sensible default for its type.
 */
export function resetConditionForField(
  field: RoutingField,
): CallRoutingRule["condition"] {
  const meta = ROUTING_FIELD_META[field];
  const value =
    meta.valueType === "tag"
      ? CLIENT_TAG_OPTIONS[0].value
      : meta.valueType === "service"
        ? SERVICE_TYPE_OPTIONS[0].value
        : meta.valueType === "number"
          ? "0"
          : "";
  return { field, operator: meta.operators[0], value };
}
