export interface BusinessInputs {
  cost: number | null;
  sell: number | null;
  margin: number | null;
}

export interface BusinessSolution {
  result: number;
  solvedKey: "COST" | "SELL" | "MGN";
}

export function solveBusinessValues(
  inputs: BusinessInputs,
  round: (value: number, operation: "+" | "-" | "*" | "/") => number
): BusinessSolution | null {
  const { cost, sell, margin } = inputs;

  if (cost !== null && sell !== null) {
    if (sell === 0) {
      throw new Error("SELL_ZERO");
    }

    return {
      result: round(((sell - cost) / sell) * 100, "+"),
      solvedKey: "MGN",
    };
  }

  if (cost !== null && margin !== null) {
    if (margin >= 100) {
      throw new Error("INVALID_MARGIN");
    }

    return {
      result: round(cost / (1 - margin / 100), "/"),
      solvedKey: "SELL",
    };
  }

  if (sell !== null && margin !== null) {
    if (margin >= 100) {
      throw new Error("INVALID_MARGIN");
    }

    return {
      result: round(sell * (1 - margin / 100), "-"),
      solvedKey: "COST",
    };
  }

  return null;
}
