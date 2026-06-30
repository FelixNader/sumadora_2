# ADR 0009: Percentage uses accumulated base in additive flows

- Status: accepted
- Date: 2026-06-30

## Context

The `%` key had reached a mathematically half-correct but semantically unstable state.

Simple cases such as `10 + 10% = 11` or `10 x 10% = 1` could be made to work, but chained flows still lacked an explicit domain rule:

- should additive percentage reuse the first operand forever
- or should it use the current accumulated total
- how should the paper tape describe the percentage step without printing misleading intermediate lines like `1 +`

For this project, the target is not a generic scientific calculator. It is a web adding machine / accounting calculator with a visible tape.

That means the percentage rule must optimize for accounting continuity, not only for isolated arithmetic.

## Decision

Adopt this domain rule for `%`:

- `%` alone converts the current entry into a percentage fraction
- in `+` and `-` flows, `%` uses the current accumulated base
- in `x` and `/` flows, `%` uses the direct percentage fraction of the current operand

Examples:

- `10 %` => `0.1`
- `10 + 10% =` => `11`
- `10 - 10% =` => `9`
- `10 x 10% =` => `1`
- `10 / 10% =` => `100`
- `10 + 10% + 10% =` => `12.1`

Tape policy is also part of the decision:

- additive flows print the percentage input as entered, for example `10 %`
- additive continuation must not print misleading materialized lines like `1 +`
- multiplicative and divisive flows may print both the percentage input and the resolved operation line

## Consequences

Positive:

- chained accounting percentages now have a stable and explicit rule
- the tape tells a more credible accounting story in additive flows
- the domain no longer depends on accidental UI interpretation of `%`

Negative:

- users expecting a frozen original-base rule for chained additive percentages will see different results
- tape formatting now intentionally differs between additive and multiplicative/divisive percentage flows

## Rejected alternatives

- Always use the first operand as base in additive chains: simpler to explain, but less natural for successive accounting adjustments.
- Always print the materialized numeric operand after `%`: mathematically accurate, but confusing on the tape.
- Use one universal percentage rule for every operator: easy to implement, but wrong for accounting semantics.
