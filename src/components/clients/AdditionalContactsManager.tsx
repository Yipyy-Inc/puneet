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
import { useStaffText } from "@/lib/staff/use-staff-text";

/** value → catalogue key. The value is STORED on the contact; only the words
 *  are translated. */
const RELATIONSHIP_OPTIONS: [string, string][] = [
  ["Spouse", "relSpouse"],
  ["Partner", "relPartner"],
  ["Parent", "relParent"],
  ["Sibling", "relSibling"],
  ["Child", "relChild"],
  ["Friend", "relFriend"],
  ["Roommate", "relRoommate"],
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
  heading,
  description,
}: AdditionalContactsManagerProps) {
  const { t } = useStaffText("createClient");
  // The defaults were English literals in the signature. Two callers pass
  // neither and rely on them, so they move to the catalogue rather than away.
  const headingText = heading ?? t("additionalContacts");
  const descriptionText = description ?? t("acDefaultDescription");

  const updateContact = (id: string, patch: Partial<AdditionalContact>) => {
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
      tags: has
        ? contact.tags.filter((t) => t !== tag)
        : [...contact.tags, tag],
    });
  };

  const addContact = () => {
    onChange([...value, makeAdditionalContact()]);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {(headingText || descriptionText) && (
        <div className="space-y-1">
          {headingText && (
            <Label className="text-base font-semibold">{headingText}</Label>
          )}
          {descriptionText && (
            <p className="text-muted-foreground text-sm">{descriptionText}</p>
          )}
        </div>
      )}

      {value.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
          {t("acNone")}
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
          {t("acAdd")}
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

  const { t, fill } = useStaffText("createClient");
  return (
    <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {fill("acContactN", { n: index + 1 })}
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
            {t("acRemove")}
          </Button>
        )}
      </div>

      {disabled ? (
        <ContactReadOnly contact={contact} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-name`}>{t("acName")}</Label>
            <Input
              id={`${idBase}-name`}
              value={contact.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder={t("acFullName")}
            />
          </div>
          <RelationshipField
            idBase={idBase}
            value={contact.relationship}
            onChange={(v) => onUpdate({ relationship: v })}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-phone`}>{t("acPhone")}</Label>
            <Input
              id={`${idBase}-phone`}
              type="tel"
              value={contact.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-email`}>{t("acEmailOptional")}</Label>
            <Input
              id={`${idBase}-email`}
              type="email"
              value={contact.email ?? ""}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder={t("acEmailPlaceholder")}
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
  const { t } = useStaffText("createClient");
  const isPredefined = RELATIONSHIP_OPTIONS.some(([o]) => o === value);
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
      <Label htmlFor={`${idBase}-relationship`}>{t("acRelationship")}</Label>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={`${idBase}-relationship`}>
          <SelectValue placeholder={t("acSelectRelationship")} />
        </SelectTrigger>
        <SelectContent>
          {RELATIONSHIP_OPTIONS.map(([option, key]) => (
            <SelectItem key={option} value={option}>
              {t(key)}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_VALUE}>{t("acOther")}</SelectItem>
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          aria-label={t("acCustomRelationship")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("acSpecifyRelationship")}
        />
      )}
    </div>
  );
}

function ContactReadOnly({ contact }: { contact: AdditionalContact }) {
  const { t } = useStaffText("createClient");
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <User className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">
          {contact.name || t("acUnnamed")}
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
  const { t } = useStaffText("createClient");
  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Tag className="size-3" />
        {t("acTags")}
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
          <span className="text-muted-foreground text-xs">{t("acNoTags")}</span>
        )}
      </div>
    </div>
  );
}
