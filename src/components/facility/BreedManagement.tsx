"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Star,
  PawPrint,
  Cat,
  Rabbit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAllBreeds,
  addBreed,
  updateBreed,
  removeBreed,
  type Breed,
} from "@/data/breeds";

const SPECIES_CONFIG = [
  { key: "Dog" as const, label: "Dogs", icon: PawPrint },
  { key: "Cat" as const, label: "Cats", icon: Cat },
  { key: "Other" as const, label: "Other", icon: Rabbit },
];

export function BreedManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Dog: true,
    Cat: true,
    Other: false,
  });

  // Add/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBreed, setEditingBreed] = useState<Breed | null>(null);
  const [formName, setFormName] = useState("");
  const [formSpecies, setFormSpecies] = useState<"Dog" | "Cat" | "Other">(
    "Dog",
  );
  const [formPopular, setFormPopular] = useState(false);

  const allBreeds = useMemo(() => getAllBreeds(), [refreshKey]);

  const filteredBreeds = useMemo(() => {
    if (!searchQuery.trim()) return allBreeds;
    const q = searchQuery.toLowerCase();
    return allBreeds.filter((b) => b.name.toLowerCase().includes(q));
  }, [allBreeds, searchQuery]);

  const breedsBySpecies = useMemo(() => {
    const groups: Record<string, Breed[]> = { Dog: [], Cat: [], Other: [] };
    for (const b of filteredBreeds) {
      (groups[b.species] ?? groups.Other).push(b);
    }
    return groups;
  }, [filteredBreeds]);

  const openAddDialog = () => {
    setEditingBreed(null);
    setFormName("");
    setFormSpecies("Dog");
    setFormPopular(false);
    setDialogOpen(true);
  };

  const openEditDialog = (breed: Breed) => {
    setEditingBreed(breed);
    setFormName(breed.name);
    setFormSpecies(breed.species);
    setFormPopular(breed.popular ?? false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const breed: Breed = {
      name: formName.trim(),
      species: formSpecies,
      popular: formPopular || undefined,
    };

    if (editingBreed) {
      updateBreed(editingBreed.name, breed);
      toast.success(`Updated "${breed.name}"`);
    } else {
      const ok = addBreed(breed);
      if (!ok) {
        toast.error(`"${breed.name}" already exists`);
        return;
      }
      toast.success(`Added "${breed.name}"`);
    }

    setDialogOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleRemove = (breed: Breed) => {
    if (
      !window.confirm(
        `Remove "${breed.name}"? Pets already assigned this breed will keep it.`,
      )
    )
      return;
    removeBreed(breed.name);
    toast.success(`Removed "${breed.name}"`);
    setRefreshKey((k) => k + 1);
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Pet Breeds</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage the breed list used when creating and editing pets.{" "}
              {allBreeds.length} breeds total.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
            <Plus className="size-3.5" />
            Add Breed
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search breeds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Species groups */}
        {SPECIES_CONFIG.map((sp) => {
          const list = breedsBySpecies[sp.key] ?? [];
          const Icon = sp.icon;
          return (
            <Collapsible
              key={sp.key}
              open={openSections[sp.key]}
              onOpenChange={() => toggleSection(sp.key)}
            >
              <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md border px-3 py-2 transition-colors">
                <div className="flex items-center gap-2">
                  <Icon className="text-muted-foreground size-4" />
                  <span className="text-sm font-semibold">{sp.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {list.length}
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "text-muted-foreground size-4 transition-transform",
                    openSections[sp.key] && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 max-h-[300px] overflow-y-auto rounded-md border">
                  {list.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-xs">
                      {searchQuery
                        ? "No matches"
                        : `No ${sp.label.toLowerCase()} breeds`}
                    </p>
                  ) : (
                    list.map((breed) => (
                      <div
                        key={breed.name}
                        className="group flex items-center justify-between border-b px-3 py-1.5 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{breed.name}</span>
                          {breed.popular && (
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => openEditDialog(breed)}
                            className="text-muted-foreground hover:text-foreground rounded-sm p-1 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            onClick={() => handleRemove(breed)}
                            className="text-muted-foreground hover:text-destructive rounded-sm p-1 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingBreed ? "Edit Breed" : "Add Breed"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-sm">
                Breed Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Goldendoodle"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-sm">Species</Label>
              <Select
                value={formSpecies}
                onValueChange={(v) =>
                  setFormSpecies(v as "Dog" | "Cat" | "Other")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dog">Dog</SelectItem>
                  <SelectItem value="Cat">Cat</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={formPopular}
                onCheckedChange={(v) => setFormPopular(!!v)}
              />
              <span className="text-sm">
                Mark as popular (shows at top of breed search)
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {editingBreed ? "Save Changes" : "Add Breed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
