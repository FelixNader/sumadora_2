export interface TaxComputation {
  result: number;
  taxAmount: number;
}

interface TaxOptions {
  isOverflow: (value: number) => boolean;
  round: (value: number, operation: "+" | "-") => number;
}

export function normalizeTaxRate(value: number): number {
  return value;
}

export function calculateTaxAddition(
  value: number,
  taxRate: number,
  options: TaxOptions
): TaxComputation {
  const taxAmount = options.round(value * (taxRate / 100), "+");
  const result = options.round(value * (1 + taxRate / 100), "+");

  if (options.isOverflow(result)) {
    throw new Error("OVERFLOW");
  }

  return {
    result,
    taxAmount,
  };
}

export function calculateTaxSubtraction(
  value: number,
  taxRate: number,
  options: TaxOptions
): TaxComputation {
  const baseValue = options.round(value / (1 + taxRate / 100), "-");
  const taxAmount = options.round(value - baseValue, "-");

  if (options.isOverflow(baseValue)) {
    throw new Error("OVERFLOW");
  }

  return {
    result: baseValue,
    taxAmount,
  };
}
