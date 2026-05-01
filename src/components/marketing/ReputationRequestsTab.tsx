"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Star,
  Search,
  Send,
  Globe,
  AlertCircle,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  Minus,
  Mail,
  Smartphone,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { reputationQueries } from "@/lib/api/reputation";
import type { ReputationRequest, ReputationRequestStatus, ReputationRating } from "@/types/reputation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`} />
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<ReputationRequestStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  not_sent: { label: "Not Sent", cls: "bg-muted text-muted-foreground", icon: <Minus className="h-3 w-3" /> },
  sent: { label: "Sent", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", icon: <Send className="h-3 w-3" /> },
  reminder_sent: { label: "Reminder Sent", cls: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", icon: <RotateCcw className="h-3 w-3" /> },
  rating_received: { label: "Rating Received", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", icon: <Star className="h-3 w-3" /> },
  public_push_sent: { label: "Public Push Sent", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", icon: <Globe className="h-3 w-3" /> },
  closed: { label: "Closed", cls: "bg-muted text-muted-foreground", icon: <CheckCircle2 className="h-3 w-3" /> },
};

function StatusPill({ status }: { status: ReputationRequestStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

function RatingBadge({ rating }: { rating: ReputationRating }) {
  const color =
    rating >= 4 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    : rating === 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
    : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>
      <Star className="h-3 w-3 fill-current" />{rating}
    </span>
  );
}

// ─── Audit drawer ─────────────────────────────────────────────────────────────

function AuditDrawer({ req, open, onClose }: { req: ReputationRequest; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Booking #{req.bookingId} — Reputation Trail</DialogTitle>
          <DialogDescription>
            {req.clientName} · {req.petName} · {req.serviceLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Channel</span>
              <span className="flex items-center gap-1 font-medium capitalize">
                {req.channel === "sms" ? <Smartphone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                {req.channel.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <StatusPill status={req.status} />
            </div>
            {req.rating && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rating</span>
                <RatingBadge rating={req.rating} />
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reminders sent</span>
              <span className="font-medium">{req.remindersCount}</span>
            </div>
            {req.publicLinkClicked && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Public platform</span>
                <span className="font-medium capitalize">{req.publicPlatform}</span>
              </div>
            )}
          </div>

          {/* Feedback */}
          {req.clientComment && (
            <div className="rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Client Comment</p>
              <p className="text-sm italic">"{req.clientComment}"</p>
            </div>
          )}
          {req.feedbackText && (
            <div className="rounded-xl border bg-red-50/50 dark:bg-red-950/20 p-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Internal Feedback (not public)
              </p>
              <p className="text-sm">{req.feedbackText}</p>
            </div>
          )}

          {/* Audit log */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Audit Log</p>
            <div className="relative pl-4 border-l-2 border-muted space-y-3">
              {req.auditLog.map((entry) => (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium leading-none">{entry.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.timestamp).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Requests tab ─────────────────────────────────────────────────────────────

export function ReputationRequestsTab() {
  const { data: requests = [] } = useQuery(reputationQueries.requests());
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [selectedReq, setSelectedReq] = useState<ReputationRequest | null>(null);
  const [sortField, setSortField] = useState<"sentAt" | "rating">("sentAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let list = [...requests];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.clientName.toLowerCase().includes(q) || r.petName.toLowerCase().includes(q)
      );
    }
    if (filterService !== "all") list = list.filter((r) => r.service === filterService);
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (filterRating !== "all") {
      const n = parseInt(filterRating);
      if (filterRating === "negative") list = list.filter((r) => r.rating !== undefined && r.rating <= 2);
      else list = list.filter((r) => r.rating === n);
    }

    list.sort((a, b) => {
      if (sortField === "sentAt") {
        const diff = new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      } else {
        const ra = a.rating ?? 0;
        const rb = b.rating ?? 0;
        return sortDir === "asc" ? ra - rb : rb - ra;
      }
    });

    return list;
  }, [requests, search, filterService, filterStatus, filterRating, sortField, sortDir]);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />;

  const services = [...new Set(requests.map((r) => r.service))];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients or pets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_STYLES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">★★★★★ 5 stars</SelectItem>
                <SelectItem value="4">★★★★ 4 stars</SelectItem>
                <SelectItem value="3">★★★ 3 stars</SelectItem>
                <SelectItem value="negative">★★ Negative (1–2)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Filter className="h-3.5 w-3.5" />
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client / Pet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("rating")}
                  >
                    <span className="flex items-center gap-1">Rating <SortIcon field="rating" /></span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("sentAt")}
                  >
                    <span className="flex items-center gap-1">Sent <SortIcon field="sentAt" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Staff</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const isNeg = req.rating !== undefined && req.rating <= 2;
                  return (
                    <tr
                      key={req.id}
                      className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer
                        ${isNeg ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
                      onClick={() => setSelectedReq(req)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                            ${isNeg ? "bg-red-100 text-red-700" : req.rating && req.rating >= 4 ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                            {req.clientName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium leading-none">{req.clientName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{req.petName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-sm">{req.serviceLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {req.channel === "sms" ? <Smartphone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          <span className="uppercase text-xs">{req.channel}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={req.status} />
                      </td>
                      <td className="px-4 py-3">
                        {req.rating ? (
                          <div className="flex items-center gap-2">
                            <RatingBadge rating={req.rating} />
                            {isNeg && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                            {req.publicLinkClicked && <ExternalLink className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(req.sentAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </div>
                        {req.remindersCount > 0 && (
                          <div className="flex items-center gap-1 mt-0.5 text-purple-600">
                            <RotateCcw className="h-3 w-3" />
                            {req.remindersCount} reminder{req.remindersCount > 1 ? "s" : ""}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {req.staffName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> Trail
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No requests match your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit drawer */}
      {selectedReq && (
        <AuditDrawer req={selectedReq} open={!!selectedReq} onClose={() => setSelectedReq(null)} />
      )}
    </div>
  );
}
