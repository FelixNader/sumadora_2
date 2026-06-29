import {
  convertDomesticToForeign,
  convertForeignToDomestic,
  normalizeConversionRate,
} from "./currencyConversionService";

const options = {
  isOverflow: (value: number) => Math.trunc(Math.abs(value)).toString().length > 12,
  round: (value: number) => Math.round(value * 100) / 100,
};

test("normalizeConversionRate rejects zero", () => {
  expect(() => normalizeConversionRate(0)).toThrow("INVALID_RATE");
});

test("convertDomesticToForeign divides by the configured rate", () => {
  expect(convertDomesticToForeign(200, 20, options)).toBe(10);
});

test("convertForeignToDomestic multiplies by the configured rate", () => {
  expect(convertForeignToDomestic(10, 20, options)).toBe(200);
});
