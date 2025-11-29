"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Download,
  Users,
  DollarSign,
  TrendingUp,
  Target,
} from "lucide-react";
import {
  LeadPipeline,
  LeadPipelineList,
  PipelineViewToggle,
} from "@/components/crm/LeadPipeline";
import { LeadModal } from "@/components/modals/LeadModal";
import { ConvertLeadModal } from "@/components/modals/ConvertLeadModal";
import {
  leads,
  Lead,
  PipelineStage,
  LeadSource,
  leadSourceLabels,
  getTotalPipelineValue,
  getWeightedPipelineValue,
  getLeadsCountByStage,
} from "@/data/crm/leads";
import { salesTeamMembers } from "@/data/crm/sales-team";
import { LeadFormData } from "@/components/crm/LeadForm";

export default function LeadsPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [, setInitialStage] = useState<PipelineStage>("new_lead");

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !lead.facilityName.toLowerCase().includes(search) &&
        !lead.contactPerson.toLowerCase().includes(search) &&
        !lead.email.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (sourceFilter !== "all" && lead.source !== sourceFilter) {
      return false;
    }
    if (assigneeFilter !== "all" && lead.assignedTo !== assigneeFilter) {
      return false;
    }
    return true;
  });

  // Calculate metrics
  const totalLeads = leads.length;
  const activeLeads = leads.filter(
    (l) => l.status !== "closed_won" && l.status !== "closed_lost",
  ).length;
  const totalPipelineValue = getTotalPipelineValue();
  const weightedValue = getWeightedPipelineValue();
  const stageCounts = getLeadsCountByStage();

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    if (lead.status === "closed_won") {
      // Already converted
    } else if (lead.status === "negotiation") {
      setShowConvertModal(true);
    } else {
      setShowLeadModal(true);
    }
  };

  const handleAddLead = (stage: PipelineStage) => {
    setSelectedLead(null);
    setInitialStage(stage);
    setShowLeadModal(true);
  };

  const handleLeadMove = (leadId: string, newStage: PipelineStage) => {
    // In a real app, this would update the backend
    console.log(`Moving lead ${leadId} to ${newStage}`);
  };

  const handleSaveLead = (data: LeadFormData) => {
    // In a real app, this would save to the backend
    console.log("Saving lead:", data);
    setShowLeadModal(false);
    setSelectedLead(null);
  };

  const handleConvertLead = (lead: Lead, options: unknown) => {
    // In a real app, this would convert the lead
    console.log("Converting lead:", lead, options);
    setShowConvertModal(false);
    setSelectedLead(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground">
            Manage and track your sales leads through the pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedLead(null);
              setInitialStage("new_lead");
              setShowLeadModal(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {activeLeads} active in pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalPipelineValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total annual value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weighted Pipeline
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(weightedValue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Probability-adjusted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLeads > 0
                ? ((stageCounts.closed_won / totalLeads) * 100).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {stageCounts.closed_won} won of {totalLeads}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9 w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as LeadSource | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {(Object.keys(leadSourceLabels) as LeadSource[]).map((source) => (
                <SelectItem key={source} value={source}>
                  {leadSourceLabels[source]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[150px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {salesTeamMembers
                .filter((m) => m.status === "active")
                .map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {(searchTerm ||
            sourceFilter !== "all" ||
            assigneeFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSourceFilter("all");
                setAssigneeFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <PipelineViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Stage Summary */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <Badge key={stage} variant="outline" className="whitespace-nowrap">
            {stage.replace(/_/g, " ")}: {count}
          </Badge>
        ))}
      </div>

      {/* Pipeline View */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No leads found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchTerm || sourceFilter !== "all" || assigneeFilter !== "all"
                ? "Try adjusting your filters"
                : "Start by adding your first lead"}
            </p>
            <Button
              onClick={() => {
                setSelectedLead(null);
                setInitialStage("new_lead");
                setShowLeadModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <LeadPipeline
          leads={filteredLeads}
          onLeadClick={handleLeadClick}
          onAddLead={handleAddLead}
          onLeadMove={handleLeadMove}
        />
      ) : (
        <LeadPipelineList leads={filteredLeads} onLeadClick={handleLeadClick} />
      )}

      {/* Modals */}
      <LeadModal
        open={showLeadModal}
        onOpenChange={setShowLeadModal}
        lead={selectedLead || undefined}
        onSave={handleSaveLead}
      />

      <ConvertLeadModal
        open={showConvertModal}
        onOpenChange={setShowConvertModal}
        lead={selectedLead}
        onConvert={handleConvertLead}
      />
    </div>
  );
}
