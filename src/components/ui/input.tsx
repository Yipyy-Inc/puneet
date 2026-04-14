"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

const INPUT_BASE_CLASSES =
  "border-input selection:bg-primary selection:text-primary-foreground file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";

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
