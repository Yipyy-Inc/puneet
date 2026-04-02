"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Trash2,
  Package,
  Truck,
  Tag,
  Ruler,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFacilityRole } from "@/hooks/use-facility-role";
import { retailConfig } from "@/data/retail-config";

const COLOR_OPTIONS = [
  { value: "red", label: "Red", dot: "bg-red-500" },
  { value: "amber", label: "Amber", dot: "bg-amber-500" },
  { value: "emerald", label: "Green", dot: "bg-emerald-500" },
  { value: "blue", label: "Blue", dot: "bg-blue-500" },
  { value: "purple", label: "Purple", dot: "bg-purple-500" },
  { value: "pink", label: "Pink", dot: "bg-pink-500" },
  { value: "slate", label: "Gray", dot: "bg-slate-500" },
];

let _id = 800;
function nextId(prefix: string) {
  _id += 1;
  return `${prefix}-${_id}`;
}

export function RetailSettings() {
  const { role } = useFacilityRole();
  const [categories, setCategories] = useState(retailConfig.categories);
  const [suppliers, setSuppliers] = useState(retailConfig.suppliers);
  const [brands, setBrands] = useState(retailConfig.brands);
  const [tags, setTags] = useState(retailConfig.productTags);
  const [units, setUnits] = useState(retailConfig.unitsOfMeasure);

  // Inline add state
  const [newCat, setNewCat] = useState("");
  const [newSup, setNewSup] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newTagColor, setNewTagColor] = useState("blue");
  const [newUnit, setNewUnit] = useState("");

  const handleSave = () => {
    retailConfig.categories = categories;
    retailConfig.suppliers = suppliers;
    retailConfig.brands = brands;
    retailConfig.productTags = tags;
    retailConfig.unitsOfMeasure = units;
    toast.success("Retail settings saved");
  };

  if (role !== "owner" && role !== "manager") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Shield className="text-muted-foreground size-5" />
          <p className="text-muted-foreground text-sm">
            Retail settings are only accessible to facility owners and managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Retail / POS Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure product categories, suppliers, brands, tags, and units for
          your retail module.
        </p>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Package className="size-4" />
            Product Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2"
            >
              <Input
                value={cat.name}
                onChange={(e) => {
                  const next = [...categories];
                  next[idx] = { ...cat, name: e.target.value };
                  setCategories(next);
                }}
                className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Select
                value={cat.status}
                onValueChange={(v) => {
                  const next = [...categories];
                  next[idx] = {
                    ...cat,
                    status: v as "active" | "draft",
                  };
                  setCategories(next);
                }}
              >
                <SelectTrigger className="h-6 w-20 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">
                    Active
                  </SelectItem>
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                onClick={() =>
                  setCategories(categories.filter((_, i) => i !== idx))
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCat.trim()) {
                  setCategories([
                    ...categories,
                    {
                      id: nextId("cat"),
                      name: newCat.trim(),
                      status: "active",
                      sortOrder: categories.length,
                    },
                  ]);
                  setNewCat("");
                }
              }}
              placeholder="Add category..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newCat.trim()}
              onClick={() => {
                setCategories([
                  ...categories,
                  {
                    id: nextId("cat"),
                    name: newCat.trim(),
                    status: "active",
                    sortOrder: categories.length,
                  },
                ]);
                setNewCat("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Truck className="size-4" />
            Suppliers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {suppliers.map((sup, idx) => (
            <div
              key={sup.id}
              className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2"
            >
              <Input
                value={sup.name}
                onChange={(e) => {
                  const next = [...suppliers];
                  next[idx] = { ...sup, name: e.target.value };
                  setSuppliers(next);
                }}
                className="h-7 flex-1 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
              />
              <span className="text-muted-foreground truncate text-xs">
                {sup.email ?? ""}
              </span>
              <span className="text-muted-foreground text-[10px]">
                {sup.paymentTerms ?? ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                onClick={() =>
                  setSuppliers(suppliers.filter((_, i) => i !== idx))
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newSup}
              onChange={(e) => setNewSup(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSup.trim()) {
                  setSuppliers([
                    ...suppliers,
                    { id: nextId("sup"), name: newSup.trim() },
                  ]);
                  setNewSup("");
                }
              }}
              placeholder="Add supplier..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newSup.trim()}
              onClick={() => {
                setSuppliers([
                  ...suppliers,
                  { id: nextId("sup"), name: newSup.trim() },
                ]);
                setNewSup("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Brands */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4" />
            Brands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {brands.map((brand, idx) => (
              <div
                key={brand.id}
                className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
              >
                <span className="text-xs font-medium">{brand.name}</span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setBrands(brands.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBrand.trim()) {
                  setBrands([
                    ...brands,
                    { id: nextId("br"), name: newBrand.trim() },
                  ]);
                  setNewBrand("");
                }
              }}
              placeholder="Add brand..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newBrand.trim()}
              onClick={() => {
                setBrands([
                  ...brands,
                  { id: nextId("br"), name: newBrand.trim() },
                ]);
                setNewBrand("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Product Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            Product Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => {
              const colorDot =
                COLOR_OPTIONS.find((c) => c.value === tag.color)?.dot ??
                "bg-slate-500";
              return (
                <div
                  key={tag.id}
                  className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
                >
                  <div className={cn("size-2 rounded-full", colorDot)} />
                  <span className="text-xs font-medium">{tag.name}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="h-8 flex-1 text-sm"
            />
            <Select value={newTagColor} onValueChange={setNewTagColor}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "size-2.5 rounded-full",
                      COLOR_OPTIONS.find((c) => c.value === newTagColor)?.dot,
                    )}
                  />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2.5 rounded-full", c.dot)} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newTag.trim()}
              onClick={() => {
                setTags([
                  ...tags,
                  {
                    id: nextId("tag"),
                    name: newTag.trim(),
                    color: newTagColor,
                  },
                ]);
                setNewTag("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Units of Measure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Ruler className="size-4" />
            Units of Measure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {units.map((unit, idx) => (
              <div
                key={unit.id}
                className="bg-background flex items-center gap-1.5 rounded-full border px-3 py-1"
              >
                <span className="text-xs font-medium">{unit.name}</span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setUnits(units.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newUnit.trim()) {
                  setUnits([
                    ...units,
                    { id: nextId("unit"), name: newUnit.trim() },
                  ]);
                  setNewUnit("");
                }
              }}
              placeholder="Add unit..."
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              disabled={!newUnit.trim()}
              onClick={() => {
                setUnits([
                  ...units,
                  { id: nextId("unit"), name: newUnit.trim() },
                ]);
                setNewUnit("");
              }}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-1.5">
          Save Retail Settings
        </Button>
      </div>
    </div>
  );
}
