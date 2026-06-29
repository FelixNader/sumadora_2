import {
  calculateTaxAddition,
  calculateTaxSubtraction,
} from "./taxService";

const options = {
  isOverflow: (value: number) => Math.trunc(Math.abs(value)).toString().length > 12,
  round: (value: number) => Math.round(value * 100) / 100,
};

test("calculateTaxAddition returns total and tax amount", () => {
  const result = calculateTaxAddition(100, 16, options);

  expect(result).toEqual({
    result: 116,
    taxAmount: 16,
  });
});

test("calculateTaxSubtraction returns base amount and tax amount", () => {
  const result = calculateTaxSubtraction(116, 16, options);

  expect(result).toEqual({
    result: 100,
    taxAmount: 16,
  });
});

test("calculateTaxAddition throws on overflow", () => {
  expect(() =>
    calculateTaxAddition(999999999999, 16, options)
  ).toThrow("OVERFLOW");
});
