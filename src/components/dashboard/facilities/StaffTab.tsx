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
import { Users, Mail } from "lucide-react";

interface StaffMember {
  person: {
    name: string;
    email: string;
  };
  role: string;
}

interface StaffTabProps {
  usersList: StaffMember[];
}

export function StaffTab({ usersList }: StaffTabProps) {
  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Staff Members
          <Badge variant="secondary" className="ml-2">
            {usersList.length}
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
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.map((user, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-full font-semibold text-xs text-white"
                        style={{
                          background:
                            user.role === "Admin"
                              ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                              : user.role === "Manager"
                                ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                                : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                        }}
                      >
                        {user.person.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      {user.person.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {user.person.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "Admin" ? "default" : "secondary"}
                      className={
                        user.role === "Admin"
                          ? "bg-primary"
                          : user.role === "Manager"
                            ? "bg-info text-info-foreground"
                            : ""
                      }
                    >
                      {user.role}
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
