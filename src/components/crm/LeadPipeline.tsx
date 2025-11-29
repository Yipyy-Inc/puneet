"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import {
  Lead,
  PipelineStage,
  pipelineStageLabels,
  pipelineStageColors,
  pipelineStageOrder,
} from "@/data/crm/leads";
import { LeadCard } from "./LeadCard";

interface LeadPipelineProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
  onAddLead?: (stage: PipelineStage) => void;
  onLeadMove?: (leadId: string, newStage: PipelineStage) => void;
}

interface SortableLeadProps {
  lead: Lead;
  onClick?: () => void;
}

function SortableLead({ lead, onClick }: SortableLeadProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-2"
    >
      <LeadCard lead={lead} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

interface PipelineColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
  onAddLead?: () => void;
}

function PipelineColumn({
  stage,
  leads,
  onLeadClick,
  onAddLead,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const totalValue = leads.reduce(
    (sum, lead) => sum + lead.estimatedAnnualValue,
    0,
  );

  return (
    <div
      className={`flex flex-col min-w-[280px] max-w-[280px] bg-muted/30 rounded-lg ${
        isOver ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
    >
      {/* Column Header */}
      <div className="p-3 border-b bg-card rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${pipelineStageColors[stage]}`}
            />
            <h3 className="font-medium text-sm">
              {pipelineStageLabels[stage]}
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {leads.length}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          ${totalValue.toLocaleString()} total value
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea
        className="flex-1 p-2"
        style={{ height: "calc(100vh - 320px)" }}
      >
        <div ref={setNodeRef} className="min-h-[100px]">
          <SortableContext
            items={leads.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.map((lead) => (
              <SortableLead
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick?.(lead)}
              />
            ))}
          </SortableContext>
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No leads in this stage
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Button */}
      {onAddLead && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={onAddLead}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      )}
    </div>
  );
}

export function LeadPipeline({
  leads,
  onLeadClick,
  onAddLead,
  onLeadMove,
}: LeadPipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeLead = activeId
    ? localLeads.find((l) => l.id === activeId)
    : null;

  const getLeadsByStage = (stage: PipelineStage) => {
    return localLeads.filter((lead) => lead.status === stage);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're over a column (stage)
    const isOverColumn = pipelineStageOrder.includes(overId as PipelineStage);

    if (isOverColumn) {
      const newStage = overId as PipelineStage;
      setLocalLeads((prev) =>
        prev.map((lead) =>
          lead.id === activeId ? { ...lead, status: newStage } : lead,
        ),
      );
    } else {
      // We're over another lead - find that lead's stage
      const overLead = localLeads.find((l) => l.id === overId);
      if (overLead) {
        setLocalLeads((prev) =>
          prev.map((lead) =>
            lead.id === activeId ? { ...lead, status: overLead.status } : lead,
          ),
        );
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const lead = localLeads.find((l) => l.id === activeId);

    if (lead && onLeadMove) {
      onLeadMove(activeId, lead.status);
    }
  };

  return (
    <div className="w-full overflow-x-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStageOrder.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              leads={getLeadsByStage(stage)}
              onLeadClick={onLeadClick}
              onAddLead={onAddLead ? () => onAddLead(stage) : undefined}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Simple list view alternative for the pipeline
interface LeadPipelineListProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
}

export function LeadPipelineList({
  leads,
  onLeadClick,
}: LeadPipelineListProps) {
  return (
    <div className="space-y-4">
      {pipelineStageOrder.map((stage) => {
        const stageLeads = leads.filter((l) => l.status === stage);
        if (stageLeads.length === 0) return null;

        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-2 h-2 rounded-full ${pipelineStageColors[stage]}`}
              />
              <h3 className="font-medium text-sm">
                {pipelineStageLabels[stage]}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {stageLeads.length}
              </Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick?.(lead)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// View toggle component
interface PipelineViewToggleProps {
  view: "kanban" | "list";
  onViewChange: (view: "kanban" | "list") => void;
}

export function PipelineViewToggle({
  view,
  onViewChange,
}: PipelineViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={view === "kanban" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onViewChange("kanban")}
        className="h-7"
      >
        <LayoutGrid className="h-4 w-4 mr-1" />
        Kanban
      </Button>
      <Button
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className="h-7"
      >
        <List className="h-4 w-4 mr-1" />
        List
      </Button>
    </div>
  );
}
