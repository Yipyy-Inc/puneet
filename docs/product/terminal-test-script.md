# Putting a card through the terminal

Card-present payments are built, and as of 2026-08-27 **no card has ever been
put through them on this infrastructure**. Twelve payments exist in the ledger
from earlier testing, but Terminal tender has never been pressed end to end and
terminal refunds have never been proven at all.

This is the script for closing that. It needs a Clover Flex paired to the
sandbox merchant and about ten minutes. Nothing here can be automated: the
assertions are about what a physical device displays and prints.

**Everything below is sandbox.** No real money moves. See the debt map — every
Clover connection in this database is sandbox.

---

## Before you start

Two facts that will otherwise waste the session.

**Use amounts under $100.** Clover's sandbox documents that transactions under
$100 approve and those over $100 return an error whose code is the amount's last
three digits. Measured evidence says it does not bind the terminal — six
card-present sandbox payments over $100 have succeeded — but it costs nothing to
stay under and removes the variable entirely.

**The device must be reachable.** If the Remote Application ID is unset, every
call answers `401 "Authentication successful, but no Remote Application ID has
been configured"`. That is a configuration problem, not a device problem, and it
looks like neither.

Test cards:

| Card                  | Does     |
| --------------------- | -------- |
| `4242 4242 4242 4242` | approves |
| `4005 5717 0222 2222` | declines |

Any future expiry, any three-digit CVV.

---

## 1 · The happy path

1. Open a booking with a balance **under $100**.
2. Choose **Terminal** as the payment method and pick the Flex.
3. Take the payment.

**On the device**, in order:

- the tip screen, showing **the facility's own three tips** from Settings → Tips,
  plus Custom and No Tip which Clover always adds
- the amount prompt
- present the card

**Then read the ledger back:**

```sql
select id, method, entry_method, processor_device_serial, subtotal, tax, tip,
       grand_total, card_brand, card_last4, auth_code, created_at
  from public.payments
 where facility_id = '<facility>'
 order by created_at desc limit 1;
```

What must be true:

- `method = 'terminal'`
- `entry_method` is `chip`, `contactless` or `swipe` — **not** `ecom`
- `processor_device_serial` is the Flex's serial, not null
- `tip` matches what was tapped on the device, not what any screen suggested
- `grand_total = subtotal + tax + tip`

And the intent it closed:

```sql
select status, payment_id, processor_payment_id
  from public.payment_intents
 order by created_at desc limit 1;
```

`status = 'approved'` and `payment_id` set. An intent left `pending` with a
payment in the ledger is the reconciliation gap this integration is built to
prevent — if you see it, stop and say so.

## 2 · The tip screen is the facility's, not the device's

Change the three tips at **Settings → Tips**, then take another payment.

The device must show the NEW values. If it shows 15/18/20 when you configured
something else, the suggestions are not reaching it and the terminal is falling
back to what Clover has configured on the hardware — which is the whole thing
that work existed to fix.

Then switch tips **off** and take a third payment. **The device must not ask for
a tip at all.**

## 3 · Cancelling

Start a payment, and before presenting a card press **Stop asking on the
terminal** in Yipyy.

- the device returns to its welcome screen
- no `payments` row appears
- the intent is not left `approved`

**This does not undo a payment.** If the card is presented at the same moment
the cancel arrives, the payment may still complete — that is expected, and §5 is
how it gets found.

## 4 · A decline

Take a payment and present `4005 5717 0222 2222`.

- Yipyy says the card was declined, in those words
- **no `payments` row is written** — a declined card is not money
- the intent records the decline rather than vanishing

## 5 · A lost response, which is the one that matters

Start a payment and **disconnect the machine running Yipyy from the network**
after the card is presented but before the response returns. (Turning off
wifi for ten seconds is enough.)

Yipyy should say either:

- _"The terminal did not answer, but a payment WAS taken and has been recorded.
  Do not charge again."_ — and the `payments` row exists, or
- _"…and no payment was found."_ — and it is safe to retry.

It must never leave somebody guessing. This path runs the facility sweep
immediately rather than waiting up to fifteen minutes, and then checks **our own
intent** rather than the sweep's counters — because at a counter with two
terminals, "some lost sale was recovered" could be somebody else's customer.

## 6 · A refund, which has never been proven

Refund the payment from §1, in full.

```sql
select id, grand_total, refund_of_payment_id, created_at
  from public.payments
 where refund_of_payment_id is not null
 order by created_at desc limit 1;
```

The refund is a **negative** row referencing the original.

**Expect Clover to record it as a VOID, not a refund**, if you do this within
about 25 minutes of the sale. That is correct and documented: REST Pay Display
has no void endpoint, and Clover converts a refund inside the window. Read the
payment back at Clover and it will say `result: VOIDED` with an **empty**
refunds array. Reconciliation handles both shapes.

To see a true refund instead, wait out the window before refunding.

## 7 · The cash drawer, if one is attached

On **Daily Register**, press **Open drawer**.

A facility with no drawer gets told exactly that — "That terminal has no cash
drawer attached" — rather than a failure. That is the expected answer on a Flex
with nothing plugged into it, and is not a bug.

---

## If something is wrong

Record what the DEVICE showed, not only what Yipyy said. The two disagreeing is
the most useful diagnostic there is, and it is the half that is never in a log.

Then run the connection check at **Settings → Yipyy Pay → Overview**, which
states the environment and what the merchant account is permitted to do.
