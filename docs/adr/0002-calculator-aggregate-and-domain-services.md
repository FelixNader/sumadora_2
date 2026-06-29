# ADR 0002: Keep Calculator as aggregate root and extract domain services incrementally

- Status: accepted
- Date: 2026-06-29

## Context

The calculator behavior is stateful. Operations depend on:

- current display value
- expression tokens
- pending operators
- mode and decimal selector
- item count and grand total
- business calculation registers

Splitting every rule into independent classes too early would make the domain harder to follow because many operations need coordinated state transitions.

## Decision

Keep `Calculator` as the aggregate root and primary orchestration point, but extract specialized logic into domain services and policies when one of these conditions is true:

- the logic is pure and reusable
- the logic has its own tests and language
- the logic is obscuring the aggregate flow

Current extractions include:

- `numericPolicy`
- `tapePolicy`
- `expressionEvaluator`
- `accountingService`
- `businessMath`
- `sessionStateService`

## Consequences

Positive:

- The aggregate still gives one clear place to understand behavior flow.
- Pure domain logic can evolve with focused tests.
- Refactors stay incremental and low risk.

Negative:

- `Calculator` is still a strong orchestrator and remains larger than an ideal mature aggregate.
- Some future extractions may require revisiting service boundaries.

## Rejected alternatives

- Keep all domain logic in `Calculator`: easier to start, harder to grow.
- Break the aggregate into many peer objects now: cleaner on paper, but likely over-fragmented for the current domain size.
