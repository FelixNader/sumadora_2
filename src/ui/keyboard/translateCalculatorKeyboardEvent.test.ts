import { translateCalculatorKeyboardEvent } from "./translateCalculatorKeyboardEvent";

test("maps digit keys from the main keyboard", () => {
  expect(
    translateCalculatorKeyboardEvent({
      key: "7",
      code: "Digit7",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: "7",
    preventDefault: false,
  });
});

test("maps numpad digits and prevents default handling", () => {
  expect(
    translateCalculatorKeyboardEvent({
      key: "0",
      code: "Numpad0",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: "0",
    preventDefault: true,
  });
});

test("maps decimal separators from keyboard and numpad", () => {
  expect(
    translateCalculatorKeyboardEvent({
      key: ".",
      code: "Period",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: ".",
    preventDefault: true,
  });

  expect(
    translateCalculatorKeyboardEvent({
      key: ",",
      code: "Comma",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: ".",
    preventDefault: true,
  });

  expect(
    translateCalculatorKeyboardEvent({
      key: ".",
      code: "NumpadDecimal",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: ".",
    preventDefault: true,
  });
});

test("maps arithmetic and control keys", () => {
  expect(
    translateCalculatorKeyboardEvent({
      key: "+",
      code: "NumpadAdd",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: "+",
    preventDefault: true,
  });

  expect(
    translateCalculatorKeyboardEvent({
      key: "Enter",
      code: "NumpadEnter",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: "=",
    preventDefault: true,
  });

  expect(
    translateCalculatorKeyboardEvent({
      key: "Backspace",
      code: "Backspace",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toEqual({
    action: "CE",
    preventDefault: true,
  });
});

test("ignores modified shortcuts and unrelated keys", () => {
  expect(
    translateCalculatorKeyboardEvent({
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
    })
  ).toBeNull();

  expect(
    translateCalculatorKeyboardEvent({
      key: "Tab",
      code: "Tab",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    })
  ).toBeNull();
});
