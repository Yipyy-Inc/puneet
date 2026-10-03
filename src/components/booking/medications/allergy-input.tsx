"use client";

import { useState } from "react";

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
        <span
          key={value}
          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-(--care-allergy-bg) pr-1.5 pl-3 text-[14px] font-medium text-(--care-allergy-ink)"
        >
          <span className="whitespace-normal">{value}</span>
          <button
            type="button"
            aria-label={removeLabel(value)}
            onClick={() => onChange(values.filter((v) => v !== value))}
            className="focus-visible:outline-primary flex size-[26px] items-center justify-center rounded-full text-[16px] focus-visible:outline-2"
          >
            <span aria-hidden>×</span>
          </button>
        </span>
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
        className="h-10 w-[200px] max-w-full px-3.5 text-[14px] max-lg:h-10"
      />
    </div>
  );
}
