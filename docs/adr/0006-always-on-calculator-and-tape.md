# ADR 0006: Model the calculator as always-on with always-active tape

- Status: superseded by ADR 0010
- Date: 2026-06-29

## Context

The current product assumption is no longer "desktop calculator with optional print mode and visible power states".

The actual product assumption is:

- opening the app means the calculator is already available
- the user never needs to turn it on or off
- the tape is always active
- visible modes should represent operational logic, not hardware simulation leftovers

Keeping `ON`, `OFF`, and `PRINT` in the product model created noise:

- `PRINT` became redundant because tape output is always expected
- `OFF` described a hardware state the user cannot meaningfully reach in this app
- `ON` only existed as a compatibility artifact once `PRINT` stopped being optional

This also made the UI harder to justify, because mode selection mixed product-relevant workflows with dead hardware metaphors.

## Decision

Historical note: this decision was later superseded when `NORMAL` and `CONVERSION` were also removed from the product model.

Simplify the mode model and related flows:

- keep only `NORMAL` and `CONVERSION` as valid working modes
- treat the calculator as always operational after app load
- treat tape output as always available
- migrate legacy snapshots containing `PRINT`, `ON`, or `OFF` to `NORMAL` during hydration

The remaining `ON/OFF` label on the screen is not a power state. It is only the indicator for independent memory register `M`.

## Consequences

Positive:

- The visible product model now matches the actual web/PWA behavior.
- The UI communicates accounting mode changes instead of fake hardware state changes.
- The domain removes unnecessary branching around power state and tape availability.
- Old saved snapshots remain loadable through explicit normalization.

Negative:

- The project moves one step farther away from literal hardware imitation.
- If a future requirement needs real power-state simulation, that behavior would need to be reintroduced deliberately.

## Rejected alternatives

- Keep `PRINT` in the UI as a no-op mode: visually familiar, but semantically misleading.
- Keep `OFF` only for completeness: adds state and branches without a real user value in this product.
- Remove legacy modes without snapshot migration: simpler code, but avoidable breakage for previously saved local state.
