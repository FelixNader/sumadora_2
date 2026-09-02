import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../../App";
import { Calculator } from "../../domain/calculator/Calculator";

const {
  applyAction,
  sequences,
}: {
  applyAction: (calculator: Calculator, action: string) => void;
  sequences: Array<{ id: number; name: string; actions: string[] }>;
} = require("../../../scripts/run-differential-sequence-battery");

const secondaryTabs: Record<string, string> = {
  "G*": "Cuenta y cierre",
  "*": "Cuenta y cierre",
  AVG: "Cuenta y cierre",
  "M+": "Memoria",
  "M-": "Memoria",
  MR: "Memoria",
  MC: "Memoria",
  "TAX SET": "Impuesto y conversion",
  RATE: "Impuesto y conversion",
  "CONV ->": "Impuesto y conversion",
  "<- CONV": "Impuesto y conversion",
  COST: "Negocio",
  SELL: "Negocio",
  MGN: "Negocio",
};

const buttonLabels: Record<string, string> = {
  "*": "TOTAL *",
  "G*": "GT G*",
  MR: "M◇",
  MC: "M*",
  SUBT: "SUBT ◇",
};

const decimalModes = new Set(["DEC:F", "DEC:3", "DEC:2", "DEC:0", "DEC:ADD2"]);

function pressUiAction(container: HTMLElement, action: string): void {
  if (action === "=") {
    fireEvent.keyDown(window, { key: "Enter", code: "Enter" });
    return;
  }

  if (decimalModes.has(action)) {
    const selectors = container.querySelector(".hr-selector-buttons");
    expect(selectors).not.toBeNull();
    fireEvent.click(within(selectors as HTMLElement).getByRole("button", { name: action.slice(4) }));
    return;
  }

  const secondaryTab = secondaryTabs[action];
  if (secondaryTab) {
    fireEvent.click(screen.getByRole("tab", { name: secondaryTab }));
  }

  const label = buttonLabels[action] ?? action;
  const primary = container.querySelector(".hr-keypad-primary");
  const scope = primary && !secondaryTab ? within(primary as HTMLElement) : screen;
  fireEvent.click(scope.getByRole("button", { name: label }));
}

function displayOf(container: HTMLElement): string {
  return container.querySelector(".hr-display")?.textContent ?? "";
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

test.each(sequences)("UI sequence $id: $name", (sequence) => {
  const expected = new Calculator(() => new Date("2026-09-01T17:20:00"));
  const { container } = render(<App />);

  for (const action of sequence.actions) {
    applyAction(expected, action);
    pressUiAction(container, action);
    expect(displayOf(container)).toBe(expected.getState().displayValue);
  }
});
