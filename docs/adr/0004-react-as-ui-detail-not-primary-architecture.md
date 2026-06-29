# ADR 0004: Keep React as a UI detail instead of migrating this project to plain JavaScript

- Status: accepted
- Date: 2026-06-29

## Context

This project is intended to serve as public evidence of architectural judgment for employers reviewing the repository on GitHub. The goal is not only to ship a working local-first calculator/PWA, but also to demonstrate:

- clean architecture
- domain-driven design in proportion to the problem
- event-driven interaction where it actually applies
- correct placement of frameworks and libraries as architectural details

Plain JavaScript was a serious candidate because it offers:

- lower tooling overhead
- direct control over DOM behavior
- fewer abstraction layers
- a coding style that can align well with simplicity and explicitness

However, a portfolio project used to signal architectural maturity must also show the ability to work with mainstream frontend tooling without letting that tooling dominate the design.

## Decision

Keep React in this project, but treat it strictly as a UI-layer detail.

The architectural position is:

- domain rules must remain independent of React
- application coordination must remain independent of React
- infrastructure concerns such as browser persistence and PWA behavior must remain outside the domain
- React is used only for rendering, event binding, and UI composition

The project will not migrate to plain JavaScript unless there is a product-driven reason strong enough to outweigh the portfolio value of demonstrating framework containment.

## Consequences

Positive:

- The repository demonstrates both architectural discipline and practical framework literacy.
- Employers can see that React is being used deliberately rather than by default.
- The project communicates the principle "framework as detail" with working code, not only diagrams.

Negative:

- The codebase keeps the complexity of a framework-based frontend runtime.
- Some UI/browser details are still candidates for further extraction from `CalculatorUI`.
- The project is less minimal than an equivalent plain-JavaScript implementation.

## Rejected alternatives

- Migrate immediately to plain JavaScript: strong simplicity signal, but weaker evidence of framework containment and mainstream frontend integration.
- Let React drive the whole architecture: common in small apps, but contrary to the design goal of keeping business rules independent from the framework.
