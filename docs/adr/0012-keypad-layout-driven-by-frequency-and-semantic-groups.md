# ADR 0012: Keypad layout driven by frequency and semantic groups

- Status: accepted
- Date: 2026-06-30

## Context

The current product is no longer a generic calculator grid.

During mobile and PWA testing, two product needs became explicit:

- the most frequent commitment action is `+ =`
- users need faster visual recognition of specialized key families such as memory, tax, and conversion

At the same time, the domain model must stay clean:

- `Calculator` should not know anything about colors, button prominence, or finger reach
- arithmetic, tape, percentage, subtotal, and persistence rules already belong to the domain
- layout hierarchy belongs to delivery and product interaction, not to accounting logic

## Decision

Treat keypad hierarchy as a UI-level design decision with explicit structure:

- split the keypad into a utility block and a primary block
- split the primary block into a top row, a numeric block, and a symbols block
- keep `0` and `.` in the numeric block with normal numeric height
- make `+ =` visually dominant inside the symbols block only
- do not take extra height from the entire bottom numeric row
- assign semantic visual families to specialized key groups:
  - memory: `M+`, `M-`, `MR`, `MC`
  - tax: `TAX SET`, `TAX+`, `TAX-`
  - conversion: `RATE`, `CONV ->`, `<- CONV`

## Consequences

Positive:

- the keyboard better matches real accounting usage frequency
- the main commitment action `+ =` becomes easier to hit on mobile
- specialized capabilities become easier to scan without reading every label
- the domain remains free from presentation-only concerns

Negative:

- the UI CSS and markup become more intentional and less grid-uniform
- documentation must explain that keypad hierarchy is a product detail, not business logic

## Rejected alternatives

- Keep a flat uniform grid for every key: visually simpler, but worse for frequency-driven use.
- Make the whole bottom row taller to emphasize `+ =`: easier to implement, but incorrectly changes `0` and `.`.
- Push key-family meaning into the domain model: unnecessary coupling between accounting rules and presentation.
