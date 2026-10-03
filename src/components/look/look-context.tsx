"use client";

import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";

// ============================================================================
// Client-mock LOOK SCOPES (2026-10-02) — CLAUDE.md § "Client mocks decide the
// look of the screens they cover".
//
// A screen the client drew in an HTML mock wears that mock's palette: a
// `[data-look~="<name>"]` block in globals.css redefines the :root variables
// for its subtree, so every token utility inside repaints without a per-file
// colour edit. Looks nest (the Feeding step is `care-step` inside the
// wizard's `booking`), so the attribute holds every name, outermost first,
// and the CSS matches whole words.
//
// Overlays are the catch. Radix portals Select, Popover, Tooltip, Dialog and
// the rest into <body> — outside the scope — so the shadcn wrappers read this
// context and STAMP the look (and any inline accent variables) onto their own
// Content element. They are not moved into the scope: a container inside the
// dialog frame would clip them and hide them from screen readers. With no
// look in context every wrapper renders exactly as before.
// ============================================================================

export type LookName = "booking" | "care-step" | "care-setup" | "eval-module";

export interface Look {
  names: readonly LookName[];
  /** Inline variables the scope root sets — the customer wizard's accent. */
  vars?: Record<string, string>;
}

const LookContext = createContext<Look | null>(null);

export function useLook(): Look | null {
  return useContext(LookContext);
}

/** True when the nearest scope (or any outer one) is `name`. */
export function useInLook(name: LookName): boolean {
  return useContext(LookContext)?.names.includes(name) ?? false;
}

/** The attributes a scope root, or an overlay stamped with it, carries. */
export function lookAttributes(
  look: Look | null,
  style?: CSSProperties,
): { "data-look"?: string; style?: CSSProperties } {
  if (!look || look.names.length === 0) return style ? { style } : {};
  return {
    "data-look": look.names.join(" "),
    style: look.vars ? ({ ...look.vars, ...style } as CSSProperties) : style,
  };
}

/** For an overlay's Content: the look of wherever it was opened from. */
export function useLookStamp(style?: CSSProperties) {
  return lookAttributes(useContext(LookContext), style);
}

/** Provides a look without rendering an element (for a dialog that stamps itself). */
export function LookProvider({
  look,
  children,
}: {
  look: Look | null;
  children: ReactNode;
}) {
  return <LookContext.Provider value={look}>{children}</LookContext.Provider>;
}

/**
 * A look for a subtree: the provider plus an element carrying the attribute
 * (`display: contents`, so it adds no box). Nests inside an outer look.
 */
export function LookScope({
  name,
  vars,
  children,
}: {
  name: LookName;
  vars?: Record<string, string>;
  children: ReactNode;
}) {
  const outer = useContext(LookContext);
  const look: Look = {
    names: outer ? [...outer.names, name] : [name],
    vars: outer?.vars || vars ? { ...outer?.vars, ...vars } : undefined,
  };
  return (
    <LookContext.Provider value={look}>
      <div className="contents" {...lookAttributes(look)}>
        {children}
      </div>
    </LookContext.Provider>
  );
}
