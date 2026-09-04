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
      className="group fixed right-6 bottom-6 z-50 flex h-12 items-center gap-0 rounded-full bg-violet-600 px-3 text-white shadow-lg shadow-violet-600/30 transition-all duration-200 hover:bg-violet-700 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:outline-none lg:hover:gap-2 lg:focus-visible:gap-2"
    >
      <HelpCircle className="size-6 shrink-0" />
      {/* The expanding label is a DESKTOP flourish and says so in its
          breakpoints, which is also why the gate does not count it: both
          halves of the hide are behind `lg:`.

          It was briefly made persistent everywhere, on the reading that §6
          rule 11 covers anything a pointer reveals. At 599px that put a
          140px pill across the bottom tab bar's last item, which is a worse
          bug than the one it fixed — and the reading was wrong anyway. Rule
          11 is about CONTROLS. The control here is the button, it is visible
          in every context, and `aria-label` gives it a complete name with or
          without this span. A decorative label is not an affordance. */}
      <span className="hidden max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-200 lg:inline-block lg:opacity-0 lg:group-hover:max-w-[140px] lg:group-hover:opacity-100 lg:group-focus-visible:max-w-[140px] lg:group-focus-visible:opacity-100">
        Help &amp; Support
      </span>
    </button>
  );
}
