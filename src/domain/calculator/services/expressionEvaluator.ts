import { ExpressionToken, Operation } from "../types";

interface EvaluationOptions {
  isOverflow: (value: number) => boolean;
  round: (value: number, operation: Operation) => number;
}

export function executeOperation(
  first: number,
  second: number,
  operation: Operation,
  options: EvaluationOptions
): number {
  if (operation === "/" && second === 0) {
    throw new Error("DIVIDE_BY_ZERO");
  }

  let rawResult = second;
  if (operation === "+") {
    rawResult = first + second;
  } else if (operation === "-") {
    rawResult = first - second;
  } else if (operation === "*") {
    rawResult = first * second;
  } else if (operation === "/") {
    rawResult = first / second;
  }

  const result = options.round(rawResult, operation);
  if (!Number.isFinite(result) || options.isOverflow(result)) {
    throw new Error("OVERFLOW");
  }

  return result;
}

export function evaluateExpression(
  tokens: ExpressionToken[],
  options: EvaluationOptions
): number {
  if (tokens.length === 0) {
    return 0;
  }

  const noMulDiv: ExpressionToken[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    if (typeof token !== "number") {
      throw new Error("INVALID_EXPRESSION");
    }

    if (
      index + 1 < tokens.length &&
      (tokens[index + 1] === "*" || tokens[index + 1] === "/")
    ) {
      let current = token;
      let cursor = index;
      while (
        cursor + 1 < tokens.length &&
        (tokens[cursor + 1] === "*" || tokens[cursor + 1] === "/")
      ) {
        const operator = tokens[cursor + 1] as Operation;
        const nextToken = tokens[cursor + 2];
        if (typeof nextToken !== "number") {
          throw new Error("INVALID_EXPRESSION");
        }

        current = executeOperation(current, nextToken, operator, options);
        cursor += 2;
      }

      noMulDiv.push(current);
      if (cursor + 1 < tokens.length) {
        noMulDiv.push(tokens[cursor + 1] as Operation);
      }
      index = cursor + 2;
    } else {
      noMulDiv.push(token);
      if (index + 1 < tokens.length) {
        noMulDiv.push(tokens[index + 1] as Operation);
      }
      index += 2;
    }
  }

  let result = noMulDiv[0] as number;
  for (let i = 1; i < noMulDiv.length; i += 2) {
    const operator = noMulDiv[i] as Operation;
    const next = noMulDiv[i + 1] as number;
    if (operator !== "+" && operator !== "-") {
      continue;
    }

    result = executeOperation(result, next, operator, options);
  }

  return result;
}

export function resolveMulDivLeftOperand(
  expressionWithTrailingOperator: ExpressionToken[],
  options: EvaluationOptions
): number {
  const tokens = [...expressionWithTrailingOperator];
  if (tokens.length > 0 && typeof tokens[tokens.length - 1] === "string") {
    tokens.pop();
  }

  let segmentStart = 0;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (token === "+" || token === "-") {
      segmentStart = i + 1;
      break;
    }
  }

  const segment = tokens.slice(segmentStart);
  return evaluateExpression(segment, options);
}
