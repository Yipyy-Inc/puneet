"use client";

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ============================================================================
// Drug allergies: each one a chip, typed and added with Enter, removed with
// its ×. A chip is an alert, so it is the §3 "overdue" mark — its wash, its
// ink and a glyph, because colour is never the only channel.
// ============================================================================

export function AllergyInput({
  id,
  values,
  onChange,
  placeholder,
  removeLabel,
}: {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  /** "Remove {name}". */
  removeLabel: (name: string) => string;
}) {
  const [typed, setTyped] = useState("");
  const add = () => {
    const value = typed.trim();
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setTyped("");
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {values.map((value) => (
        <Badge key={value} variant="overdue" className="h-auto min-h-9 pr-1">
          <TriangleAlert aria-hidden />
          <span className="whitespace-normal">{value}</span>
          <button
            type="button"
            aria-label={removeLabel(value)}
            onClick={() => onChange(values.filter((v) => v !== value))}
            className="hover:bg-card focus-visible:outline-primary flex size-7 items-center justify-center rounded-full focus-visible:outline-2"
          >
            <X className="size-4" aria-hidden />
          </button>
        </Badge>
      ))}
      <Input
        id={id}
        value={typed}
        placeholder={placeholder}
        onChange={(event) => setTyped(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        onBlur={add}
        className="w-56 max-w-full"
      />
    </div>
  );
}
