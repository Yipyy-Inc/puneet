"use client";

import { useState, useMemo } from "react";
import {
  FolderOpen,
  Search,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Upload,
  Calendar,
  AlertTriangle,
  MoreHorizontal,
  Shield,
  CreditCard,
  Award,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  employeeDocuments as initialDocs,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type { EmployeeDocument } from "@/types/scheduling";

const typeIcons: Record<string, React.ElementType> = {
  work_permit: Shield,
  id_document: CreditCard,
  certification: Award,
  contract: FileText,
  tax_form: File,
  emergency_contact: FileText,
  health_record: FileText,
  other: File,
};

const typeLabels: Record<string, string> = {
  work_permit: "Work Permit",
  id_document: "ID Document",
  certification: "Certification",
  contract: "Contract",
  tax_form: "Tax Form",
  emergency_contact: "Emergency Contact",
  health_record: "Health Record",
  other: "Other",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<EmployeeDocument[]>(initialDocs);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  // Upload form
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<string>("other");
  const [docEmployee, setDocEmployee] = useState("");
  const [docExpires, setDocExpires] = useState("");
  const [docVisible, setDocVisible] = useState(true);

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (
        searchQuery &&
        !d.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !d.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (filterEmployee !== "all" && d.employeeId !== filterEmployee)
        return false;
      return true;
    });
  }, [documents, searchQuery, filterEmployee]);

  const handleUpload = () => {
    if (!docName.trim() || !docEmployee) return;
    const emp = scheduleEmployees.find((e) => e.id === docEmployee);
    const newDoc: EmployeeDocument = {
      id: `doc-${Date.now()}`,
      employeeId: docEmployee,
      employeeName: emp?.name || "",
      name: docName,
      type: docType as EmployeeDocument["type"],
      fileUrl: `/documents/${docEmployee}/${docName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      uploadedAt: new Date().toISOString().split("T")[0],
      expiresAt: docExpires || undefined,
      visibleToEmployee: docVisible,
      departmentId: emp?.departmentIds[0] || "",
    };
    setDocuments((prev) => [...prev, newDoc]);
    setUploadOpen(false);
    setDocName("");
    setDocType("other");
    setDocEmployee("");
    setDocExpires("");
    toast.success("Document uploaded");
  };

  const handleToggleVisibility = (docId: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, visibleToEmployee: !d.visibleToEmployee } : d,
      ),
    );
    toast.success("Visibility updated");
  };

  const handleDelete = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    toast.success("Document deleted");
  };

  // Expiration check
  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 90;
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Employee Documents
          </h2>
          <p className="text-muted-foreground text-sm">
            Store and manage employee documents with visibility controls
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-1.5 size-4" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-9"
          />
        </div>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {scheduleEmployees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {filtered.map((doc) => {
          const TypeIcon = typeIcons[doc.type] || File;
          const expired = isExpired(doc.expiresAt);
          const expiring = isExpiringSoon(doc.expiresAt);
          const dept = departments.find((d) => d.id === doc.departmentId);

          return (
            <Card
              key={doc.id}
              className="group transition-shadow hover:shadow-md"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                  <TypeIcon className="text-muted-foreground size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{doc.name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabels[doc.type] || doc.type}
                    </Badge>
                    {expired && (
                      <Badge className="bg-red-100 text-[10px] text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="mr-0.5 size-2.5" /> Expired
                      </Badge>
                    )}
                    {expiring && !expired && (
                      <Badge className="bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Calendar className="mr-0.5 size-2.5" /> Expiring Soon
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Avatar className="size-4">
                        <AvatarImage
                          src={
                            scheduleEmployees.find(
                              (e) => e.id === doc.employeeId,
                            )?.avatar
                          }
                          alt={doc.employeeName}
                        />
                        <AvatarFallback className="bg-slate-100 text-[6px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {
                            scheduleEmployees.find(
                              (e) => e.id === doc.employeeId,
                            )?.initials
                          }
                        </AvatarFallback>
                      </Avatar>
                      {doc.employeeName}
                    </span>
                    <span>Uploaded {doc.uploadedAt}</span>
                    {doc.expiresAt && <span>Expires {doc.expiresAt}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleVisibility(doc.id)}
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors ${
                      doc.visibleToEmployee
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {doc.visibleToEmployee ? (
                      <>
                        <Eye className="size-3" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3" /> Hidden
                      </>
                    )}
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center py-12 text-center">
            <FolderOpen className="mb-3 size-10 opacity-30" />
            <p className="font-medium">No documents found</p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Document Name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g., Work Permit"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={docEmployee} onValueChange={setDocEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {scheduleEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={docExpires}
                onChange={(e) => setDocExpires(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={docVisible} onCheckedChange={setDocVisible} />
              <Label className="text-sm">Visible to employee</Label>
            </div>
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Upload className="text-muted-foreground mx-auto mb-2 size-8" />
              <p className="text-muted-foreground text-sm">
                Click or drag file to upload
              </p>
              <p className="text-muted-foreground text-xs">
                PDF, JPG, PNG (max 10MB)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!docName.trim() || !docEmployee}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
