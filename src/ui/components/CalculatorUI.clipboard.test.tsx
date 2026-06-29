import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../App";

beforeEach(() => {
  localStorage.clear();
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  });
});

test("double clicking the display copies the shown value to the clipboard", async () => {
  const { container } = render(<App />);
  const display = container.querySelector(".hr-display");
  const keypad = container.querySelector(".hr-keypad");

  fireEvent.click(within(keypad as HTMLElement).getByRole("button", { name: "4" }));
  fireEvent.click(within(keypad as HTMLElement).getByRole("button", { name: "2" }));
  fireEvent.doubleClick(display as HTMLElement);

  await waitFor(() => {
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("42");
  });

  expect(await screen.findByText("Copiado: 42")).toBeInTheDocument();
});

test("clipboard copy failure shows an error message", async () => {
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn().mockRejectedValue(new Error("clipboard denied")),
    },
  });

  const { container } = render(<App />);
  const display = container.querySelector(".hr-display");

  fireEvent.doubleClick(display as HTMLElement);

  expect(
    await screen.findByText("No se pudo copiar el valor mostrado.")
  ).toBeInTheDocument();
});
