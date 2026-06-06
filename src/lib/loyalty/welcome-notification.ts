/**
 * "Welcome to the program" message — sent (portal + email) the first time a
 * customer earns points at a facility. Template-driven so a facility can later
 * override the copy; the default uses the five DEV variables: {programName},
 * {customerFirstName}, {pointsEarned}, {tierName}, {portalLink}. Pure.
 */

export interface WelcomeTemplateVars {
  programName: string;
  customerFirstName: string;
  pointsEarned: number;
  tierName: string;
  portalLink: string;
}

export const DEFAULT_WELCOME_SUBJECT =
  "Welcome to {programName}, {customerFirstName}! 🎉";

export const DEFAULT_WELCOME_BODY =
  "You just earned your first {pointsEarned} points in {programName} and " +
  "you're now a {tierName} member. Visit {portalLink} to track your points and " +
  "redeem rewards.";

function render(template: string, vars: WelcomeTemplateVars): string {
  const map: Record<string, string> = {
    programName: vars.programName,
    customerFirstName: vars.customerFirstName,
    pointsEarned: vars.pointsEarned.toLocaleString(),
    tierName: vars.tierName,
    portalLink: vars.portalLink,
  };
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in map ? map[key] : match,
  );
}

export interface WelcomeMessage {
  /** Used as the email subject and the portal notification title. */
  subject: string;
  body: string;
}

/**
 * Render the welcome subject + body from the template variables. Optional
 * `subject`/`body` overrides let a facility customise the copy while keeping the
 * same token set.
 */
export function buildWelcomeMessage(
  vars: WelcomeTemplateVars,
  overrides?: { subject?: string; body?: string },
): WelcomeMessage {
  return {
    subject: render(overrides?.subject ?? DEFAULT_WELCOME_SUBJECT, vars),
    body: render(overrides?.body ?? DEFAULT_WELCOME_BODY, vars),
  };
}
