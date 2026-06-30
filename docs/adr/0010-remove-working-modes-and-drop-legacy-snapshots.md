# ADR 0010: Remove working modes and drop legacy snapshot compatibility

- Status: accepted
- Date: 2026-06-30

## Context

The app had already removed hardware-like `ON`, `OFF`, and `PRINT` behavior, but it still kept `NORMAL` and `CONVERSION` as global working modes.

That remaining mode model no longer matched the product:

- conversion already lives in dedicated keys: `RATE`, `CONV ->`, `<- CONV`
- memory keys already have explicit dedicated controls
- the web UI is not constrained by physical selector scarcity
- `CONVERSION` only added an extra operational step and blocked independent memory artificially

At the same time, the repo is still pre-distribution:

- there is no real customer base
- testers are not relying on snapshot rehydration
- preserving old snapshot semantics would keep dead concepts alive in the domain for little practical value

## Decision

Simplify the model decisively:

- remove `NORMAL` and `CONVERSION` from the domain
- remove the working-mode selector from the UI
- keep currency conversion as direct capability through its dedicated keys
- keep independent memory always available
- bump snapshots to version `2`
- reject older snapshot versions instead of normalizing them

Old persisted local state or imported backups using older versions are now considered incompatible by design.

## Consequences

Positive:

- the domain loses an artificial global state
- the UI loses an unnecessary operational step
- conversion and memory become explicit capabilities instead of mode-dependent behavior
- the architecture is easier to explain and defend

Negative:

- snapshots created under the previous model are no longer accepted
- the project deliberately gives up backward compatibility for a cleaner domain

## Rejected alternatives

- Keep `NORMAL` and `CONVERSION` forever for compatibility: preserves dead product concepts.
- Accept old snapshots through passive normalization: useful only if old backups matter operationally.
- Hide the selector in UI but keep modes in the domain: cleaner visually, still impure conceptually.
