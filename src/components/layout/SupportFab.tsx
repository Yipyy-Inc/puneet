"use client";

import { HelpCircle } from "lucide-react";

import {
  setSupportDrawerOpen,
  useSupportDrawer,
} from "@/lib/support-drawer-store";

/**
 * Floating Support entry point for the facility portal (FB-2). Fixed to the
 * bottom-right on every facility page: a 48px circular Yipyy-purple button that
 * expands on hover/focus to reveal a "Help & Support" label. Toggles the
 * Support Center panel (FB-3) through the support-drawer store. Mounted once in
 * the facility layout so it persists across navigation.
 */
export function SupportFab() {
  const { open } = useSupportDrawer();

  return (
    <button
      type="button"
      data-support-fab
      onClick={() => setSupportDrawerOpen(!open)}
      aria-label="Help & Support"
      aria-expanded={open}
      className="group fixed right-6 bottom-6 z-50 flex h-12 items-center gap-0 rounded-full bg-violet-600 px-3 text-white shadow-lg shadow-violet-600/30 transition-all duration-200 hover:gap-2 hover:bg-violet-700 hover:shadow-xl focus-visible:gap-2 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <HelpCircle className="size-6 shrink-0" />
      <span className="max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-200 group-hover:max-w-[140px] group-hover:opacity-100 group-focus-visible:max-w-[140px] group-focus-visible:opacity-100">
        Help &amp; Support
      </span>
    </button>
  );
}
