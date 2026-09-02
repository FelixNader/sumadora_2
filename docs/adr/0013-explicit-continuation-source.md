# ADR 0013: Model the continuation source explicitly

- Status: accepted
- Date: 2026-09-01

## Context

After a subtotal, tax calculation, conversion, memory recall, or closed result, the
next operator may use the current value as its left operand. Previously that rule
was inferred from a combination of display text, expression tokens, and generic
state flags. A printed reference looks similar at the state level, but must not
become a calculation base.

That inference caused fragile transitions, especially when a derived value was
followed by multiplication or division.

## Decision

Store a `continuationSource` in calculator session state. It contains:

- the source origin: `subtotal`, `resolved-result`, or `none`
- the unformatted numeric value that may become the left operand of the next
  calculation

Only state transitions that produce a real calculation result may set a source.
Printing a reference only writes to the tape and leaves the source as `none`.
Opening the following operation consumes and clears the source.

## Consequences

Positive:

- continuation no longer depends on display/token coincidence
- subtotal, tax, conversion, memory, and closed-result flows share one explicit rule
- print-only actions cannot accidentally become arithmetic inputs

Negative:

- snapshots gain one more domain field
- every result-producing transition must deliberately declare whether it can continue

## Rejected alternatives

- Infer continuation by comparing the display against `expressionTokens`: compact,
  but ambiguous after derived values and after typing begins.
- Use `accumulatorContext` alone: it describes broad UI/session state, not the
  numeric origin that an operator is allowed to consume.
