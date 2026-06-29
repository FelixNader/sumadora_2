interface ConversionOptions {
  isOverflow: (value: number) => boolean;
  round: (value: number, operation: "*" | "/") => number;
}

export function normalizeConversionRate(rate: number): number {
  if (rate === 0) {
    throw new Error("INVALID_RATE");
  }

  return rate;
}

export function convertDomesticToForeign(
  value: number,
  conversionRate: number,
  options: ConversionOptions
): number {
  const result = options.round(value / conversionRate, "/");
  if (options.isOverflow(result)) {
    throw new Error("OVERFLOW");
  }

  return result;
}

export function convertForeignToDomestic(
  value: number,
  conversionRate: number,
  options: ConversionOptions
): number {
  const result = options.round(value * conversionRate, "*");
  if (options.isOverflow(result)) {
    throw new Error("OVERFLOW");
  }

  return result;
}
