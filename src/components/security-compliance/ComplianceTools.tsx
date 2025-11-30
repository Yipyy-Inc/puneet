"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Database,
  Lock,
  Settings,
  Eye,
  Download,
  RefreshCw,
  Award,
  FileCheck,
  Trash2,
  FileOutput,
  UserX,
  Play,
  Mail,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  gdprCompliance,
  dataProtectionSettings,
  privacyPolicies,
  userConsents,
  complianceFrameworks,
  complianceReports,
  certificates,
  auditTrails,
  dataSubjectRequests,
  dataSubjectRequestStats,
  type GDPRCompliance,
  type DataProtectionSetting,
  type PrivacyPolicy,
  type UserConsent,
  type ComplianceFramework,
  type ComplianceReport,
  type Certificate,
  type AuditTrail,
  type DataSubjectRequest,
} from "@/data/security-compliance";

export function ComplianceTools() {
  // Badge helpers
  const getComplianceStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Compliant: "default",
      "Partially Compliant": "outline",
      "Non-Compliant": "destructive",
      "In Progress": "secondary",
    };
    const icons: Record<string, any> = {
      Compliant: CheckCircle2,
      "Partially Compliant": AlertTriangle,
      "Non-Compliant": XCircle,
      "In Progress": RefreshCw,
    };
    const Icon = icons[status] || CheckCircle2;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Low: "secondary",
      Medium: "outline",
      High: "default",
      Critical: "destructive",
    };
    return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
  };

  const getPolicyStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Active: "default",
      Draft: "outline",
      Archived: "secondary",
      "Under Review": "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getConsentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Active: "default",
      Revoked: "destructive",
      Expired: "secondary",
    };
    const icons: Record<string, any> = {
      Active: CheckCircle2,
      Revoked: XCircle,
      Expired: Clock,
    };
    const Icon = icons[status] || CheckCircle2;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getCertificateStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      Valid: "default",
      "Expiring Soon": "outline",
      Expired: "destructive",
      Revoked: "destructive",
    };
    const icons: Record<string, any> = {
      Valid: CheckCircle2,
      "Expiring Soon": AlertTriangle,
      Expired: XCircle,
      Revoked: XCircle,
    };
    const Icon = icons[status] || CheckCircle2;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // GDPR Compliance Columns - Consolidated
  const gdprColumns = [
    {
      key: "complianceArea",
      label: "Area / Requirement",
      render: (item: GDPRCompliance) => (
        <div className="min-w-0">
          <div className="font-medium">{item.complianceArea}</div>
          <div className="text-xs text-muted-foreground">
            {item.requirement}
          </div>
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: GDPRCompliance) => (
        <div className="space-y-1">
          {getComplianceStatusBadge(item.status)}
          <div className="mt-1">{getPriorityBadge(item.priority)}</div>
        </div>
      ),
    },
    {
      key: "nextAuditDue",
      label: "Audit / Owner",
      render: (item: GDPRCompliance) => (
        <div className="text-sm">
          <div>{new Date(item.nextAuditDue).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {item.responsiblePerson}
          </div>
        </div>
      ),
    },
  ];

  const gdprActions = (item: GDPRCompliance) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Eye className="h-4 w-4" />
      </Button>
      {item.documentationUrl && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // Data Protection Settings Columns - Consolidated
  const dataProtectionColumns = [
    {
      key: "settingName",
      label: "Setting",
      render: (item: DataProtectionSetting) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{item.settingName}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {item.description}
          </div>
          <Badge variant="outline" className="text-xs mt-1">
            {item.category}
          </Badge>
        </div>
      ),
    },
    {
      key: "currentValue",
      label: "Value",
      render: (item: DataProtectionSetting) => (
        <div className="text-sm">
          {typeof item.currentValue === "boolean" ? (
            <Switch checked={item.currentValue} disabled />
          ) : (
            <code className="px-2 py-1 bg-muted rounded text-xs">
              {String(item.currentValue).substring(0, 15)}
            </code>
          )}
        </div>
      ),
    },
    {
      key: "isCompliant",
      label: "Status",
      render: (item: DataProtectionSetting) => (
        <div className="space-y-1">
          {item.isCompliant ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              OK
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              No
            </Badge>
          )}
          <div className="mt-1">{getPriorityBadge(item.impact)}</div>
        </div>
      ),
    },
  ];

  const dataProtectionActions = (item: DataProtectionSetting) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Settings className="h-4 w-4" />
      </Button>
      {!item.isCompliant && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <AlertTriangle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // Privacy Policies Columns - Consolidated
  const privacyPolicyColumns = [
    {
      key: "policyName",
      label: "Policy",
      render: (item: PrivacyPolicy) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{item.policyName}</div>
          <div className="text-xs text-muted-foreground">
            v{item.version} ·{" "}
            {new Date(item.effectiveDate).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: PrivacyPolicy) => getPolicyStatusBadge(item.status),
    },
    {
      key: "jurisdiction",
      label: "Jurisdiction",
      render: (item: PrivacyPolicy) => (
        <div className="flex flex-wrap gap-1">
          {item.jurisdiction.slice(0, 2).map((j) => (
            <Badge key={j} variant="outline" className="text-xs">
              {j}
            </Badge>
          ))}
          {item.jurisdiction.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{item.jurisdiction.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "acceptanceCount",
      label: "Users",
      render: (item: PrivacyPolicy) => (
        <div className="text-sm">{item.acceptanceCount.toLocaleString()}</div>
      ),
    },
  ];

  const privacyPolicyActions = (item: PrivacyPolicy) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Eye className="h-4 w-4" />
      </Button>
      {item.status === "Active" && (
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // User Consents Columns - Consolidated
  const userConsentColumns = [
    {
      key: "userName",
      label: "User",
      render: (item: UserConsent) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{item.userName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {item.userEmail}
          </div>
        </div>
      ),
    },
    {
      key: "consentType",
      label: "Type / Channel",
      render: (item: UserConsent) => (
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs">
            {item.consentType}
          </Badge>
          <div>
            <Badge variant="outline" className="text-xs">
              {item.communicationChannel}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: "consentGiven",
      label: "Consent",
      render: (item: UserConsent) =>
        item.consentGiven ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Yes
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            No
          </Badge>
        ),
    },
    {
      key: "status",
      label: "Status / Date",
      render: (item: UserConsent) => (
        <div className="space-y-1">
          {getConsentStatusBadge(item.status)}
          <div className="text-xs text-muted-foreground">
            {item.consentedAt
              ? new Date(item.consentedAt).toLocaleDateString()
              : item.revokedAt
                ? new Date(item.revokedAt).toLocaleDateString()
                : "N/A"}
          </div>
        </div>
      ),
    },
  ];

  // Compliance Frameworks Columns
  const frameworkColumns = [
    {
      key: "frameworkName",
      label: "Framework",
      render: (item: ComplianceFramework) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            <Award className="h-4 w-4" />
            {item.frameworkName}
          </div>
          <div className="text-xs text-muted-foreground">{item.industry}</div>
        </div>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      render: (item: ComplianceFramework) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>
              {item.completedRequirements}/{item.requirements}
            </span>
            <span className="font-medium">{item.complianceScore}%</span>
          </div>
          <Progress value={item.complianceScore} className="h-2" />
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: ComplianceFramework) =>
        getComplianceStatusBadge(item.status),
    },
    {
      key: "certificationDate",
      label: "Certification",
      render: (item: ComplianceFramework) =>
        item.certificationDate ? (
          <div className="text-sm">
            {new Date(item.certificationDate).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Not Certified</span>
        ),
    },
    {
      key: "nextAuditDate",
      label: "Next Audit",
      render: (item: ComplianceFramework) => (
        <div className="text-sm">
          {new Date(item.nextAuditDate).toLocaleDateString()}
        </div>
      ),
    },
  ];

  const frameworkActions = (item: ComplianceFramework) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-1">
        <Eye className="h-4 w-4" />
        Details
      </Button>
      {item.documentationUrl && (
        <Button variant="ghost" size="sm" className="gap-1">
          <Download className="h-4 w-4" />
          Cert
        </Button>
      )}
    </div>
  );

  // Compliance Reports Columns
  const reportColumns = [
    {
      key: "reportName",
      label: "Report",
      render: (item: ComplianceReport) => (
        <div>
          <div className="font-medium">{item.reportName}</div>
          <div className="text-xs text-muted-foreground">{item.reportType}</div>
        </div>
      ),
    },
    {
      key: "framework",
      label: "Framework",
      render: (item: ComplianceReport) => (
        <div className="flex flex-wrap gap-1">
          {item.framework.map((f) => (
            <Badge key={f} variant="outline" className="text-xs">
              {f}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "period",
      label: "Period",
      render: (item: ComplianceReport) => (
        <div className="text-sm">{item.period}</div>
      ),
    },
    {
      key: "findings",
      label: "Findings",
      render: (item: ComplianceReport) => (
        <div className="text-sm">
          <span className="font-medium">{item.findings}</span> total
          {item.criticalFindings > 0 && (
            <span className="text-destructive ml-1">
              ({item.criticalFindings} critical)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "complianceScore",
      label: "Score",
      render: (item: ComplianceReport) => (
        <div className="text-sm font-medium">{item.complianceScore}%</div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: ComplianceReport) => getPolicyStatusBadge(item.status),
    },
  ];

  const reportActions = (item: ComplianceReport) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-1">
        <Eye className="h-4 w-4" />
        View
      </Button>
      {item.status === "Final" && (
        <Button variant="ghost" size="sm" className="gap-1">
          <Download className="h-4 w-4" />
          Export
        </Button>
      )}
    </div>
  );

  // Certificates Columns
  const certificateColumns = [
    {
      key: "certificateName",
      label: "Certificate",
      render: (item: Certificate) => (
        <div>
          <div className="font-medium">{item.certificateName}</div>
          <div className="text-xs text-muted-foreground">
            {item.certificateType}
          </div>
        </div>
      ),
    },
    {
      key: "issuer",
      label: "Issuer",
      render: (item: Certificate) => (
        <div className="text-sm">{item.issuer}</div>
      ),
    },
    {
      key: "expiresAt",
      label: "Expires",
      render: (item: Certificate) => (
        <div>
          <div className="text-sm">
            {new Date(item.expiresAt).toLocaleDateString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.daysUntilExpiry > 0
              ? `${item.daysUntilExpiry} days remaining`
              : `Expired ${Math.abs(item.daysUntilExpiry)} days ago`}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: Certificate) => getCertificateStatusBadge(item.status),
    },
    {
      key: "autoRenew",
      label: "Auto-Renew",
      render: (item: Certificate) => (
        <Switch checked={item.autoRenew} disabled />
      ),
    },
  ];

  const certificateActions = (item: Certificate) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" className="gap-1">
        <Eye className="h-4 w-4" />
        Details
      </Button>
      {item.status === "Expiring Soon" && (
        <Button variant="ghost" size="sm" className="gap-1">
          <RefreshCw className="h-4 w-4" />
          Renew
        </Button>
      )}
    </div>
  );

  // Data Subject Request Status Badge
  const getDSRStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Pending: "secondary",
      "In Progress": "outline",
      Completed: "default",
      Rejected: "destructive",
      Extended: "outline",
    };
    const icons: Record<string, any> = {
      Pending: Clock,
      "In Progress": RefreshCw,
      Completed: CheckCircle2,
      Rejected: XCircle,
      Extended: Clock,
    };
    const colors: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-700",
      "In Progress": "bg-blue-100 text-blue-700",
      Completed: "bg-green-100 text-green-700",
      Rejected: "bg-red-100 text-red-700",
      Extended: "bg-orange-100 text-orange-700",
    };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant={variants[status] || "secondary"} className={`gap-1 ${colors[status] || ""}`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getDSRTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      Export: "bg-blue-100 text-blue-700",
      Deletion: "bg-red-100 text-red-700",
      Rectification: "bg-purple-100 text-purple-700",
      Restriction: "bg-orange-100 text-orange-700",
      Objection: "bg-gray-100 text-gray-700",
    };
    const icons: Record<string, any> = {
      Export: FileOutput,
      Deletion: Trash2,
      Rectification: Settings,
      Restriction: Lock,
      Objection: AlertTriangle,
    };
    const Icon = icons[type] || FileText;
    return (
      <Badge variant="secondary" className={`gap-1 ${colors[type] || ""}`}>
        <Icon className="h-3 w-3" />
        {type}
      </Badge>
    );
  };

  const getVerificationBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Verified: "default",
      Pending: "secondary",
      Failed: "destructive",
    };
    const icons: Record<string, any> = {
      Verified: CheckCircle2,
      Pending: Clock,
      Failed: XCircle,
    };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant={variants[status] || "secondary"} className="gap-1 text-xs">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // Data Subject Request Columns
  const dataSubjectRequestColumns = [
    {
      key: "requesterName",
      label: "Requester",
      render: (item: DataSubjectRequest) => (
        <div className="min-w-0">
          <div className="font-medium">{item.requesterName}</div>
          <div className="text-xs text-muted-foreground truncate">{item.requesterEmail}</div>
          {item.facilityName && (
            <div className="text-xs text-muted-foreground">{item.facilityName}</div>
          )}
        </div>
      ),
    },
    {
      key: "requestType",
      label: "Type",
      render: (item: DataSubjectRequest) => getDSRTypeBadge(item.requestType),
    },
    {
      key: "status",
      label: "Status",
      render: (item: DataSubjectRequest) => (
        <div className="space-y-1">
          {getDSRStatusBadge(item.status)}
          <div className="text-xs text-muted-foreground">
            {getVerificationBadge(item.verificationStatus)}
          </div>
        </div>
      ),
    },
    {
      key: "dataCategories",
      label: "Data Categories",
      render: (item: DataSubjectRequest) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {item.dataCategories.slice(0, 2).map((cat) => (
            <Badge key={cat} variant="outline" className="text-xs">
              {cat}
            </Badge>
          ))}
          {item.dataCategories.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{item.dataCategories.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "submittedAt",
      label: "Submitted",
      render: (item: DataSubjectRequest) => (
        <div className="text-sm">
          <div>{new Date(item.submittedAt).toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            Due: {new Date(item.deadline).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      render: (item: DataSubjectRequest) => (
        <div className="text-sm">
          {item.assignedTo || <span className="text-muted-foreground">Unassigned</span>}
        </div>
      ),
    },
  ];

  const dataSubjectRequestActions = (item: DataSubjectRequest) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="View Details">
        <Eye className="h-4 w-4" />
      </Button>
      {item.status === "Pending" && (
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Process Request">
          <Play className="h-4 w-4" />
        </Button>
      )}
      {item.status === "Completed" && item.requestType === "Export" && item.exportFileUrl && (
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Download Export">
          <Download className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Send Notification">
        <Mail className="h-4 w-4" />
      </Button>
    </div>
  );

  // Audit Trail Columns
  const auditTrailColumns = [
    {
      key: "eventType",
      label: "Event",
      render: (item: AuditTrail) => (
        <div>
          <Badge variant="outline">{item.eventType}</Badge>
          <div className="text-xs text-muted-foreground mt-1">
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: "userName",
      label: "User",
      render: (item: AuditTrail) => (
        <div>
          <div className="font-medium">{item.userName}</div>
          <div className="text-xs text-muted-foreground">{item.userRole}</div>
        </div>
      ),
    },
    {
      key: "resource",
      label: "Resource",
      render: (item: AuditTrail) => (
        <div>
          <div className="text-sm">{item.resource}</div>
          <Badge variant="outline" className="text-xs mt-1">
            {item.action}
          </Badge>
        </div>
      ),
    },
    {
      key: "timestamp",
      label: "Timestamp",
      render: (item: AuditTrail) => (
        <div className="text-sm">
          {new Date(item.timestamp).toLocaleString()}
        </div>
      ),
    },
    {
      key: "result",
      label: "Result",
      render: (item: AuditTrail) => (
        <Badge
          variant={
            item.result === "Success"
              ? "default"
              : item.result === "Failed"
                ? "destructive"
                : "secondary"
          }
        >
          {item.result}
        </Badge>
      ),
    },
    {
      key: "dataClassification",
      label: "Classification",
      render: (item: AuditTrail) => (
        <Badge variant="outline" className="text-xs">
          {item.dataClassification}
        </Badge>
      ),
    },
  ];

  // Calculate compliance stats
  const totalCompliantAreas = gdprCompliance.filter(
    (g) => g.status === "Compliant",
  ).length;
  const totalNonCompliantSettings = dataProtectionSettings.filter(
    (s) => !s.isCompliant,
  ).length;
  const avgComplianceScore =
    complianceFrameworks.reduce((acc, f) => acc + f.complianceScore, 0) /
    complianceFrameworks.length;
  const expiringCerts = certificates.filter(
    (c) => c.daysUntilExpiry <= 30 && c.daysUntilExpiry > 0,
  ).length;

  const frameworkScores = complianceFrameworks.map((f) => ({
    name: f.frameworkName,
    score: f.complianceScore,
    completed: f.completedRequirements,
    total: f.requirements,
  }));

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Compliance Tools</h3>
          <p className="text-sm text-muted-foreground">
            Manage data privacy and regulatory compliance requirements
          </p>
        </div>
      </div>

      {/* Compliance Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Compliance Score
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {Math.round(avgComplianceScore)}%
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Average across all frameworks
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-linear-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                <Award className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  GDPR Compliant
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {totalCompliantAreas}/{gdprCompliance.length}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compliance areas
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-linear-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Non-Compliant
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {totalNonCompliantSettings}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Settings need attention
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-linear-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Expiring Certificates
                </p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {expiringCerts}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Within 30 days
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-linear-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="data-subject-requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="data-subject-requests">
            GDPR Requests
          </TabsTrigger>
          <TabsTrigger value="data-privacy">Data Privacy</TabsTrigger>
          <TabsTrigger value="regulatory-compliance">
            Regulatory Compliance
          </TabsTrigger>
        </TabsList>

        {/* Data Subject Requests Tab (GDPR Export/Delete) */}
        <TabsContent value="data-subject-requests" className="space-y-6">
          {/* DSR Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Total Requests
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {dataSubjectRequestStats.totalRequests}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dataSubjectRequestStats.thisMonthRequests} this month
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-linear-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Pending
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight text-yellow-600">
                      {dataSubjectRequestStats.pendingRequests}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dataSubjectRequestStats.inProgressRequests} in progress
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-linear-to-br from-yellow-500/20 to-yellow-600/20 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Compliance Rate
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight text-green-600">
                      {dataSubjectRequestStats.complianceRate}%
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Avg {dataSubjectRequestStats.avgCompletionDays} days to complete
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-linear-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Overdue
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight text-red-600">
                      {dataSubjectRequestStats.overdueRequests}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      30-day GDPR deadline
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-linear-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request Type Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileOutput className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data Export Requests</p>
                    <p className="text-xl font-bold">{dataSubjectRequestStats.exportRequests}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Right to Data Portability (Article 20)
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <UserX className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data Deletion Requests</p>
                    <p className="text-xl font-bold">{dataSubjectRequestStats.deletionRequests}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Right to Erasure (Article 17)
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rectification Requests</p>
                    <p className="text-xl font-bold">{dataSubjectRequestStats.rectificationRequests}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Right to Rectification (Article 16)
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Subject Requests Table */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Subject Requests (GDPR Export/Delete)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage user data export and deletion requests per GDPR requirements
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={dataSubjectRequestColumns as any}
                data={dataSubjectRequests as any}
                actions={dataSubjectRequestActions as any}
                searchKey="requesterName"
                searchPlaceholder="Search by name or email..."
              />
            </CardContent>
          </Card>

          {/* GDPR Articles Reference */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0 shadow-card bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileOutput className="h-4 w-4 text-blue-600" />
                  Article 20 - Right to Data Portability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Users have the right to receive their personal data in a structured,
                  commonly used, machine-readable format and transmit it to another controller.
                  Requests must be fulfilled within <strong>30 days</strong>.
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline" className="text-xs">JSON Export</Badge>
                  <Badge variant="outline" className="text-xs">CSV Export</Badge>
                  <Badge variant="outline" className="text-xs">ZIP Archive</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  Article 17 - Right to Erasure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Users have the right to request deletion of their personal data when
                  it is no longer necessary, consent is withdrawn, or data was unlawfully processed.
                  Requests must be fulfilled within <strong>30 days</strong>.
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline" className="text-xs">Data Deletion</Badge>
                  <Badge variant="outline" className="text-xs">Anonymization</Badge>
                  <Badge variant="outline" className="text-xs">Audit Log</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Privacy Tab */}
        <TabsContent
          value="data-privacy"
          className="space-y-6 overflow-x-hidden"
        >
          {/* GDPR Compliance */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                GDPR Compliance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track compliance with GDPR requirements
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={gdprColumns as any}
                data={gdprCompliance as any}
                actions={gdprActions as any}
              />
            </CardContent>
          </Card>

          {/* Data Protection Settings */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Data Protection Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure data protection and security settings
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={dataProtectionColumns as any}
                data={dataProtectionSettings as any}
                actions={dataProtectionActions as any}
              />
            </CardContent>
          </Card>

          {/* Privacy Policies */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Privacy Policy Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage privacy policies and user agreements
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={privacyPolicyColumns as any}
                data={privacyPolicies as any}
                actions={privacyPolicyActions as any}
              />
            </CardContent>
          </Card>

          {/* User Consent Tracking */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Consent Tracking
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor user consent for data processing and communications
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={userConsentColumns as any}
                data={userConsents as any}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regulatory Compliance Tab */}
        <TabsContent value="regulatory-compliance" className="space-y-6">
          {/* Compliance Frameworks Chart */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Compliance Framework Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={frameworkScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {frameworkScores.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Compliance Frameworks */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Award className="h-5 w-5" />
                Compliance Frameworks
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Industry-specific compliance standards and certifications
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={frameworkColumns as any}
                data={complianceFrameworks as any}
                actions={frameworkActions as any}
              />
            </CardContent>
          </Card>

          {/* Compliance Reports */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Compliance Reports
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Audit reports and compliance assessments
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={reportColumns as any}
                data={complianceReports as any}
                actions={reportActions as any}
              />
            </CardContent>
          </Card>

          {/* Certificates */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Certificate Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                SSL/TLS and other security certificates
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={certificateColumns as any}
                data={certificates as any}
                actions={certificateActions as any}
              />
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Audit Trail Maintenance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compliance-relevant audit logs and activity tracking
              </p>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={auditTrailColumns as any}
                data={auditTrails as any}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
