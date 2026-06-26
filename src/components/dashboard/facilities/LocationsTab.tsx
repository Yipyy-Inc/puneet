"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Building, ChevronRight, Plus } from "lucide-react";

import {
  LocationDetailSheet,
  type LocationDetail,
} from "./LocationDetailSheet";
import {
  LocationFormModal,
  type LocationFormValues,
} from "./LocationFormModal";

interface Location {
  name: string;
  address: string;
  services: string[];
}

type LocationRecord = LocationDetail;

interface LocationsTabProps {
  facilityId: number;
  facilityName: string;
  facilityPhone: string;
  locations: Location[];
}

interface FormState {
  open: boolean;
  mode: "add" | "edit";
  editId: string | null;
  key: string;
}

export function LocationsTab({
  facilityId,
  facilityName,
  facilityPhone,
  locations,
}: LocationsTabProps) {
  const [locs, setLocs] = useState<LocationRecord[]>(() =>
    locations.map((l, i) => ({
      id: `loc-${i}`,
      name: l.name,
      address: l.address,
      services: l.services,
      phone: facilityPhone,
    })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    open: false,
    mode: "add",
    editId: null,
    key: "init",
  });

  const selected = selectedId
    ? (locs.find((l) => l.id === selectedId) ?? null)
    : null;
  const selectedIndex = selected
    ? locs.findIndex((l) => l.id === selected.id)
    : -1;

  const formInitial =
    form.mode === "edit" && form.editId
      ? (locs.find((l) => l.id === form.editId) ?? null)
      : null;

  const openAdd = () =>
    setForm({
      open: true,
      mode: "add",
      editId: null,
      key: `add-${Date.now()}`,
    });
  const openEdit = (id: string) =>
    setForm({
      open: true,
      mode: "edit",
      editId: id,
      key: `edit-${id}-${Date.now()}`,
    });

  const handleSubmit = (v: LocationFormValues) => {
    if (form.mode === "add") {
      setLocs((prev) => [...prev, { id: `new-${Date.now()}`, ...v }]);
      toast.success(`Location "${v.name}" added.`);
    } else if (form.editId) {
      setLocs((prev) =>
        prev.map((l) => (l.id === form.editId ? { ...l, ...v } : l)),
      );
      toast.success(`Location "${v.name}" updated.`);
    }
    setForm((f) => ({ ...f, open: false }));
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <MapPin className="size-5" />
          Locations
          <Badge variant="secondary" className="ml-2">
            {locs.length}
          </Badge>
        </CardTitle>
        <Button onClick={openAdd}>
          <Plus className="mr-2 size-4" />
          Add Location
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locs.map((location) => (
                <TableRow
                  key={location.id}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedId(location.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{
                          background:
                            "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        }}
                      >
                        <Building className="size-4 text-white" />
                      </div>
                      {location.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {location.address}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {location.services.map((service) => (
                        <Badge
                          key={service}
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`View ${location.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(location.id);
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {selected && (
        <LocationDetailSheet
          location={selected}
          locationIndex={selectedIndex}
          totalLocations={locs.length}
          facilityId={facilityId}
          facilityName={facilityName}
          onClose={() => setSelectedId(null)}
          onEdit={() => openEdit(selected.id)}
        />
      )}

      <LocationFormModal
        key={form.key}
        open={form.open}
        mode={form.mode}
        initial={formInitial}
        onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
