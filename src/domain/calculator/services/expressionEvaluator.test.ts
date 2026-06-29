import {
  evaluateExpression,
  executeOperation,
  resolveMulDivLeftOperand,
} from "./expressionEvaluator";
import { ExpressionToken, Operation } from "../types";

const evaluationOptions = {
  isOverflow: (value: number) => Math.trunc(Math.abs(value)).toString().length > 12,
  round: (value: number, _operation: Operation) => value,
};

test("evaluateExpression respects multiplication precedence", () => {
  const tokens: ExpressionToken[] = [5, "+", 8, "+", 3, "*", 2];

  const result = evaluateExpression(tokens, evaluationOptions);

  expect(result).toBe(19);
});

test("resolveMulDivLeftOperand isolates the multiplicative segment", () => {
  const tokens: ExpressionToken[] = [5, "+", 8, "+", 3, "*"];

  const result = resolveMulDivLeftOperand(tokens, evaluationOptions);

  expect(result).toBe(3);
});

test("executeOperation throws on division by zero", () => {
  expect(() =>
    executeOperation(10, 0, "/", evaluationOptions)
  ).toThrow("DIVIDE_BY_ZERO");
});
