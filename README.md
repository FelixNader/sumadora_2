# Sumadora Contable PWA

A business-focused calculator PWA for fast operational math: visible tape, subtotal, grand total, memory, tax, conversion rates, and margin support.

This project is not meant to be a generic calculator. It is designed for real working flows such as sales, purchases, cash review, quick quoting, and day-to-day store operations where the result matters, but the calculation trail matters too.

## Live Demo

https://felixnader.github.io/sumadora_2/

## Repository

https://github.com/FelixNader/sumadora_2

## What Problem It Solves

Most mobile calculators are good at isolated operations but weak at business flow.

In practical use, a user often needs more than a final number:

- a visible record of what was entered
- running subtotals
- a grand total
- memory operations
- tax adjustments
- conversion support
- margin calculations
- fast interaction on phone or desktop

This application is built around that workflow.

## Main Features

- Visible operation tape
- Subtotal
- Grand total
- Memory functions
- Tax calculation
- Conversion with `rate`, `out`, and `spread`
- Margin-oriented business functions
- Keyboard and touch input
- Mobile-oriented interface
- PWA deployment
- Offline/local behavior when supported by the browser

## Architecture

The project separates calculation logic from the visual interface.

Main layers:

- calculation engine
- calculator state
- UI rendering
- tape and log presentation
- user events
- local persistence

The application is modeled as a state-driven system: each user action changes internal state, and the interface reflects that state.

This structure makes it easier to:

- test logic independently
- reason about transitions
- evolve the UI without rewriting the engine
- extend future persistence and export features

## Tech Stack

- JavaScript
- HTML
- CSS
- PWA
- GitHub Pages
- Git / GitHub

## Validation

An early version was tested with a non-technical 72-year-old user, who was able to understand the general flow of the tool.

That mattered because the goal of the project is not only technical correctness, but practical clarity.

## What This Project Demonstrates

- Product thinking around a real operational problem
- State-based application design
- Separation of logic and presentation
- Usable interface decisions for mobile-first interaction
- Real deployment with GitHub Pages
- Iterative development tracked through Git

## Current Status

Functional portfolio project with a live public demo.

Current improvement areas include:

- technical documentation
- broader engine tests
- accessibility
- stronger local persistence
- tape and log export

## Next Steps

- Add screenshots
- Document the state machine in more detail
- Expand engine test coverage
- Improve accessibility
- Explore extended local persistence
- Add tape and log export
- Prepare a stronger portfolio presentation version

## Screenshots

Planned:

- main screen
- mobile view
- operation tape
- tax example
- margin example

## License

This repository is published as a portfolio project. See [LICENSE](./LICENSE) for usage terms.

## Author

Félix Nader

Developer focused on lightweight web tools, state-based logic, practical UX, and software for real small-business operations.

## Contact

- LinkedIn: [add link]
- Email: [add contact email]
