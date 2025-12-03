"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PawPrint, Clock, MapPin, Package, Plus, Trash2 } from "lucide-react";
import { facilities } from "@/data/facilities";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string;
}

export default function StoreServicePage() {
  // Static facility ID for now
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const locations = facility?.locationsList || [];

  // Mock store settings
  const [settings, setSettings] = useState({
    enabled: true,
    onlineStoreEnabled: false,
    availableLocations: ["Main Location"], // Default to first location
    description: "Online store for pet supplies, toys, and accessories.",
    rules:
      "All products are subject to availability. Custom orders may take additional time.",
    products: [
      {
        id: "1",
        name: "Dog Leash",
        price: 15,
        stock: 25,
        category: "Accessories",
        description: "Durable nylon leash",
      },
      {
        id: "2",
        name: "Cat Toy",
        price: 8,
        stock: 50,
        category: "Toys",
        description: "Interactive feather toy",
      },
      {
        id: "3",
        name: "Pet Shampoo",
        price: 12,
        stock: 30,
        category: "Grooming",
        description: "Gentle formula for all pets",
      },
    ] as Product[],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  const handleEdit = () => {
    setIsEditing(true);
    setTempSettings(settings);
  };

  const handleSave = () => {
    setSettings(tempSettings);
    setIsEditing(false);
    // TODO: Save to backend
  };

  const handleCancel = () => {
    setTempSettings(settings);
    setIsEditing(false);
  };

  const handleLocationChange = (locationName: string, checked: boolean) => {
    const currentLocations = tempSettings.availableLocations;
    if (checked) {
      setTempSettings({
        ...tempSettings,
        availableLocations: [...currentLocations, locationName],
      });
    } else {
      setTempSettings({
        ...tempSettings,
        availableLocations: currentLocations.filter(
          (loc) => loc !== locationName,
        ),
      });
    }
  };

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: "",
      price: 0,
      stock: 0,
      category: "",
      description: "",
    };
    setTempSettings({
      ...tempSettings,
      products: [...tempSettings.products, newProduct],
    });
  };

  const updateProduct = (
    id: string,
    field: keyof Product,
    value: string | number,
  ) => {
    setTempSettings({
      ...tempSettings,
      products: tempSettings.products.map((product) =>
        product.id === id ? { ...product, [field]: value } : product,
      ),
    });
  };

  const removeProduct = (id: string) => {
    setTempSettings({
      ...tempSettings,
      products: tempSettings.products.filter((product) => product.id !== id),
    });
  };

  const currentSettings = isEditing ? tempSettings : settings;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {"Store Management"}
          </h2>
          <p className="text-muted-foreground">
            Manage your online store and inventory
          </p>
        </div>
        <Badge variant={settings.enabled ? "default" : "secondary"}>
          {settings.enabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable Store Service</Label>
              <Switch
                id="enabled"
                checked={currentSettings.enabled}
                onCheckedChange={(checked) =>
                  setTempSettings({ ...tempSettings, enabled: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="online">Enable Online Store</Label>
              <Switch
                id="online"
                checked={currentSettings.onlineStoreEnabled}
                onCheckedChange={(checked) =>
                  setTempSettings({
                    ...tempSettings,
                    onlineStoreEnabled: checked,
                  })
                }
                disabled={!isEditing}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, customers can browse and purchase products from your
              store.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Store Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Store hours can be configured in facility settings.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Available Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {locations.map((location) => (
            <div key={location.name} className="flex items-center space-x-2">
              <Checkbox
                id={`location-${location.name}`}
                checked={currentSettings.availableLocations.includes(
                  location.name,
                )}
                onCheckedChange={(checked) =>
                  handleLocationChange(location.name, checked as boolean)
                }
                disabled={!isEditing}
              />
              <Label htmlFor={`location-${location.name}`}>
                {location.name} - {location.address}
              </Label>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            Select the locations where products can be picked up.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Management
          </CardTitle>
          {isEditing && (
            <Button onClick={addProduct} size="sm" className="ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price ($)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Description</TableHead>
                {isEditing && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSettings.products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={product.name}
                        onChange={(e) =>
                          updateProduct(product.id, "name", e.target.value)
                        }
                        placeholder="Product name"
                      />
                    ) : (
                      product.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={product.category}
                        onValueChange={(value) =>
                          updateProduct(product.id, "category", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Accessories">
                            Accessories
                          </SelectItem>
                          <SelectItem value="Toys">Toys</SelectItem>
                          <SelectItem value="Grooming">Grooming</SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Health">Health</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      product.category
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={product.price}
                        onChange={(e) =>
                          updateProduct(
                            product.id,
                            "price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                    ) : (
                      `$${product.price}`
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={product.stock}
                        onChange={(e) =>
                          updateProduct(
                            product.id,
                            "stock",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                    ) : (
                      product.stock
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={product.description}
                        onChange={(e) =>
                          updateProduct(
                            product.id,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Description"
                      />
                    ) : (
                      product.description
                    )}
                  </TableCell>
                  {isEditing && (
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={currentSettings.description}
              onChange={(e) =>
                setTempSettings({
                  ...tempSettings,
                  description: e.target.value,
                })
              }
              disabled={!isEditing}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rules">Policies & Rules</Label>
            <Textarea
              id="rules"
              value={currentSettings.rules}
              onChange={(e) =>
                setTempSettings({
                  ...tempSettings,
                  rules: e.target.value,
                })
              }
              disabled={!isEditing}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {!isEditing ? (
          <Button onClick={handleEdit}>Edit Settings</Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </>
        )}
      </div>
    </div>
  );
}
