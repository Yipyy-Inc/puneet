"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Download,
  AlertCircle,
} from "lucide-react";
import { digitalWaivers, waiverSignatures } from "@/data/additional-features";

export function DigitalWaiversManager() {
  const [waivers] = useState(digitalWaivers);
  const [signatures] = useState(waiverSignatures);
  const [searchQuery, setSearchQuery] = useState("");

  const getTypeBadge = (type: string) => {
    const styles = {
      boarding: "bg-blue-500/10 text-blue-700",
      daycare: "bg-green-500/10 text-green-700",
      grooming: "bg-purple-500/10 text-purple-700",
      training: "bg-orange-500/10 text-orange-700",
      general: "bg-gray-500/10 text-gray-700",
    };
    return styles[type as keyof typeof styles] || "";
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      valid: "bg-green-500/10 text-green-700",
      expired: "bg-red-500/10 text-red-700",
      revoked: "bg-gray-500/10 text-gray-700",
    };
    return styles[status as keyof typeof styles] || "";
  };

  const filteredSignatures = signatures.filter(
    (sig) =>
      sig.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.waiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sig.petName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalWaivers: waivers.length,
    activeWaivers: waivers.filter((w) => w.isActive).length,
    totalSignatures: signatures.length,
    validSignatures: signatures.filter((s) => s.status === "valid").length,
    expiredSignatures: signatures.filter((s) => s.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Waivers
                </p>
                <p className="text-2xl font-bold">{stats.totalWaivers}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeWaivers}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Signatures
                </p>
                <p className="text-2xl font-bold">{stats.totalSignatures}</p>
              </div>
              <Edit className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Valid
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.validSignatures}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Expired
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.expiredSignatures}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">Waiver Templates</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>

        {/* Waiver Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Waiver Templates</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Waiver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requires Signature</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waivers.map((waiver) => (
                    <TableRow key={waiver.id}>
                      <TableCell className="font-medium">
                        {waiver.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeBadge(waiver.type)}>
                          {waiver.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{waiver.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {waiver.isActive ? (
                          <Badge className="bg-green-500/10 text-green-700">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/10 text-gray-700">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {waiver.requiresSignature ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>
                        {waiver.expiryDays
                          ? `${waiver.expiryDays} days`
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(waiver.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>E-Signatures</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search client, pet, waiver..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waiver</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Signed Date</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignatures.map((signature) => (
                    <TableRow key={signature.id}>
                      <TableCell className="font-medium">
                        {signature.waiverName}
                      </TableCell>
                      <TableCell>{signature.clientName}</TableCell>
                      <TableCell>{signature.petName || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(signature.signedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {signature.ipAddress}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(signature.status)}>
                          {signature.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {signature.expiresAt
                          ? new Date(signature.expiresAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

