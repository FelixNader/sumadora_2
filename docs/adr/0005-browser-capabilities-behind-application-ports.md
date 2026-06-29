# ADR 0005: Keep browser capabilities behind application ports

- Status: accepted
- Date: 2026-06-29

## Context

This calculator now depends on browser-only capabilities beyond rendering:

- session persistence through `localStorage`
- snapshot import/export through browser file APIs
- display copy through the Clipboard API

These behaviors are legitimate product features for a local-first web/PWA app, but they are still delivery details. If React components call them directly, the UI starts owning orchestration that belongs to the application layer.

## Decision

Keep browser capabilities behind application ports and invoke them through explicit use cases:

- `CalculatorSnapshotRepository` for session persistence
- `CalculatorSnapshotFileGateway` for import/export
- `ClipboardGateway` for display copy

`CalculatorUI` may trigger these interactions, but it should not contain the browser API contract itself. The orchestration remains in `CalculatorApplicationService` and focused use cases.

## Consequences

Positive:

- The repository shows that browser APIs are treated as infrastructure details, not as implicit global dependencies.
- Local web/PWA behavior stays compatible with clean architecture boundaries.
- The diagrams now match the code: UI events enter application use cases, then application ports reach browser adapters.

Negative:

- Small features such as copy-to-clipboard require more files than a direct React handler.
- Some readers may consider this abstraction heavy for a calculator-sized product.

## Rejected alternatives

- Call `navigator.clipboard`, file APIs, and `localStorage` directly from `CalculatorUI`: faster initially, weaker architectural signal.
- Move browser API calls into the domain: incorrect boundary, because these capabilities are not business rules.
