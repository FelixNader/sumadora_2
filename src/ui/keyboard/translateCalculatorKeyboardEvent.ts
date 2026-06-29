export interface CalculatorKeyboardAction {
  action: string;
  preventDefault: boolean;
}

export function translateCalculatorKeyboardEvent(
  event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey">
): CalculatorKeyboardAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }

  if (/^Numpad[0-9]$/.test(event.code)) {
    return {
      action: event.code.replace("Numpad", ""),
      preventDefault: true,
    };
  }

  if (/^[0-9]$/.test(event.key)) {
    return {
      action: event.key,
      preventDefault: false,
    };
  }

  if (
    event.key === "." ||
    event.key === "," ||
    event.code === "NumpadDecimal"
  ) {
    return {
      action: ".",
      preventDefault: true,
    };
  }

  if (event.key === "+" || event.code === "NumpadAdd") {
    return {
      action: "+",
      preventDefault: true,
    };
  }

  if (event.key === "-" || event.code === "NumpadSubtract") {
    return {
      action: "-",
      preventDefault: true,
    };
  }

  if (event.key === "*" || event.code === "NumpadMultiply") {
    return {
      action: "x",
      preventDefault: true,
    };
  }

  if (event.key === "/" || event.code === "NumpadDivide") {
    return {
      action: "/",
      preventDefault: true,
    };
  }

  if (
    event.key === "Enter" ||
    event.key === "=" ||
    event.code === "NumpadEnter"
  ) {
    return {
      action: "=",
      preventDefault: true,
    };
  }

  if (event.key === "Escape") {
    return {
      action: "CA",
      preventDefault: true,
    };
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    return {
      action: "CE",
      preventDefault: true,
    };
  }

  return null;
}
