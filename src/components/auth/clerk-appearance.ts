import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

/**
 * Clerk ships its appearance types in `@clerk/types`, which is not a direct
 * dependency here and is not re-exported by `@clerk/nextjs`. Deriving the type
 * from the component's own prop keeps full checking — a misspelled element key
 * still fails the build — without adding a package whose version would then
 * have to be kept in step with the SDK's.
 */
type ClerkAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

// ============================================================================
// How Clerk's widget is dressed so it reads as part of Yipyy.
//
// The page chrome — gradient, card, wordmark, heading, sub-copy, the footer
// link — is ours, rendered by AuthCard. Clerk contributes only the credential
// controls. So everything Clerk would draw AROUND those controls is turned off
// here, otherwise the screen shows two nested cards and two headings.
//
// Styled with Tailwind classes rather than Clerk's `variables` colour map, so
// the buttons pick up the same shadcn design tokens as the rest of the app and
// follow light/dark automatically. A hex palette duplicated here would drift
// the first time the theme changed.
//
// NOTE ON "Secured by Clerk": deliberately NOT hidden. On the free plan that
// attribution is part of the deal — removing it is a Pro feature, toggled in
// Clerk Dashboard → Customization → Branding. Suppressing it with CSS would be
// circumventing a paid feature, so the toggle is the way to do it.
// ============================================================================

export const yipyyClerkAppearance: ClerkAppearance = {
  // No `layout` key: on a component's `appearance` the type is Theme, which
  // covers elements/variables only — layout options belong on ClerkProvider.
  // Both settings we wanted are expressible through `elements` anyway.
  elements: {
    // ── Strip Clerk's shell: AuthCard is the card ──────────────────────────
    rootBox: "w-full",
    // AuthCard already shows the Yipyy wordmark; Clerk's own logo slot would
    // stack a second brand mark on the first.
    logoBox: "hidden",
    cardBox: "w-full shadow-none border-0 bg-transparent",
    card: "w-full shadow-none border-0 bg-transparent p-0 gap-4",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",

    // ── The controls we keep ───────────────────────────────────────────────
    socialButtons: "w-full gap-2",
    socialButtonsBlockButton:
      "w-full h-11 rounded-md border border-input bg-background text-foreground " +
      "font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
    socialButtonsBlockButtonText: "text-sm font-medium",

    formButtonPrimary:
      "h-11 rounded-md bg-primary text-primary-foreground font-medium " +
      "hover:bg-primary/90 transition-colors normal-case",
    formFieldInput:
      "h-11 rounded-md border border-input bg-background text-foreground",
    formFieldLabel: "text-sm font-medium text-foreground",

    dividerLine: "bg-border",
    dividerText: "text-muted-foreground text-xs",

    // Our own link sits in AuthCard's footer, so Clerk's would be a duplicate.
    footerAction: "hidden",

    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "text-primary",
    formResendCodeLink: "text-primary",
    otpCodeFieldInput: "border border-input rounded-md text-foreground",
  },
};
