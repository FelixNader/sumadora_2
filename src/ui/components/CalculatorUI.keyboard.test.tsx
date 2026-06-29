import React from "react";
import { fireEvent, render } from "@testing-library/react";
import App from "../../App";

beforeEach(() => {
  localStorage.clear();
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  });
});

function getDisplay(container: HTMLElement): string {
  const display = container.querySelector(".hr-display");
  return display?.textContent ?? "";
}

function pressKey(
  key: string,
  code: string,
  options?: Partial<KeyboardEvent>
) {
  fireEvent.keyDown(window, {
    key,
    code,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...options,
  });
}

test("typing decimal then zero shows the zero on first press", () => {
  const { container } = render(<App />);

  pressKey(".", "Period");
  pressKey("0", "Digit0");

  expect(getDisplay(container)).toBe("0.0");
});

test("typing decimal then repeated zeroes keeps every typed zero", () => {
  const { container } = render(<App />);

  pressKey(".", "Period");
  pressKey("0", "Digit0");
  pressKey("0", "Digit0");

  expect(getDisplay(container)).toBe("0.00");
});

test("typing sequence 0 . 0 5 preserves leading fractional zero", () => {
  const { container } = render(<App />);

  pressKey("0", "Digit0");
  pressKey(".", "Period");
  pressKey("0", "Digit0");
  pressKey("5", "Digit5");

  expect(getDisplay(container)).toBe("0.05");
});

test("numpad digits and decimal are translated correctly", () => {
  const { container } = render(<App />);

  pressKey(".", "NumpadDecimal");
  pressKey("0", "Numpad0");
  pressKey("7", "Numpad7");

  expect(getDisplay(container)).toBe("0.07");
});

test("comma decimal separator is normalized to dot", () => {
  const { container } = render(<App />);

  pressKey(",", "Comma");
  pressKey("2", "Digit2");

  expect(getDisplay(container)).toBe("0.2");
});

test("keyboard arithmetic sequence computes correctly", () => {
  const { container } = render(<App />);

  pressKey("1", "Digit1");
  pressKey("2", "Digit2");
  pressKey("+", "NumpadAdd");
  pressKey("3", "Digit3");
  pressKey("Enter", "Enter");

  expect(getDisplay(container)).toBe("15");
});

test("backspace clears current entry and escape clears all", () => {
  const { container } = render(<App />);

  pressKey("9", "Digit9");
  pressKey("Backspace", "Backspace");
  expect(getDisplay(container)).toBe("0");

  pressKey("8", "Digit8");
  pressKey("Escape", "Escape");
  expect(getDisplay(container)).toBe("0");
});
