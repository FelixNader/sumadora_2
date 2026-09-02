import { createInitialCalculatorState } from "./state";
import { createCalculatorSession, createCalculatorStateFacade } from "./session";

test("the flat calculator facade writes to the owning session partition", () => {
  const session = createCalculatorSession(createInitialCalculatorState());
  const state = createCalculatorStateFacade(session);

  state.displayValue = "42";
  state.expressionTokens = [42, "+"];
  state.operationCount = 1;
  state.paperTape = ["42 +"];
  state.taxRate = 8;

  expect(session.entry.displayValue).toBe("42");
  expect(session.workingExpression.expressionTokens).toEqual([42, "+"]);
  expect(session.accounting.operationCount).toBe(1);
  expect(session.tape.paperTape).toEqual(["42 +"]);
  expect(session.configuration.taxRate).toBe(8);
});

test("the flat facade remains enumerable for snapshot compatibility", () => {
  const session = createCalculatorSession(createInitialCalculatorState());
  const state = createCalculatorStateFacade(session);

  expect({ ...state }).toMatchObject({
    displayValue: "0",
    expressionTokens: [],
    paperTape: [],
    grandTotal: 0,
    taxRate: 16,
  });
});
