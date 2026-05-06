"use client";

import { useState } from "react";
import { Trash2, Plus, Tag, Mail, Phone, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ADDITIONAL_CONTACT_TAGS,
  ADDITIONAL_CONTACT_TAG_LABELS,
  type AdditionalContact,
  type AdditionalContactTag,
} from "@/types/client";

const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Partner",
  "Parent",
  "Sibling",
  "Child",
  "Friend",
  "Roommate",
];

const OTHER_VALUE = "__other__";

export function makeAdditionalContact(
  partial: Partial<AdditionalContact> = {},
): AdditionalContact {
  return {
    id: partial.id ?? `ac-${crypto.randomUUID().slice(0, 8)}`,
    name: partial.name ?? "",
    relationship: partial.relationship ?? "",
    phone: partial.phone ?? "",
    email: partial.email ?? "",
    tags: partial.tags ?? [],
  };
}

interface AdditionalContactsManagerProps {
  value: AdditionalContact[];
  onChange: (contacts: AdditionalContact[]) => void;
  disabled?: boolean;
  /** Hide the "Add contact" button — for forms that limit creation. */
  hideAddButton?: boolean;
  className?: string;
  /** Override section heading. Pass empty string to hide. */
  heading?: string;
  description?: string;
}

export function AdditionalContactsManager({
  value,
  onChange,
  disabled = false,
  hideAddButton = false,
  className,
  heading = "Additional Contacts",
  description = "Add people who can be contacted for emergencies, pickup, or drop-off.",
}: AdditionalContactsManagerProps) {
  const updateContact = (
    id: string,
    patch: Partial<AdditionalContact>,
  ) => {
    onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeContact = (id: string) => {
    onChange(value.filter((c) => c.id !== id));
  };

  const toggleTag = (id: string, tag: AdditionalContactTag) => {
    const contact = value.find((c) => c.id === id);
    if (!contact) return;
    const has = contact.tags.includes(tag);
    updateContact(id, {
      tags: has ? contact.tags.filter((t) => t !== tag) : [...contact.tags, tag],
    });
  };

  const addContact = () => {
    onChange([...value, makeAdditionalContact()]);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {(heading || description) && (
        <div className="space-y-1">
          {heading && (
            <Label className="text-base font-semibold">{heading}</Label>
          )}
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      )}

      {value.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
          No additional contacts on file.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((contact, index) => (
            <ContactCard
              key={contact.id}
              index={index}
              contact={contact}
              disabled={disabled}
              onUpdate={(patch) => updateContact(contact.id, patch)}
              onRemove={() => removeContact(contact.id)}
              onToggleTag={(tag) => toggleTag(contact.id, tag)}
            />
          ))}
        </div>
      )}

      {!disabled && !hideAddButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addContact}
          className="gap-2"
        >
          <Plus className="size-4" />
          Add contact
        </Button>
      )}
    </div>
  );
}

interface ContactCardProps {
  index: number;
  contact: AdditionalContact;
  disabled: boolean;
  onUpdate: (patch: Partial<AdditionalContact>) => void;
  onRemove: () => void;
  onToggleTag: (tag: AdditionalContactTag) => void;
}

function ContactCard({
  index,
  contact,
  disabled,
  onUpdate,
  onRemove,
  onToggleTag,
}: ContactCardProps) {
  const idBase = `contact-${contact.id}`;

  return (
    <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Contact {index + 1}
        </p>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive h-7 gap-1"
          >
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        )}
      </div>

      {disabled ? (
        <ContactReadOnly contact={contact} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-name`}>Name</Label>
            <Input
              id={`${idBase}-name`}
              value={contact.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <RelationshipField
            idBase={idBase}
            value={contact.relationship}
            onChange={(v) => onUpdate({ relationship: v })}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-phone`}>Phone</Label>
            <Input
              id={`${idBase}-phone`}
              type="tel"
              value={contact.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-email`}>Email (optional)</Label>
            <Input
              id={`${idBase}-email`}
              type="email"
              value={contact.email ?? ""}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder="contact@example.com"
            />
          </div>
        </div>
      )}

      <TagPicker
        tags={contact.tags}
        disabled={disabled}
        onToggle={onToggleTag}
      />
    </div>
  );
}

function RelationshipField({
  idBase,
  value,
  onChange,
}: {
  idBase: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isPredefined = RELATIONSHIP_OPTIONS.includes(value);
  const [isCustom, setIsCustom] = useState(value !== "" && !isPredefined);

  const selectValue = isCustom ? OTHER_VALUE : value || undefined;

  const handleSelectChange = (next: string) => {
    if (next === OTHER_VALUE) {
      setIsCustom(true);
      onChange("");
    } else {
      setIsCustom(false);
      onChange(next);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${idBase}-relationship`}>Relationship</Label>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={`${idBase}-relationship`}>
          <SelectValue placeholder="Select relationship" />
        </SelectTrigger>
        <SelectContent>
          {RELATIONSHIP_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_VALUE}>Other</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          aria-label="Custom relationship"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Specify relationship"
        />
      )}
    </div>
  );
}

function ContactReadOnly({ contact }: { contact: AdditionalContact }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <User className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">
          {contact.name || "Unnamed contact"}
        </span>
        {contact.relationship && (
          <span className="text-muted-foreground text-xs">
            · {contact.relationship}
          </span>
        )}
      </div>
      {contact.phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="text-muted-foreground size-4" />
          {contact.phone}
        </div>
      )}
      {contact.email && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="text-muted-foreground size-4" />
          {contact.email}
        </div>
      )}
    </div>
  );
}

function TagPicker({
  tags,
  disabled,
  onToggle,
}: {
  tags: AdditionalContactTag[];
  disabled: boolean;
  onToggle: (tag: AdditionalContactTag) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Tag className="size-3" />
        Tags
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ADDITIONAL_CONTACT_TAGS.map((tag) => {
          const active = tags.includes(tag);
          if (disabled) {
            return active ? (
              <Badge key={tag} variant="secondary">
                {ADDITIONAL_CONTACT_TAG_LABELS[tag]}
              </Badge>
            ) : null;
          }
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {ADDITIONAL_CONTACT_TAG_LABELS[tag]}
            </button>
          );
        })}
        {disabled && tags.length === 0 && (
          <span className="text-muted-foreground text-xs">No tags</span>
        )}
      </div>
    </div>
  );
}
