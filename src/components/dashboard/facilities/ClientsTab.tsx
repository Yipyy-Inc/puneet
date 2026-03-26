"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCheck, Mail, Phone } from "lucide-react";

interface Client {
  person: {
    name: string;
    email: string;
    phone?: string;
  };
  status: string;
}

interface ClientsTabProps {
  clients: Client[];
}

export function ClientsTab({ clients }: ClientsTabProps) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <UserCheck className="h-5 w-5" />
          Clients
          <Badge variant="secondary" className="ml-2">
            {clients.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                        {client.person.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      {client.person.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {client.person.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    {client.person.phone ? (
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {client.person.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        client.status === "active" ? "default" : "secondary"
                      }
                      className={
                        client.status === "active"
                          ? "bg-success text-success-foreground"
                          : ""
                      }
                    >
                      {client.status}
                    </Badge>
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
