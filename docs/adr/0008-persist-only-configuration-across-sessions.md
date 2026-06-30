# ADR 0008: Persist only configuration across sessions

- Status: accepted
- Date: 2026-06-29

## Context

The app runs as a local web/PWA calculator, but not every runtime value should survive a full close and reopen.

Recent behavior exposed a mismatch:

- the paper tape looked like a fresh working session
- while `GT`, `SUB`, `OPS`, display state, or other accumulated values could still come from a previous persisted session

That made accounting feedback hard to trust, because the visible tape and the persisted aggregate state no longer represented the same business moment.

The product decision is:

- operational work belongs to the current session only
- cross-session persistence should keep only reusable configuration and registers

## Decision

Local browser persistence will keep only:

- independent memory
- currency conversion rate
- tax rate

Local browser persistence will not keep:

- paper tape
- display value
- grand total
- operation counters
- subtotal counters
- current expression or pending operations

Explicit import/export snapshots remain full backups. This decision applies to automatic local session persistence only.

## Consequences

Positive:

- A reopened app behaves like a fresh accounting session.
- `GT`, `SUB`, and `OPS` stay aligned with the visible session work.
- Memory register and configuration still save the user repetitive setup.

Negative:

- Users cannot rely on automatic browser persistence to resume an unfinished operational tape.
- Recovering a full prior operational state now depends on explicit snapshot import/export.

## Rejected alternatives

- Persist everything automatically: convenient, but caused invisible accounting carry-over.
- Persist nothing automatically: simpler, but loses useful registers like memory, rate, and tax setup.
