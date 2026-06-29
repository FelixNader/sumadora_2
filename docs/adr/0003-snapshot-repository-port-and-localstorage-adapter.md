# ADR 0003: Persist snapshots through a repository port backed by localStorage

- Status: accepted
- Date: 2026-06-29

## Context

The application needs session persistence, backup export, and backup import. The simplest available persistence mechanism in the current deployment model is browser `localStorage`.

Using `localStorage` directly from the UI would work functionally, but it would couple the application flow to a browser detail and weaken the clean-architecture boundary.

## Decision

Expose persistence through the `CalculatorSnapshotRepository` port in the application layer and provide a browser-specific implementation in `LocalStorageCalculatorSnapshotRepository`.

The UI interacts with `CalculatorApplicationService`, not directly with `localStorage`.

## Consequences

Positive:

- The application layer owns persistence orchestration.
- The domain remains unaware of browser APIs.
- Replacing `localStorage` with another adapter stays localized.

Negative:

- There is one more abstraction than a direct UI call.
- The current repository is still synchronous and browser-bound because the deployment target is still the browser.

## Rejected alternatives

- Read and write `localStorage` directly from React components: less code, weaker separation.
- Introduce backend persistence now: unnecessary scope increase for the current product stage.
