"use client";

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
import { MapPin, Building, ChevronRight } from "lucide-react";

interface Location {
  name: string;
  address: string;
  services: string[];
}

interface LocationsTabProps {
  locations: Location[];
}

export function LocationsTab({ locations }: LocationsTabProps) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <MapPin className="h-5 w-5" />
          Locations
          <Badge variant="secondary" className="ml-2">
            {locations.length}
          </Badge>
        </CardTitle>
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
              {locations.map((location, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
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
                      <MapPin className="h-3.5 w-3.5" />
                      {location.address}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {location.services.map((service: string) => (
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
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
