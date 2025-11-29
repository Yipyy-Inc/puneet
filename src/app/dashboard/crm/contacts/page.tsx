"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable, ColumnDef, FilterDef } from "@/components/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserCheck,
  Building2,
  Tag,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Search,
  MessageSquare,
} from "lucide-react";
import {
  contacts,
  Contact,
  contactTags,
  ContactTag,
  communicationHistory,
  getCommunicationByContact,
  getDecisionMakers,
} from "@/data/crm/contacts";

const tagColors: Record<string, string> = {
  "decision-maker": "bg-purple-100 text-purple-800",
  influencer: "bg-blue-100 text-blue-800",
  technical: "bg-cyan-100 text-cyan-800",
  financial: "bg-green-100 text-green-800",
  operations: "bg-orange-100 text-orange-800",
  "hot-lead": "bg-red-100 text-red-800",
  "cold-lead": "bg-gray-100 text-gray-800",
  referral: "bg-amber-100 text-amber-800",
  vip: "bg-yellow-100 text-yellow-800",
  "competitor-user": "bg-pink-100 text-pink-800",
};

export default function ContactsPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const decisionMakers = getDecisionMakers();
  const withFacility = contacts.filter((c) => c.facilityId);
  const recentContacts = [...contacts]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

  const columns: ColumnDef<Contact>[] = [
    {
      key: "name",
      label: "Contact",
      render: (contact) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {contact.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <div className="font-medium">{contact.name}</div>
            <div className="text-xs text-muted-foreground">{contact.title}</div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      render: (contact) => (
        <a
          href={`mailto:${contact.email}`}
          className="text-sm text-primary hover:underline"
        >
          {contact.email}
        </a>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      icon: Phone,
      render: (contact) => (
        <span className="text-sm">{contact.phone || "-"}</span>
      ),
    },
    {
      key: "facilityName",
      label: "Facility",
      icon: Building2,
      render: (contact) => (
        <span className="text-sm">
          {contact.facilityName || (
            <span className="text-muted-foreground">No facility</span>
          )}
        </span>
      ),
    },
    {
      key: "isDecisionMaker",
      label: "Decision Maker",
      render: (contact) =>
        contact.isDecisionMaker ? (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Yes
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
        ),
    },
    {
      key: "tags",
      label: "Tags",
      render: (contact) => (
        <div className="flex flex-wrap gap-1">
          {contact.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={`text-[10px] ${tagColors[tag] || "bg-gray-100"}`}
            >
              {tag}
            </Badge>
          ))}
          {contact.tags.length > 2 && (
            <Badge variant="secondary" className="text-[10px]">
              +{contact.tags.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "isDecisionMaker",
      label: "Role",
      options: [
        { value: "all", label: "All Contacts" },
        { value: "true", label: "Decision Makers" },
        { value: "false", label: "Non-Decision Makers" },
      ],
    },
  ];

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
  };

  const handleActions = (contact: Contact) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewContact(contact)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="h-4 w-4 mr-2" />
          Edit Contact
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Contact
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const contactCommunications = selectedContact
    ? getCommunicationByContact(selectedContact.id)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your contact database and communication history
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground">In database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Decision Makers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decisionMakers.length}</div>
            <p className="text-xs text-muted-foreground">Key contacts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Facility
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withFacility.length}</div>
            <p className="text-xs text-muted-foreground">
              Linked to leads/facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Communications
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {communicationHistory.length}
            </div>
            <p className="text-xs text-muted-foreground">Total logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Tags Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Contact Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {contactTags.map((tag) => {
              const count = contacts.filter((c) => c.tags.includes(tag)).length;
              return (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={`${tagColors[tag] || "bg-gray-100"} cursor-pointer hover:opacity-80`}
                >
                  {tag} ({count})
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={contacts}
            columns={columns}
            filters={filters}
            searchKey="name"
            searchPlaceholder="Search contacts..."
            actions={handleActions}
          />
        </CardContent>
      </Card>

      {/* Contact Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-6">
              {/* Contact Header */}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold">
                  {selectedContact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {selectedContact.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedContact.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedContact.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={tagColors[tag] || "bg-gray-100"}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                {selectedContact.isDecisionMaker && (
                  <Badge className="bg-purple-100 text-purple-800">
                    Decision Maker
                  </Badge>
                )}
              </div>

              {/* Contact Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="text-primary hover:underline"
                    >
                      {selectedContact.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedContact.phone || "Not provided"}</span>
                  </div>
                  {selectedContact.facilityName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedContact.facilityName}</span>
                    </div>
                  )}
                </div>
                <div>
                  {selectedContact.notes && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Notes
                      </div>
                      <p className="text-sm">{selectedContact.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Communication History */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Communication History
                </h4>
                {contactCommunications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No communication history
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactCommunications.map((comm) => (
                      <div
                        key={comm.id}
                        className="border rounded-lg p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {comm.type}
                            </Badge>
                            <span className="font-medium text-sm">
                              {comm.subject}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comm.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {comm.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
                <Button className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Contact
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
