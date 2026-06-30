# ADR 0011: Explicit tape sequences and percentage margin

- Status: accepted
- Date: 2026-06-30

## Context

Two ambiguities remained in the current product model.

First, the paper tape already represented operational truth, but it still lacked explicit domain-owned line identity:

- additive and multiplicative rows were visible
- subtotals and grand total were visible
- but there was no separate sequence for operational rows versus accounting summary rows

Second, business math already treated `MGN` as a percentage internally, but that meaning was not always explicit in visible output:

- `COST` and `SELL` are monetary values
- `MGN` is not a monetary value
- showing `30` instead of `30%` made the business output semantically weaker than the domain rule underneath

## Decision

Make both ideas explicit in the domain:

- the tape owns two independent sequences
- `OP nnnn` identifies operational rows
- `SUB nnnn` identifies subtotal and grand-total rows
- subtotal rows use `SUB nnnn OPS x value`
- grand-total rows use `SUB nnnn GT x value`
- clearing arithmetic session state does not reset those sequences while the visible tape remains
- clearing the tape does reset them
- `MGN` is expressed as a percentage in visible output
- when margin is entered or solved, tape output uses `%`
- when the solved result is `MGN`, display output also uses `%`

## Consequences

Positive:

- the tape becomes easier to audit as a paper-like ledger
- subtotal and grand total rows stop competing with ordinary operation rows for identity
- the visible business language now matches the real domain rule for margin

Negative:

- tape formatting becomes a stronger product decision inside the domain
- margin display is no longer a plain numeric string in every case

## Rejected alternatives

- Keep a single visual sequence for every row: simpler, but weaker for accounting traceability.
- Keep `MGN` numeric-looking and rely on user interpretation: shorter output, but ambiguous meaning.
- Push row sequencing to the UI: visually possible, but incorrect because tape identity belongs to domain behavior.
