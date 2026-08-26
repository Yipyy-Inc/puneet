"use client";

import { useState } from "react";
import { Check, Loader2, Lock, Mail } from "lucide-react";

import styles from "../coming-soon.module.css";

// ============================================================================
// The waitlist form.
//
// ── IT SAYS "YOU'RE ON THE LIST" ONLY WHEN THAT IS TRUE ───────────────────
//
// The prototype's submit handler is `() => this.setState({ submitted: true })`
// — correct for a mockup, and a lie in production. This awaits
// `POST /api/waitlist` and shows the done state only on a 2xx. A failure keeps
// the form on screen with everything the visitor typed still in it, because
// asking somebody to re-enter four fields after OUR error loses the lead.
//
// ── PLAIN useState, NOT TANSTACK FORM ─────────────────────────────────────
//
// Four known fields and one submit. CLAUDE.md reserves TanStack Form for static
// CRUD forms and every money modal here uses this shape — a `busy` flag, a
// `problem` string, and the dialog staying put on failure. `RefundModal` is the
// model.
// ============================================================================

interface Fields {
  facilityName: string;
  contactName: string;
  email: string;
  phone: string;
}

const EMPTY: Fields = {
  facilityName: "",
  contactName: "",
  email: "",
  phone: "",
};

export function WaitlistForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const set =
    (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFields((current) => ({ ...current, [key]: event.target.value }));
      setProblem(null);
    };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    // Checked here so the visitor is told immediately rather than after a round
    // trip. The server validates the same three independently — this is a
    // courtesy, never the boundary.
    if (
      !fields.facilityName.trim() ||
      !fields.contactName.trim() ||
      !fields.email.trim()
    ) {
      setProblem("Facility name, contact name and email are all needed.");
      return;
    }

    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const body = (await response.json().catch(() => null)) as {
        joined?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !body?.joined) {
        setProblem(body?.error ?? "Something went wrong. Try again.");
        return;
      }
      setJoined(true);
    } catch {
      // The request never landed. Said as a connection problem rather than a
      // rejection, so the visitor retries rather than assuming they were turned
      // away.
      setProblem("We could not reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  if (joined) {
    return (
      <div className={styles.done}>
        <span className={styles.doneMark} aria-hidden="true">
          <Check size={28} strokeWidth={2} />
        </span>
        <h2 className={styles.doneTitle}>You&apos;re on the list</h2>
        <p className={styles.doneLede}>
          We&apos;ll email you before launch with your early-adopter invitation.
        </p>
        <button
          type="button"
          className={styles.again}
          onClick={() => {
            setFields(EMPTY);
            setJoined(false);
          }}
        >
          Add another facility
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.formHead}>
        <span className={styles.formBadge} aria-hidden="true">
          <Mail size={26} strokeWidth={2} />
        </span>
        <h2 className={styles.formTitle}>Join the Waitlist</h2>
        <p className={styles.formLede}>
          Be first to know when we launch and unlock exclusive early-adopter
          deals.
        </p>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Facility Name</span>
        <input
          className={styles.input}
          value={fields.facilityName}
          onChange={set("facilityName")}
          placeholder="Enter facility name"
          autoComplete="organization"
          maxLength={120}
          disabled={busy}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Contact Name</span>
        <input
          className={styles.input}
          value={fields.contactName}
          onChange={set("contactName")}
          placeholder="Enter contact name"
          autoComplete="name"
          maxLength={120}
          disabled={busy}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Email</span>
        <input
          className={styles.input}
          type="email"
          value={fields.email}
          onChange={set("email")}
          placeholder="Enter email address"
          autoComplete="email"
          inputMode="email"
          maxLength={200}
          disabled={busy}
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Phone Number</span>
        <input
          className={styles.input}
          type="tel"
          value={fields.phone}
          onChange={set("phone")}
          placeholder="Enter phone number"
          autoComplete="tel"
          inputMode="tel"
          maxLength={40}
          disabled={busy}
        />
      </label>

      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? "Joining…" : "Join the Waitlist"}
      </button>

      {problem && (
        // `role="alert"` so a screen reader hears the refusal without hunting
        // for it — the visual position under the button is not enough on its
        // own.
        <p className={styles.problem} role="alert">
          {problem}
        </p>
      )}

      <div className={styles.privacy}>
        {busy ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : (
          <Lock size={14} strokeWidth={2} aria-hidden="true" />
        )}
        <span className={styles.privacyText}>
          We respect your privacy. No spam, ever.
        </span>
      </div>
    </form>
  );
}
