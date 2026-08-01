// ============================================================================
// Shared shape for every auth form's result.
//
// This lives apart from actions.ts because a "use server" module may only
// export async functions — a plain constant there is a build error, not a
// style issue. Types are erased so they could stay, but keeping the pair
// together is what makes the rule obvious to the next person.
// ============================================================================

export type AuthResult = {
  error: string | null;
  /** Set when the action succeeded and the page should show a confirmation. */
  success: string | null;
};

export const AUTH_INITIAL_STATE: AuthResult = { error: null, success: null };
