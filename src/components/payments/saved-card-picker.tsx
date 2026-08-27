"use client";

import { CreditCard, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useRemoveSavedCard,
  useSavedCards,
  type SavedCard,
} from "@/lib/api/saved-cards";

// ============================================================================
// Choosing a card the customer already gave this facility.
//
// ── WHAT IS SHOWN IS ALL WE HAVE ──────────────────────────────────────────
//
// Brand, last four, expiry. The card lives at Clover; Postgres holds its
// identifiers and this display metadata, which is what keeps the deployment
// out of PCI scope. There is nothing else to show and nothing else to want.
//
// ── A CARD WITHOUT CONSENT IS SHOWN, AND REFUSED ──────────────────────────
//
// The charge route checks `consent_at` and refuses a card that has none, so a
// card in that state is rendered disabled WITH THE REASON rather than hidden.
// Hiding it would leave somebody looking for a card they know they saved,
// finding nothing, and saving it a second time.
// ============================================================================

export interface SavedCardPickerProps {
  clientId: string | null;
  /** The chosen card, or null for "use a new card". */
  selectedId: string | null;
  onSelect: (cardId: string | null) => void;
  /** Shown as the last option, so a new card is always reachable. */
  newCardLabel?: string;
  /** Offer removal. Off in a checkout, on in a customer's own wallet. */
  allowRemove?: boolean;
  className?: string;
}

function describe(card: SavedCard): string {
  const brand = card.brand ?? "Card";
  const tail = card.last4 ? ` ••••${card.last4}` : "";
  return `${brand}${tail}`;
}

function expiry(card: SavedCard): string | null {
  if (!card.expMonth || !card.expYear) return null;
  const year = String(card.expYear).slice(-2);
  return `${String(card.expMonth).padStart(2, "0")}/${year}`;
}

export function SavedCardPicker({
  clientId,
  selectedId,
  onSelect,
  newCardLabel = "Use a new card",
  allowRemove = false,
  className,
}: SavedCardPickerProps) {
  const { data: cards, isPending, error } = useSavedCards(clientId);
  const remove = useRemoveSavedCard(clientId);

  // No customer means no cards to offer — the new-card path is the only one,
  // and it is already on screen beneath this. Rendering an empty box would
  // suggest something is loading that never will.
  if (!clientId) return null;

  if (isPending) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex items-center gap-2 text-sm",
          className,
        )}
      >
        <Loader2 className="size-3.5 animate-spin" />
        Looking for saved cards…
      </div>
    );
  }

  // A failure here must not block taking the payment: the new-card fields are
  // still on screen and still work. Said quietly rather than as an error.
  if (error) return null;
  if (!cards || cards.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        Saved cards
      </p>

      <div className="space-y-1.5">
        {cards.map((card) => {
          const selected = selectedId === card.id;
          const exp = expiry(card);
          return (
            <div
              key={card.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                selected && "border-primary bg-primary/5",
                !card.chargeable && "opacity-60",
              )}
            >
              <button
                type="button"
                disabled={!card.chargeable}
                onClick={() => onSelect(card.id)}
                className="flex flex-1 items-center gap-2 text-left disabled:cursor-not-allowed"
              >
                <CreditCard className="text-muted-foreground size-4 shrink-0" />
                <span className="text-sm font-medium">{describe(card)}</span>
                {exp && (
                  <span className="text-muted-foreground font-[tabular-nums] text-xs">
                    {exp}
                  </span>
                )}
                {!card.chargeable && (
                  <span className="text-muted-foreground text-xs">
                    · saved without consent to charge
                  </span>
                )}
              </button>

              {allowRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${describe(card)}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate(card.id, {
                      onSuccess: () => {
                        // The removed card must stop being the selection, or
                        // the checkout would go on to charge a revoked card
                        // and be refused by the route.
                        if (selected) onSelect(null);
                      },
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left transition-colors",
            selectedId === null && "border-primary bg-primary/5",
          )}
        >
          <Plus className="text-muted-foreground size-4 shrink-0" />
          <span className="text-sm">{newCardLabel}</span>
        </button>
      </div>

      {remove.error && (
        <p className="text-destructive text-xs" role="alert">
          {remove.error.message}
        </p>
      )}
    </div>
  );
}
