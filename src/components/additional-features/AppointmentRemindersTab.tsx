"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Send,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
} from "lucide-react";
import { appointmentReminders } from "@/data/additional-features";

export function AppointmentRemindersTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [reminders] = useState(appointmentReminders);

  const filteredReminders = reminders.filter(
    (reminder) =>
      reminder.petName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reminder.appointmentType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-700",
      scheduled: "bg-blue-500/10 text-blue-700",
      completed: "bg-green-500/10 text-green-700",
      overdue: "bg-red-500/10 text-red-700",
    };
    return styles[status as keyof typeof styles] || "";
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      grooming: "bg-purple-500/10 text-purple-700",
      vet: "bg-blue-500/10 text-blue-700",
      vaccination: "bg-green-500/10 text-green-700",
      checkup: "bg-orange-500/10 text-orange-700",
    };
    return styles[type as keyof typeof styles] || "";
  };

  const stats = {
    total: reminders.length,
    pending: reminders.filter((r) => r.status === "pending").length,
    overdue: reminders.filter((r) => r.status === "overdue").length,
    sentThisWeek: reminders.filter((r) => r.reminderSent).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Reminders
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending
                </p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sent This Week
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.sentThisWeek}
                </p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Appointment Reminders</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pet, owner, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Reminder
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pet</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Reminder</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReminders.map((reminder) => (
                <TableRow key={reminder.id}>
                  <TableCell className="font-medium">
                    {reminder.petName}
                  </TableCell>
                  <TableCell>{reminder.ownerName}</TableCell>
                  <TableCell>
                    <Badge className={getTypeBadge(reminder.appointmentType)}>
                      {reminder.appointmentType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(reminder.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(reminder.status)}>
                      {reminder.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {reminder.lastReminderDate ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {new Date(reminder.lastReminderDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {reminder.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!reminder.reminderSent && (
                        <Button variant="outline" size="sm">
                          <Send className="h-3 w-3 mr-1" />
                          Send
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

