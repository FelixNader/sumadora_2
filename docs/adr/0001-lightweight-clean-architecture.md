# ADR 0001: Adopt lightweight clean architecture

- Status: accepted
- Date: 2026-06-29

## Context

The project started as a single React application with most of the behavior concentrated in the UI and a large calculator class. That shape was enough to prove functionality, but it did not match the design direction expressed in the bounded-context and clean-architecture diagrams.

The system is still small. A full enterprise-style layering with controllers, presenters, use-case files for every command, DTO trees, and dependency injection containers would add more ceremony than value.

## Decision

Adopt a lightweight clean architecture with four explicit layers:

- `domain`: calculator rules and domain services
- `application`: use-case coordination
- `infrastructure`: concrete adapters such as browser persistence
- `ui`: React rendering and input translation

The implementation will prefer small reversible refactors over a single rewrite.

## Consequences

Positive:

- The dependency rule is now visible in the codebase.
- Domain logic can be tested without React or browser APIs.
- Infrastructure details can change without rewriting the domain.

Negative:

- The project is not using strict one-file-per-use-case clean architecture yet.
- Some orchestration remains centralized in `CalculatorApplicationService` and `Calculator`.

## Rejected alternatives

- Keep everything in the UI and a monolithic calculator class: simpler short term, weaker architectural story.
- Apply full enterprise clean architecture immediately: too much ceremony for the current scope.
