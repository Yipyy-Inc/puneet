"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Ban,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAllBreeds,
  addBreed,
  updateBreed,
  removeBreed,
  getBreedRestrictionMessage,
  type Breed,
} from "@/data/breeds";
import { breedMutations } from "@/lib/api/breeds";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// The label is a KEY. It was three English words rendered straight, and the
// group heading, the "No X breeds" empty line and the species dropdown all
// read from it — so a French user saw "Dogs" three times per screen.
const SPECIES_CONFIG = [
  { key: "Dog" as const, label: "speciesDogs", icon: PawPrint },
  { key: "Cat" as const, label: "speciesCats", icon: Cat },
  { key: "Other" as const, label: "speciesOther", icon: Rabbit },
];

export function BreedManagement() {
  const t = useSettingsText().section("pet-breeds");
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

  // Restriction message — persisted via the breeds query factory.
  const queryClient = useQueryClient();
  const [savedMessage, setSavedMessage] = useState(() =>
    getBreedRestrictionMessage(),
  );
  const [messageDraft, setMessageDraft] = useState(savedMessage);

  const restrictMutation = useMutation({
    ...breedMutations.setRestricted(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["breeds"] });
      setRefreshKey((k) => k + 1);
    },
  });

  const saveMessageMutation = useMutation({
    ...breedMutations.setRestrictionMessage(messageDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["breeds", "restriction-message"],
      });
      setSavedMessage(messageDraft);
      toast.success(t("messageSaved"));
    },
  });

  const toggleRestrict = (breed: Breed) => {
    const next = !breed.restricted;
    restrictMutation.mutate({ name: breed.name, restricted: next });
    toast.success(
      (next ? t("nowRestricted") : t("restrictionRemoved")).replace(
        "{name}",
        breed.name,
      ),
    );
  };

  const allBreeds = useMemo(() => getAllBreeds(), [refreshKey]);
  const restrictedCount = useMemo(
    () => allBreeds.filter((b) => b.restricted).length,
    [allBreeds],
  );

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
      toast.success(t("updatedNamed").replace("{name}", breed.name));
    } else {
      const ok = addBreed(breed);
      if (!ok) {
        toast.error(t("alreadyExists").replace("{name}", breed.name));
        return;
      }
      toast.success(t("addedNamed").replace("{name}", breed.name));
    }

    setDialogOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleRemove = (breed: Breed) => {
    if (!window.confirm(t("confirmRemove").replace("{name}", breed.name)))
      return;
    removeBreed(breed.name);
    toast.success(t("removedNamed").replace("{name}", breed.name));
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
            <p className="text-muted-foreground mt-1 text-sm">
              {t("intro")}{" "}
              {t("breedsTotal").replace("{count}", String(allBreeds.length))}
              {restrictedCount > 0 && (
                <span className="text-red-600">
                  {" · "}
                  {t("restrictedCount").replace(
                    "{count}",
                    String(restrictedCount),
                  )}
                </span>
              )}
              .
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
            <Plus className="size-3.5" />
            {t("addBreed")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            placeholder={t("searchBreeds")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        {/* Restricted breed booking message */}
        <div className="space-y-2 rounded-md border border-red-100 bg-red-50/40 p-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-red-600" />
            <span className="text-sm font-semibold">
              {t("restrictionMessageTitle")}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {t("restrictionMessageHelp")}
          </p>
          <Textarea
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            rows={2}
            className="bg-background text-sm"
            placeholder={t("restrictionMessagePlaceholder")}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={
                messageDraft.trim() === savedMessage.trim() ||
                !messageDraft.trim() ||
                saveMessageMutation.isPending
              }
              onClick={() => saveMessageMutation.mutate()}
            >
              {saveMessageMutation.isPending ? t("saving") : t("saveMessage")}
            </Button>
          </div>
        </div>

        {/* Legend — explains every icon/marker shown on breed rows */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border px-3 py-2 text-xs">
          <span className="text-muted-foreground font-medium">
            {t("legend")}
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {t("legendPopular")}
          </span>
          <span className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="gap-1 border-red-200 bg-red-50 text-[10px] text-red-700"
            >
              <Ban className="size-2.5" />
              {t("restricted")}
            </Badge>
            {t("legendRestricted")}
          </span>
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
                <div className="flex flex-col items-start gap-0.5 text-left">
                  <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground size-4" />
                    <span className="text-sm font-semibold">{t(sp.label)}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {list.length}
                    </Badge>
                  </div>
                  {sp.key === "Other" && (
                    <span className="text-muted-foreground ml-6 text-[11px] font-normal">
                      {t("otherSpeciesHelp")}
                    </span>
                  )}
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
                        ? t("noMatches")
                        : t("noBreedsIn").replace("{species}", t(sp.label))}
                    </p>
                  ) : (
                    list.map((breed) => (
                      <div
                        key={breed.name}
                        className={cn(
                          "group flex items-center justify-between border-b px-3 py-1.5 last:border-b-0",
                          breed.restricted && "bg-red-50/50",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              breed.restricted &&
                                "text-muted-foreground line-through",
                            )}
                          >
                            {breed.name}
                          </span>
                          {breed.popular && (
                            <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
                          )}
                          {breed.restricted && (
                            <Badge
                              variant="outline"
                              className="shrink-0 gap-1 border-red-200 bg-red-50 text-[10px] text-red-700"
                            >
                              <Ban className="size-2.5" />
                              {t("restricted")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleRestrict(breed)}
                            className={cn(
                              "flex size-8 items-center justify-center rounded-full transition-colors max-lg:size-12",
                              breed.restricted
                                ? "text-red-600 hover:text-red-700"
                                : "text-ink-disabled hover:text-red-600",
                            )}
                            title={
                              breed.restricted
                                ? t("removeRestriction")
                                : t("restrictBreed")
                            }
                          >
                            <Ban className="size-4" />
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditDialog(breed)}
                              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors max-lg:size-12"
                              title={t("edit")}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              onClick={() => handleRemove(breed)}
                              className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-full transition-colors max-lg:size-12"
                              title={t("remove")}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
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
              {editingBreed ? t("editBreed") : t("addBreed")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-sm">
                {t("breedName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("breedNamePlaceholder")}
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-sm">{t("species")}</Label>
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
                  <SelectItem value="Dog">{t("speciesDog")}</SelectItem>
                  <SelectItem value="Cat">{t("speciesCat")}</SelectItem>
                  <SelectItem value="Other">{t("speciesOtherOne")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={formPopular}
                onCheckedChange={(v) => setFormPopular(!!v)}
              />
              <span className="text-sm">{t("markPopular")}</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {editingBreed ? t("saveChanges") : t("addBreed")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
