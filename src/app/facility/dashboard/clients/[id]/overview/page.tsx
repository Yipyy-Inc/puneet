"use client";

import { use, useState } from "react";
import Link from "next/link";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { vaccinationRecords } from "@/data/pet-data";
import { clientCommunications } from "@/data/communications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BulkPaymentModal } from "@/components/bookings/BulkPaymentModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  PawPrint,
  Calendar,
  ExternalLink,
  DollarSign,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getPetAgeDisplay,
  isPetBirthdayThisWeek,
  daysUntilBirthday,
} from "@/lib/pet-utils";

export default function ClientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);
  const [noteText, setNoteText] = useState("");
  const [now] = useState(() => Date.now());
  const [bulkPayOpen, setBulkPayOpen] = useState(false);

  if (!client) return null;

  const clientBookings = bookings.filter((b) => b.clientId === clientId);
  const upcoming = clientBookings
    .filter(
      (b) =>
        (b.status === "confirmed" || b.status === "pending") &&
        new Date(b.startDate + "T00:00:00").getTime() >= now - 86400000,
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )
    .slice(0, 3);
  const completedBookings = clientBookings.filter(
    (b) => b.status === "completed",
  );
  const totalSpent = clientBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((s, b) => s + b.totalCost, 0);
  const avgSpent =
    completedBookings.length > 0 ? totalSpent / completedBookings.length : 0;

  // Unpaid invoices for bulk payment
  const unpaidBookings = clientBookings.filter(
    (b) => b.paymentStatus === "pending" && b.status !== "cancelled",
  );
  const totalOverdue = unpaidBookings.reduce(
    (s, b) => s + (b.invoice?.remainingDue ?? b.totalCost),
    0,
  );

  // Pet vaccination status
  const petVacStatus = client.pets.map((pet) => {
    const records = vaccinationRecords.filter((v) => v.petId === pet.id);
    const expired = records.filter(
      (v) => new Date(v.expiryDate).getTime() < now,
    );
    const expiringSoon = records.filter(
      (v) =>
        new Date(v.expiryDate).getTime() >= now &&
        new Date(v.expiryDate).getTime() - now < 30 * 86400000,
    );
    return { pet, records, expired, expiringSoon };
  });

  // Recent activity
  const recentComms = clientCommunications
    .filter((c) => c.clientId === clientId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, 5);

  const timeAgo = (ts: string) => {
    const diff = now - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return `${Math.floor(days / 30)}mo ago`;
    if (days > 0) return `${days}d ago`;
    const hrs = Math.floor(diff / 3600000);
    return hrs > 0 ? `${hrs}h ago` : "Just now";
  };

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-5 p-5 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm">
            {client.name} · Client since 2024
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href={`/facility/dashboard/clients/${id}`}>
            <ExternalLink className="size-3.5" />
            Full Profile
          </Link>
        </Button>
      </div>

      {/* Overdue balance banner */}
      {totalOverdue > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
              <DollarSign className="size-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">
                Outstanding Balance:{" "}
                <span className="font-[tabular-nums]">
                  ${totalOverdue.toFixed(2)}
                </span>
              </p>
              <p className="text-xs text-red-600">
                {unpaidBookings.length} unpaid invoice
                {unpaidBookings.length !== 1 ? "s" : ""} from finished
                appointments
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
            onClick={() => setBulkPayOpen(true)}
          >
            <CreditCard className="size-3.5" />
            Collect Payment
          </Button>
        </div>
      )}

      {/* Key Metrics — vital stats with CTAs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/facility/dashboard/clients/${id}/bookings`}
          className="group"
        >
          <Card className="group-hover:border-primary/30 transition-all group-hover:shadow-sm">
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Calendar className="text-primary size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientBookings.length}</p>
                <p className="text-muted-foreground text-xs">Total Bookings</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link
          href={`/facility/dashboard/clients/${id}/billing`}
          className="group"
        >
          <Card className="transition-all group-hover:border-emerald-300 group-hover:shadow-sm">
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <DollarSign className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-[tabular-nums] text-2xl font-bold">
                  ${totalSpent.toFixed(0)}
                </p>
                <p className="text-muted-foreground text-xs">Total Spent</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/facility/dashboard/clients/${id}/pets`} className="group">
          <Card className="transition-all group-hover:border-blue-300 group-hover:shadow-sm">
            <CardContent className="flex items-center gap-3 pt-5 pb-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <PawPrint className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{client.pets.length}</p>
                <p className="text-muted-foreground text-xs">Pets</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="font-[tabular-nums] text-2xl font-bold">
                ${avgSpent.toFixed(0)}
              </p>
              <p className="text-muted-foreground text-xs">Avg per Booking</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left — 3 cols */}
        <div className="space-y-5 lg:col-span-3">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="size-4" />
                  Upcoming Appointments
                </CardTitle>
                <Link href={`/facility/dashboard/clients/${id}/bookings`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                  >
                    View All
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No upcoming appointments
                </p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((b) => {
                    const bPet = client.pets.find(
                      (p) =>
                        p.id ===
                        (Array.isArray(b.petId) ? b.petId[0] : b.petId),
                    );
                    return (
                      <Link
                        key={b.id}
                        href={`/facility/dashboard/clients/${id}/bookings/${b.id}`}
                        className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                      >
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-lg",
                            b.status === "confirmed"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-amber-100 text-amber-600",
                          )}
                        >
                          <Calendar className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium capitalize">
                            {b.service}
                            {bPet && (
                              <span className="text-muted-foreground font-normal">
                                {" "}
                                · {bPet.name}
                              </span>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(b.startDate)}
                            {b.checkInTime && ` at ${b.checkInTime}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize"
                          >
                            {b.status}
                          </Badge>
                          <p className="mt-0.5 font-[tabular-nums] text-sm font-medium">
                            ${b.totalCost}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <StickyNote className="size-4" />
                Client Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a client note..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && noteText.trim()) {
                      toast.success("Note added");
                      setNoteText("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (noteText.trim()) {
                      toast.success("Note added");
                      setNoteText("");
                    }
                  }}
                  disabled={!noteText.trim()}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                <div className="bg-muted/20 rounded-lg border px-3 py-2.5">
                  <p className="text-sm">
                    Prefers morning drop-offs. Buddy gets anxious with loud
                    noises — keep away from barking areas.
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Jessica M. · 2 days ago
                  </p>
                </div>
                <div className="bg-muted/20 rounded-lg border px-3 py-2.5">
                  <p className="text-sm">
                    Client mentioned interest in swim sessions for Buddy. Follow
                    up after next boarding stay.
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Amy C. · 1 week ago
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Activity (30 days) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4" />
                  Recent Activity
                </CardTitle>
                <Link href={`/facility/dashboard/clients/${id}/messages`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                  >
                    Full History
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentComms.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-2">
                  {recentComms.map((comm) => (
                    <div
                      key={comm.id}
                      className="flex items-start gap-3 py-1.5"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                          comm.type === "email"
                            ? "bg-blue-100 text-blue-600"
                            : comm.type === "sms"
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-violet-100 text-violet-600",
                        )}
                      >
                        {comm.type === "email" ? (
                          <Mail className="size-3.5" />
                        ) : comm.type === "sms" ? (
                          <Phone className="size-3.5" />
                        ) : (
                          <MessageSquare className="size-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          {comm.subject || comm.type.toUpperCase()}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {comm.content}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {timeAgo(comm.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — 2 cols — Pets with vaccination status */}
        <div className="space-y-5 lg:col-span-2">
          {/* Pets with vaccination highlights */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <PawPrint className="size-4" />
                  Pets ({client.pets.length})
                </CardTitle>
                <Link href={`/facility/dashboard/clients/${id}/pets`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                  >
                    View All
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {petVacStatus.map(({ pet, expired, expiringSoon }) => {
                const birthday = isPetBirthdayThisWeek(pet.dateOfBirth);
                const daysTo = daysUntilBirthday(pet.dateOfBirth);
                const hasVacIssue =
                  expired.length > 0 || expiringSoon.length > 0;
                return (
                  <Link
                    key={pet.id}
                    href={`/facility/dashboard/clients/${id}/pets/${pet.id}`}
                    className="hover:bg-muted/50 block rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                        <PawPrint className="text-primary size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold">{pet.name}</p>
                          {birthday && (
                            <span
                              className="text-sm"
                              title={`Birthday in ${daysTo} days!`}
                            >
                              🎂
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {pet.breed} · {getPetAgeDisplay(pet)} · {pet.weight}{" "}
                          lbs
                        </p>

                        {/* Vaccination status — auto-highlighted */}
                        {hasVacIssue && (
                          <div className="mt-2 space-y-1">
                            {expired.length > 0 && (
                              <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                                <XCircle className="size-3 shrink-0" />
                                {expired.length} vaccine
                                {expired.length > 1 ? "s" : ""} expired
                              </div>
                            )}
                            {expiringSoon.length > 0 && (
                              <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                                <AlertTriangle className="size-3 shrink-0" />
                                {expiringSoon.length} expiring soon
                              </div>
                            )}
                          </div>
                        )}
                        {!hasVacIssue && (
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
                            <CheckCircle className="size-3" />
                            Vaccines up to date
                          </div>
                        )}

                        {/* Allergy alert */}
                        {pet.allergies && pet.allergies !== "None" && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-red-600">
                            <ShieldCheck className="size-3" />
                            Allergy: {pet.allergies}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Contact at a glance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {client.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="text-muted-foreground size-4 shrink-0" />
                  {client.phone}
                </div>
              )}
              {client.address?.street && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="text-muted-foreground size-4 shrink-0" />
                  <span>
                    {client.address.street}, {client.address.city},{" "}
                    {client.address.state}
                  </span>
                </div>
              )}
              {client.emergencyContact?.name && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <p className="font-medium">Emergency Contact</p>
                  <p className="mt-0.5">
                    {client.emergencyContact.name} (
                    {client.emergencyContact.relationship}) ·{" "}
                    {client.emergencyContact.phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Membership & Packages */}
          {(client.membership || client.packages?.length) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Membership & Packages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.membership && (
                  <div className="bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">
                        {client.membership.plan} Plan
                      </p>
                      <p className="text-muted-foreground text-xs capitalize">
                        {client.membership.status}
                        {client.membership.benefits.discountPercent &&
                          ` · ${client.membership.benefits.discountPercent}% off`}
                      </p>
                    </div>
                    <Badge
                      variant={
                        client.membership.status === "active"
                          ? "default"
                          : "secondary"
                      }
                      className="capitalize"
                    >
                      {client.membership.status}
                    </Badge>
                  </div>
                )}
                {client.packages?.map((pkg) => (
                  <div key={pkg.id} className="rounded-lg border px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{pkg.name}</p>
                      <span className="text-xs font-medium">
                        {pkg.remainingCredits}/{pkg.totalCredits}
                      </span>
                    </div>
                    <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{
                          width: `${(pkg.usedCredits / pkg.totalCredits) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BulkPaymentModal
        open={bulkPayOpen}
        onOpenChange={setBulkPayOpen}
        clientName={client.name}
        invoices={unpaidBookings.map((b) => {
          const bPet = client.pets.find(
            (p) =>
              p.id === (Array.isArray(b.petId) ? b.petId[0] : b.petId),
          );
          return {
            bookingId: b.id,
            invoiceId: b.invoice?.id ?? `INV-${b.id}`,
            service: b.service,
            date: b.startDate,
            petName: bPet?.name ?? "Pet",
            total: b.invoice?.total ?? b.totalCost,
            paid: b.invoice?.depositCollected ?? 0,
            remaining: b.invoice?.remainingDue ?? b.totalCost,
          };
        })}
        onConfirm={() => {}}
      />
    </div>
  );
}
