# ADR 0007: Model the combined +/= key as domain behavior

- Status: accepted
- Date: 2026-06-29

## Context

The app exposes a combined `+ =` key inspired by accounting calculators and adding machines.

That key does not behave like a simple alias for `+`, and it also does not behave like a permanent alias for `=`.

Its meaning depends on the current calculation state:

- when the user has just typed a number, `+ =` must register that value as a new additive line
- when the user presses `+ =` again without typing a new number, the machine must print the additive total
- after printing that total, typing a new number and pressing `+ =` must continue accumulating from the printed total instead of starting a malformed new expression

An earlier implementation tried to infer this behavior in the application layer from `waitingForNewEntry`.

That approach was too weak:

- it treated a domain rule as a UI dispatch heuristic
- it could close an additive sequence, but it did not model how that closed total should continue
- it produced hybrid states where the tape looked like an adding machine, while the expression model still behaved like a simple calculator

## Decision

Treat the combined `+ =` key as a domain concept.

The `Calculator` aggregate now owns this behavior through `plusEquals()`.

The domain decides whether the key should:

- commit a new additive line
- print the current additive total
- continue accumulating from a previously printed total

The application layer only forwards the intent `+=` to the aggregate. It no longer decides from outside whether that intent means `add()` or `equals()`.

## Consequences

Positive:

- The adding-machine flow lives where the business rule belongs: the domain.
- The web button and any future adapter can share the same semantic behavior.
- Continuing after a printed total now matches the expected accounting flow.
- The tape and the internal calculation state stay aligned more reliably.

Negative:

- The aggregate now carries one more product-specific behavior instead of leaving everything to generic arithmetic commands.
- The project explicitly accepts that a combined accounting key is not equivalent to a standard calculator key layout.

## Rejected alternatives

- Keep deciding `+=` in the UI or application layer: easy to patch, but semantically wrong and fragile.
- Treat `+=` as `add()` only: prevents printing totals with the same key.
- Treat `+=` as `equals()` only when already waiting: closes totals, but breaks continuation from printed totals unless the domain also models that transition.
