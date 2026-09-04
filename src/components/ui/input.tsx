"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

// ============================================================================
// The text field. docs/design-system/design-system.md §5 (controls), §5c
// (forms), §5g (French), §6 rule 7.
//
//   height   40px MINIMUM, never fixed · 48 below 1024px
//   shape    full pill, 1px --line-strong on --card, padding 0 16px
//   focus    2px --primary + 0 0 0 3px rgba(22,104,227,.12)
//   invalid  the same, in --error-dot / rgba(210,69,69,.12)
//
// ── `min-h`, NOT `h`, AND THAT IS THE PART THAT WAS A BUG ─────────────────
//
// This was `h-9`: 36px, and FIXED. §5c says "min-height: 40px — never a fixed
// height", and CLAUDE.md's French rule says why in general terms — "no fixed
// height on anything holding a translated string", because `common.save` grows
// 175% in French and growth is not monotonic. A fixed-height control clips its
// own value rather than growing, and it does it in the locale nobody on the
// team reads first. So the size change here is not a restyle with a §5g bug
// attached; it is the §5g fix, wearing the right shape.
//
// ── THE FOCUS RING IS AN INSET SHADOW, NOT A SECOND BORDER PIXEL ──────────
//
// §5 asks for a 2px border on focus and the field rests on 1px. Written
// literally that is a 1px layout shift every time somebody tabs into a field,
// which on a form of twelve fields is twelve small jumps. `inset 0 0 0 2px`
// paints exactly the same 2px edge inside the existing box and costs no
// layout, so the rendered result matches the spec and the page stays still.
// The outer `0 0 0 3px` halo is the spec's own second shadow, unchanged.
//
// ── WHAT WENT, AND WHY ────────────────────────────────────────────────────
//
//   `disabled:opacity-50`  rule 4 — opacity is never a de-emphasis tool; it
//                          rewrites every ratio in the subtree. Disabled is
//                          now --inset behind --ink-disabled, which passes on
//                          its own.
//   `md:text-sm`           a breakpoint override on the field's own size,
//                          which is what silently beat two arbitrary
//                          `text-[…]` values earlier in this redesign. One
//                          size now, at every width.
//   `shadow-xs`            §5 gives an input no elevation. A raised text
//                          field reads as a button.
//   `dark:` variants       there is no dark mode in this product.
// ============================================================================
const INPUT_BASE_CLASSES = `
  border-line-strong bg-card text-body-ink placeholder:text-ink-tertiary
  selection:bg-primary selection:text-primary-foreground
  flex min-h-10 w-full min-w-0 rounded-full border px-4 text-[14.5px]
  outline-none max-lg:min-h-12

  transition-[color,border-color,box-shadow] duration-120 ease-[ease]
  motion-reduce:transition-none

  focus-visible:border-primary
  focus-visible:shadow-[inset_0_0_0_2px_var(--primary),0_0_0_3px_rgba(22,104,227,0.12)]

  aria-invalid:border-error-dot
  aria-invalid:focus-visible:shadow-[inset_0_0_0_2px_var(--error-dot),0_0_0_3px_rgba(210,69,69,0.12)]

  disabled:bg-surface-inset disabled:text-ink-disabled
  disabled:cursor-not-allowed disabled:pointer-events-none

  file:text-body-ink file:inline-flex file:h-7 file:border-0
  file:bg-transparent file:text-sm file:font-medium
`;

const normalizeDateValue = (
  value: React.ComponentProps<"input">["value"] | undefined,
) => {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
};

const DateInputBridge = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      min,
      max,
      disabled,
      placeholder,
      id,
      name,
      required,
      autoFocus,
    },
    ref,
  ) => {
    const hiddenInputRef = React.useRef<HTMLInputElement>(null);
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<string>(
      normalizeDateValue(defaultValue),
    );

    const setRefs = (node: HTMLInputElement | null) => {
      hiddenInputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const currentValue = isControlled
      ? normalizeDateValue(value)
      : internalValue;
    const minValue = typeof min === "number" ? String(min) : (min ?? undefined);
    const maxValue = typeof max === "number" ? String(max) : (max ?? undefined);

    const handleValueChange = (nextValue: string) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }

      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = nextValue;
      }

      if (onChange) {
        const target =
          hiddenInputRef.current ??
          ({
            value: nextValue,
            name: name ?? "",
            id: id ?? "",
          } as HTMLInputElement);

        onChange({
          target,
          currentTarget: target,
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <div className="relative">
        <input
          ref={setRefs}
          type="date"
          id={id ? `${id}-hidden` : undefined}
          name={name}
          required={required}
          min={minValue}
          max={maxValue}
          value={currentValue}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <DatePicker
          id={id}
          value={currentValue}
          onValueChange={handleValueChange}
          min={minValue}
          max={maxValue}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={cn(INPUT_BASE_CLASSES, "justify-between", className)}
        />
      </div>
    );
  },
);
DateInputBridge.displayName = "DateInputBridge";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    if (type === "date") {
      return <DateInputBridge ref={ref} className={className} {...props} />;
    }

    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(INPUT_BASE_CLASSES, className)}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
