-- ============================================================================
-- `ach` joins the tenders, and a note about why this keeps happening.
--
-- `PrepaymentModal` offers Card on file / Cash / Terminal / Bank-ACH.
-- 20260806800000 added terminal and e-transfer for the bulk dialog; this adds
-- the last one. Recording a bank transfer as a card would be false in the one
-- place falseness costs money — reconciliation against a bank statement.
--
-- ── FOUR DIALOGS, FOUR VOCABULARIES ────────────────────────────────────────
--
-- Worth writing down rather than fixing twice more:
--
--   grooming checkout   card-on-file, new-card, cash, package-pass, store-credit
--   bulk payment        card, cash, terminal, e_transfer
--   prepayment          card (on file), cash, terminal, ach
--   deposit charge      card (on file), cash, terminal
--
-- None is a subset of another, and "card" means a NEW card in one and a SAVED
-- card in two others — so the string cannot be mapped centrally without losing
-- which was meant. The mapping therefore lives at each call site, where the
-- label is visible, and `payments.method` is the union.
--
-- The real fix is one tender list the dialogs share. That is a product decision
-- about which tenders this business takes, not a migration.
-- ============================================================================

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('card-on-file', 'new-card', 'cash',
                    'package-pass', 'store-credit',
                    'terminal', 'e-transfer', 'ach'));

comment on constraint payments_method_check on public.payments is
  'How the money arrived. The UNION of what four separate dialogs offer — see the header of 20260806860000 for why they disagree and where the mapping lives.';
