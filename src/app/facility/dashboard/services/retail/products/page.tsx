"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  MoreHorizontal,
  Package,
  Tag,
  Barcode,
  DollarSign,
  Box,
  Eye,
  EyeOff,
  Upload,
  X,
  Edit,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  products,
  categories,
  type Product,
  type ProductVariant,
  type VariantType,
} from "@/data/retail";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateUniqueBarcode } from "@/lib/barcode-generator";
import { BarcodeDisplay } from "@/components/retail/BarcodeDisplay";
import { BarcodeLabelPrint } from "@/components/retail/BarcodeLabelPrint";
import { BulkPriceLabelPrint } from "@/components/retail/BulkPriceLabelPrint";
import { retailConfig } from "@/data/retail-config";
import { useHardwareBarcodeScanner } from "@/hooks/use-hardware-barcode-scanner";

type ProductWithRecord = Product & Record<string, unknown>;

export default function ProductsPage() {
  const [productList, setProductList] = useState<Product[]>(products);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [selectedProductIds, setSelectedProductIds] = useState<
    Set<string | number>
  >(new Set());
  const [bulkLabelPrintOpen, setBulkLabelPrintOpen] = useState(false);
  const [quickLabelProduct, setQuickLabelProduct] = useState<Product | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    basePrice: 0,
    baseCostPrice: 0,
    sku: "",
    barcode: "",
    status: "active" as "active" | "inactive" | "discontinued",
    hasVariants: false,
    stock: 0,
    minStock: 0,
    maxStock: 100,
    taxable: true,
    taxRate: 0,
    onlineVisible: true,
    tags: [] as string[],
    imageUrl: "",
  });

  const [newTag, setNewTag] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null,
  );
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
  const [variantForm, setVariantForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    maxStock: 100,
    variantType: "size" as VariantType,
    variantValue: "",
    customVariantType: "",
    imageUrl: "",
    imageUrls: [] as string[],
  });

  const productBarcodeInputRef = useRef<HTMLInputElement>(null);
  const variantBarcodeInputRef = useRef<HTMLInputElement>(null);

  const handleProductBarcodeScan = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setFormData((prev) => ({
      ...prev,
      barcode: trimmed,
    }));
  }, []);

  const handleVariantBarcodeScan = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setVariantForm((prev) => ({
      ...prev,
      barcode: trimmed,
    }));
  }, []);

  useHardwareBarcodeScanner(
    productBarcodeInputRef,
    handleProductBarcodeScan,
    isAddEditModalOpen && !formData.barcode.startsWith("YPY-"),
  );

  useHardwareBarcodeScanner(
    variantBarcodeInputRef,
    handleVariantBarcodeScan,
    isVariantModalOpen,
  );

  const stats = useMemo(() => {
    const totalProducts = productList.length;
    const activeProducts = productList.filter(
      (p) => p.status === "active",
    ).length;

    let inventoryRetailValue = 0;
    let inventoryCostValue = 0;

    for (const product of productList) {
      if (product.hasVariants && product.variants.length > 0) {
        for (const variant of product.variants) {
          inventoryRetailValue += variant.stock * variant.price;
          inventoryCostValue += variant.stock * variant.costPrice;
        }
      } else {
        inventoryRetailValue += product.stock * product.basePrice;
        inventoryCostValue += product.stock * product.baseCostPrice;
      }
    }

    const lowStockCount = productList.filter((product) => {
      if (product.hasVariants && product.variants.length > 0) {
        return product.variants.some(
          (variant) => variant.stock <= variant.minStock,
        );
      }
      return product.stock <= product.minStock;
    }).length;

    return {
      totalProducts,
      activeProducts,
      inventoryRetailValue,
      inventoryCostValue,
      lowStockCount,
    };
  }, [productList]);

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      category: "",
      brand: "",
      basePrice: 0,
      baseCostPrice: 0,
      sku: "",
      barcode: "",
      status: "active",
      hasVariants: false,
      stock: 0,
      minStock: 0,
      maxStock: 100,
      taxable: true,
      taxRate: 0,
      onlineVisible: true,
      tags: [],
      imageUrl: "",
    });
    setVariants([]);
    setIsAddEditModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      basePrice: product.basePrice,
      baseCostPrice: product.baseCostPrice,
      sku: product.sku,
      barcode: product.barcode,
      status: product.status,
      hasVariants: product.hasVariants,
      stock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      taxable: product.taxable,
      taxRate: product.taxRate,
      onlineVisible: product.onlineVisible,
      tags: [...product.tags],
      imageUrl: product.imageUrl || "",
    });
    setVariants(product.hasVariants ? product.variants : []);
    setIsAddEditModalOpen(true);
  };

  const handleAddVariant = () => {
    setEditingVariant(null);
    setVariantForm({
      name: "",
      sku: "",
      barcode: "",
      price: 0,
      costPrice: 0,
      stock: 0,
      minStock: 0,
      maxStock: 100,
      variantType: "size",
      variantValue: "",
      customVariantType: "",
      imageUrl: "",
      imageUrls: [],
    });
    setIsVariantModalOpen(true);
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setVariantForm({
      name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode,
      price: variant.price,
      costPrice: variant.costPrice,
      stock: variant.stock,
      minStock: variant.minStock,
      maxStock: variant.maxStock,
      variantType: variant.variantType,
      variantValue: variant.variantValue,
      customVariantType: variant.customVariantType || "",
      imageUrl: variant.imageUrl || "",
      imageUrls: variant.imageUrls || [],
    });
    setIsVariantModalOpen(true);
  };

  const handleSaveVariant = () => {
    if (editingVariant) {
      // Update existing variant
      setVariants(
        variants.map((v) =>
          v.id === editingVariant.id
            ? {
                ...v,
                ...variantForm,
                customVariantType:
                  variantForm.variantType === "custom"
                    ? variantForm.customVariantType
                    : undefined,
              }
            : v,
        ),
      );
    } else {
      // Add new variant
      const newVariant: ProductVariant = {
        id: `var-${Date.now()}`,
        ...variantForm,
        customVariantType:
          variantForm.variantType === "custom"
            ? variantForm.customVariantType
            : undefined,
      };
      setVariants([...variants, newVariant]);
    }
    setIsVariantModalOpen(false);
    setEditingVariant(null);
  };

  const handleDeleteVariant = (variantId: string) => {
    setVariants(variants.filter((v) => v.id !== variantId));
  };

  const handleSave = () => {
    const now = new Date().toISOString().slice(0, 10);

    if (editingProduct) {
      setProductList((prev) =>
        prev.map((product) =>
          product.id === editingProduct.id
            ? {
                ...product,
                ...formData,
                variants: formData.hasVariants ? variants : [],
                updatedAt: now,
              }
            : product,
        ),
      );
      toast.success("Product updated");
    } else {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        ...formData,
        variants: formData.hasVariants ? variants : [],
        createdAt: now,
        updatedAt: now,
      };
      setProductList((prev) => [newProduct, ...prev]);
      toast.success("Product created");
    }

    setSelectedProductIds(new Set());
    setIsAddEditModalOpen(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const toggleExpanded = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "discontinued":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0)
      return { label: "Out of Stock", variant: "destructive" as const };
    if (stock <= minStock)
      return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const columns: ColumnDef<ProductWithRecord>[] = [
    {
      key: "name",
      label: "Product",
      icon: Package,
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-muted-foreground text-sm">{item.brand}</div>
        </div>
      ),
    },
    {
      key: "sku",
      label: "SKU",
      icon: Tag,
      defaultVisible: true,
    },
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
    },
    {
      key: "basePrice",
      label: "Price",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => `$${(item.basePrice as number).toFixed(2)}`,
    },
    {
      key: "stock",
      label: "Stock",
      icon: Box,
      defaultVisible: true,
      render: (item) => {
        const stockStatus = getStockStatus(
          item.stock as number,
          item.minStock as number,
        );
        return (
          <div className="flex items-center gap-2">
            <span>{item.stock}</span>
            <Badge variant={stockStatus.variant} className="text-xs">
              {stockStatus.label}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "hasVariants",
      label: "Variants",
      defaultVisible: true,
      render: (item) => (
        <span>
          {item.hasVariants
            ? `${(item.variants as ProductVariant[]).length} variants`
            : "None"}
        </span>
      ),
    },
    {
      key: "onlineVisible",
      label: "Online",
      defaultVisible: true,
      render: (item) =>
        item.onlineVisible ? (
          <Badge variant="outline" className="gap-1">
            <Eye className="size-3" />
            Visible
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <EyeOff className="size-3" />
            Hidden
          </Badge>
        ),
    },
    {
      key: "status",
      label: "Status",
      defaultVisible: true,
      render: (item) => (
        <Badge variant={getStatusVariant(item.status as string)}>
          {(item.status as string).charAt(0).toUpperCase() +
            (item.status as string).slice(1)}
        </Badge>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "category",
      label: "Category",
      options: [
        { value: "all", label: "All Categories" },
        ...categories.map((c) => ({ value: c, label: c })),
      ],
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "discontinued", label: "Discontinued" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-muted-foreground text-xs">
              {stats.activeProducts} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Value
            </CardTitle>
            <DollarSign className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.inventoryRetailValue.toFixed(0)}
            </div>
            <p className="text-muted-foreground text-xs">
              Cost: ${stats.inventoryCostValue.toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Badge
              variant={stats.lowStockCount > 0 ? "destructive" : "secondary"}
            >
              {stats.lowStockCount}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-muted-foreground text-xs">Items need reorder</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-muted-foreground text-xs">Product categories</p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <Package className="mr-2 size-4" />
            List View
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            <Box className="mr-2 size-4" />
            Card View
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setBulkLabelPrintOpen(true)}
            className="gap-2"
          >
            <Printer className="size-4" />
            Print Price Labels
          </Button>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 size-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" && (
        <DataTable
          data={productList as ProductWithRecord[]}
          columns={columns}
          filters={filters}
          searchKey="name"
          searchPlaceholder="Search products..."
          selectable
          getItemId={(item) => item.id as string}
          selectedIds={selectedProductIds}
          onSelectionChange={setSelectedProductIds}
          toolbarExtra={
            selectedProductIds.size > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setBulkLabelPrintOpen(true)}
              >
                <Printer className="size-3.5" />
                Print Selected ({selectedProductIds.size})
              </Button>
            ) : null
          }
          actions={(item) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(item as Product)}>
                  Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setQuickLabelProduct(item as Product)}
                >
                  Print Price Label
                </DropdownMenuItem>
                <DropdownMenuItem>View Variants</DropdownMenuItem>
                <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  {item.status === "active" ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {/* Card View */}
      {viewMode === "cards" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productList.map((product) => (
            <Collapsible
              key={product.id}
              open={expandedProducts.has(product.id)}
              onOpenChange={() => toggleExpanded(product.id)}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-muted-foreground text-sm">
                        {product.brand} • {product.category}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          Edit Product
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setQuickLabelProduct(product)}
                        >
                          Print Price Label
                        </DropdownMenuItem>
                        <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          {product.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">
                      ${product.basePrice.toFixed(2)}
                    </span>
                    <Badge variant={getStatusVariant(product.status)}>
                      {product.status.charAt(0).toUpperCase() +
                        product.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Barcode className="text-muted-foreground size-4" />
                    <span>{product.sku}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>Stock: {product.stock}</span>
                    {product.stock <= product.minStock && (
                      <Badge variant="destructive" className="text-xs">
                        Low
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {product.onlineVisible ? (
                      <Badge variant="outline" className="gap-1">
                        <Eye className="size-3" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <EyeOff className="size-3" />
                        Hidden
                      </Badge>
                    )}
                    {product.hasVariants && (
                      <Badge variant="outline">
                        {product.variants.length} variants
                      </Badge>
                    )}
                  </div>

                  {product.hasVariants && product.variants.length > 0 && (
                    <>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                        >
                          {expandedProducts.has(product.id)
                            ? "Hide Variants"
                            : "Show Variants"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 space-y-2">
                          {product.variants.map((variant) => {
                            const variantStockStatus = getStockStatus(
                              variant.stock,
                              variant.minStock,
                            );
                            return (
                              <div
                                key={variant.id}
                                className="bg-muted/30 rounded-sm border p-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    {variant.name}
                                  </span>
                                  <span className="font-medium">
                                    ${variant.price.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-muted-foreground mt-1 flex items-center justify-between text-xs">
                                  <span>SKU: {variant.sku}</span>
                                  <div className="flex items-center gap-1">
                                    <span>Stock: {variant.stock}</span>
                                    <Badge
                                      variant={variantStockStatus.variant}
                                      className="text-xs"
                                    >
                                      {variantStockStatus.label}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </>
                  )}
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update the product details below."
                : "Fill in the details to create a new product."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Premium Dog Food"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={formData.brand}
                  onValueChange={(value) =>
                    setFormData({ ...formData, brand: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailConfig.brands.map((b) => (
                      <SelectItem key={b.id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__other__">+ Other / Add New</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Product description..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Product Image</Label>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        document.getElementById("imageUpload")?.click()
                      }
                    >
                      <Upload className="size-4" />
                      Upload Image
                    </Button>
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({
                              ...formData,
                              imageUrl: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Supported formats: JPG, PNG, GIF, WebP (max 5MB)
                  </p>
                </div>
                {formData.imageUrl && (
                  <div className="relative">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <Image
                        src={formData.imageUrl}
                        alt="Product preview"
                        fill
                        className="object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%23f0f0f0" width="80" height="80"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10">No image</text></svg>';
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 size-6 rounded-full"
                      onClick={() => setFormData({ ...formData, imageUrl: "" })}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailConfig.categories
                      .filter((c) => c.status === "active")
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(
                    value: "active" | "inactive" | "discontinued",
                  ) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="e.g., PDF-001"
                />
              </div>
              <div className="grid gap-2">
                <Label>Barcode</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {/* Barcode mode selector */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, barcode: "" })}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        !formData.barcode.startsWith("YPY-")
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      Scan / Enter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const gen = generateUniqueBarcode(11);
                        setFormData({ ...formData, barcode: gen.code });
                        toast.success(`Barcode generated: ${gen.code}`);
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        formData.barcode.startsWith("YPY-")
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      Auto-Generate
                    </button>
                  </div>

                  {formData.barcode.startsWith("YPY-") ? (
                    <div className="flex items-center gap-3">
                      <BarcodeDisplay
                        code={formData.barcode}
                        width={120}
                        height={35}
                      />
                      <div className="flex-1">
                        <p className="font-mono text-xs font-medium">
                          {formData.barcode}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          System-generated · CODE128
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1 h-6 gap-1 text-[10px]"
                          onClick={() => setLabelPrintOpen(true)}
                        >
                          <Printer className="size-3" />
                          Print Label
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Input
                      ref={productBarcodeInputRef}
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          barcode: e.target.value,
                        })
                      }
                      placeholder="Scan barcode or enter manually..."
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="basePrice">Selling Price ($)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baseCostPrice">Cost Price ($)</Label>
                <Input
                  id="baseCostPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.baseCostPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      baseCostPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock">Current Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minStock">Min Stock Alert</Label>
                <Input
                  id="minStock"
                  type="number"
                  min={0}
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxStock">Max Stock</Label>
                <Input
                  id="maxStock"
                  type="number"
                  min={0}
                  value={formData.maxStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Variants Section */}
            {formData.hasVariants && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    Product Variants
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddVariant}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Variant
                  </Button>
                </div>

                {variants.length > 0 ? (
                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="bg-muted/30 flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{variant.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {variant.variantType === "custom"
                                ? variant.customVariantType
                                : variant.variantType}
                              : {variant.variantValue}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground mt-1 flex items-center gap-4 text-sm">
                            <span>SKU: {variant.sku}</span>
                            <span>Barcode: {variant.barcode}</span>
                            <span>Stock: {variant.stock}</span>
                            <span>Price: ${variant.price.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleEditVariant(variant)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive size-8"
                            onClick={() => handleDeleteVariant(variant.id)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No variants added yet. Click &quot;Add Variant&quot; to
                    create one.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="hasVariants"
                  checked={formData.hasVariants}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, hasVariants: checked });
                    if (!checked) {
                      setVariants([]);
                    }
                  }}
                />
                <Label htmlFor="hasVariants">
                  Does this product come in variations?
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="onlineVisible"
                  checked={formData.onlineVisible}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, onlineVisible: checked })
                  }
                />
                <Label htmlFor="onlineVisible">Show Online</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="taxable"
                  checked={formData.taxable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, taxable: checked })
                  }
                />
                <Label htmlFor="taxable">Taxable</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Variant Modal */}
      <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? "Edit Variant" : "Add New Variant"}
            </DialogTitle>
            <DialogDescription>
              {editingVariant
                ? "Update the variant details below."
                : "Fill in the details to create a new product variant."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="variantName">Variant Name</Label>
                <Input
                  id="variantName"
                  value={variantForm.name}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, name: e.target.value })
                  }
                  placeholder="e.g., Large Red"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="variantType">Variant Type</Label>
                <Select
                  value={variantForm.variantType}
                  onValueChange={(value: VariantType) =>
                    setVariantForm({ ...variantForm, variantType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="color">Color</SelectItem>
                    <SelectItem value="flavor">Flavor</SelectItem>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {variantForm.variantType === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="customVariantType">
                  Custom Variant Type Name
                </Label>
                <Input
                  id="customVariantType"
                  value={variantForm.customVariantType}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      customVariantType: e.target.value,
                    })
                  }
                  placeholder="e.g., Material, Pattern, Style"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="variantValue">Variant Value</Label>
              <Input
                id="variantValue"
                value={variantForm.variantValue}
                onChange={(e) =>
                  setVariantForm({
                    ...variantForm,
                    variantValue: e.target.value,
                  })
                }
                placeholder="e.g., Large, Red, 500g"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="variantSku">SKU</Label>
                <Input
                  id="variantSku"
                  value={variantForm.sku}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, sku: e.target.value })
                  }
                  placeholder="e.g., PDF-001-L-RED"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="variantBarcode">Barcode</Label>
                <Input
                  id="variantBarcode"
                  ref={variantBarcodeInputRef}
                  value={variantForm.barcode}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, barcode: e.target.value })
                  }
                  placeholder="e.g., 123456789012"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="variantPrice">Selling Price ($)</Label>
                <Input
                  id="variantPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={variantForm.price}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="variantCostPrice">Cost Price ($)</Label>
                <Input
                  id="variantCostPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={variantForm.costPrice}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      costPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="variantStock">Stock</Label>
                <Input
                  id="variantStock"
                  type="number"
                  min="0"
                  value={variantForm.stock}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="variantMinStock">Min Stock</Label>
                <Input
                  id="variantMinStock"
                  type="number"
                  min="0"
                  value={variantForm.minStock}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      minStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="variantMaxStock">Max Stock</Label>
                <Input
                  id="variantMaxStock"
                  type="number"
                  min="0"
                  value={variantForm.maxStock}
                  onChange={(e) =>
                    setVariantForm({
                      ...variantForm,
                      maxStock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Variant Image</Label>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        document.getElementById("variantImageUpload")?.click()
                      }
                    >
                      <Upload className="size-4" />
                      Upload Image
                    </Button>
                    <input
                      id="variantImageUpload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setVariantForm({
                              ...variantForm,
                              imageUrl: reader.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Upload an image specific to this variant
                  </p>
                </div>
                {variantForm.imageUrl && (
                  <div className="relative">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <Image
                        src={variantForm.imageUrl}
                        alt="Variant preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 size-6 rounded-full"
                      onClick={() =>
                        setVariantForm({ ...variantForm, imageUrl: "" })
                      }
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsVariantModalOpen(false);
                setEditingVariant(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveVariant}
              disabled={
                !variantForm.name ||
                !variantForm.sku ||
                !variantForm.barcode ||
                !variantForm.variantValue ||
                (variantForm.variantType === "custom" &&
                  !variantForm.customVariantType)
              }
            >
              {editingVariant ? "Save Changes" : "Add Variant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Label Print */}
      <BarcodeLabelPrint
        open={labelPrintOpen}
        onOpenChange={setLabelPrintOpen}
        barcode={formData.barcode}
        productName={formData.name}
        price={formData.basePrice}
      />

      {/* Quick single-product label print */}
      <BarcodeLabelPrint
        open={!!quickLabelProduct}
        onOpenChange={(open) => {
          if (!open) setQuickLabelProduct(null);
        }}
        barcode={quickLabelProduct?.barcode || ""}
        productName={quickLabelProduct?.name || ""}
        price={quickLabelProduct?.basePrice || 0}
      />

      {/* Bulk price label printing */}
      <BulkPriceLabelPrint
        open={bulkLabelPrintOpen}
        onOpenChange={setBulkLabelPrintOpen}
        products={productList}
        selectedProductIds={selectedProductIds}
      />
    </div>
  );
}
