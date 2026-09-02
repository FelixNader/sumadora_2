const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require(path.join(__dirname, "..", "node_modules", "typescript"));

require.extensions[".ts"] = function registerTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(transpiled.outputText, filename);
};

const refactorRoot = path.resolve(__dirname, "..");
const { Calculator } = require(path.join(refactorRoot, "src/domain/calculator/Calculator.ts"));

function fail(message) {
  throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertClose(actual, expected, label) {
  if (Math.abs(actual - expected) > 1e-9) {
    fail(`${label}: expected ${expected}, received ${actual}`);
  }
}

function createCalculator() {
  return new Calculator(() => new Date("2026-09-01T17:20:00"));
}

function enterInteger(calculator, value) {
  String(value).split("").forEach((digit) => calculator.inputDigit(digit));
}

function lastTapeNumber(lines) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const match = lines[index].trim().match(/(-?\d+(?:\.\d+)?)(?:\s+(?:◇|\*|G\*))?$/);
    if (match) return Number(match[1]);
  }
  return null;
}

function assertClosed(calculator, expected, label) {
  const state = calculator.getState();
  assertClose(Number(state.displayValue), expected, `${label} display`);
  assertClose(lastTapeNumber(state.paperTape), expected, `${label} tape`);
  assertEqual(state.error, null, `${label} error`);
}

function createRandom(seed) {
  let current = seed;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current;
  };
}

function runBinaryArithmeticSuite() {
  const random = createRandom(20260901);
  let checks = 0;
  const operations = ["+", "-", "*", "/"];

  for (let index = 0; index < 120; index += 1) {
    for (const operation of operations) {
      const left = (random() % 900) + 100;
      const right = (random() % 90) + 1;
      const calculator = createCalculator();
      let expected;

      if (operation === "+") expected = left + right;
      if (operation === "-") expected = left - right;
      if (operation === "*") expected = left * right;
      if (operation === "/") {
        expected = (random() % 90) + 1;
        enterInteger(calculator, expected * right);
        calculator.divide();
        enterInteger(calculator, right);
        calculator.equals();
        assertClosed(calculator, expected, `binary ${index} division`);
        checks += 1;
        continue;
      }

      enterInteger(calculator, left);
      if (operation === "+") calculator.add();
      if (operation === "-") calculator.subtract();
      if (operation === "*") calculator.multiply();
      enterInteger(calculator, right);
      calculator.equals();
      assertClosed(calculator, expected, `binary ${index} ${operation}`);
      checks += 1;
    }
  }

  return checks;
}

function runAccumulatorSuite() {
  const random = createRandom(7082026);
  let checks = 0;

  for (let index = 0; index < 120; index += 1) {
    const calculator = createCalculator();
    const values = Array.from({ length: 3 + (random() % 5) }, () => (random() % 900) + 1);
    const expected = values.reduce((total, value) => total + value, 0);

    values.forEach((value) => {
      enterInteger(calculator, value);
      calculator.add();
    });
    calculator.subtotal();
    assertClosed(calculator, expected, `accumulator ${index}`);
    assertEqual(calculator.getState().continuationSource.origin, "subtotal", `accumulator ${index} source`);
    checks += 2;
  }

  return checks;
}

function runDerivedOperationSuite() {
  const random = createRandom(1618033);
  let checks = 0;

  for (let index = 0; index < 80; index += 1) {
    const rate = (random() % 30) + 1;
    const base = ((random() % 200) + 1) * rate;
    const divisor = (random() % 20) + 1;
    const taxCalculator = createCalculator();

    enterInteger(taxCalculator, rate);
    taxCalculator.setTaxRate();
    enterInteger(taxCalculator, base);
    taxCalculator.addTax();
    taxCalculator.divide();
    enterInteger(taxCalculator, divisor);
    taxCalculator.equals();
    assertClosed(taxCalculator, (base * (1 + rate / 100)) / divisor, `tax divide ${index}`);
    checks += 1;

    const fxCalculator = createCalculator();
    enterInteger(fxCalculator, rate);
    fxCalculator.setConversionRate();
    enterInteger(fxCalculator, base);
    fxCalculator.convertDomesticToForeign();
    fxCalculator.divide();
    enterInteger(fxCalculator, divisor);
    fxCalculator.equals();
    assertClosed(fxCalculator, base / rate / divisor, `fx divide ${index}`);
    checks += 1;
  }

  return checks;
}

function runSnapshotSuite() {
  const random = createRandom(3141592);
  let checks = 0;

  for (let index = 0; index < 60; index += 1) {
    const calculator = createCalculator();
    const left = (random() % 900) + 1;
    const right = (random() % 900) + 1;
    enterInteger(calculator, left);
    calculator.add();
    enterInteger(calculator, right);
    calculator.subtotal();

    const restored = createCalculator();
    restored.loadSnapshot(calculator.getSnapshot());
    assertEqual(
      JSON.stringify(restored.getState()),
      JSON.stringify(calculator.getState()),
      `snapshot ${index}`
    );
    checks += 1;
  }

  return checks;
}

function runErrorRecoverySuite() {
  const calculator = createCalculator();
  enterInteger(calculator, 1);
  calculator.divide();
  enterInteger(calculator, 0);
  calculator.equals();
  assertEqual(calculator.getState().displayValue, "E", "division by zero error");
  calculator.clearEntry();
  enterInteger(calculator, 2);
  calculator.add();
  enterInteger(calculator, 3);
  calculator.equals();
  assertClosed(calculator, 5, "division by zero recovery");
  return 2;
}

function main() {
  const suites = {
    binaryArithmetic: runBinaryArithmeticSuite(),
    accumulatorClosure: runAccumulatorSuite(),
    derivedTransitions: runDerivedOperationSuite(),
    snapshotRoundTrip: runSnapshotSuite(),
    errorRecovery: runErrorRecoverySuite(),
  };
  const summary = {
    generatedAt: new Date().toISOString(),
    totalChecks: Object.values(suites).reduce((total, count) => total + count, 0),
    suites,
    status: "passed",
  };
  const outputDir = process.env.CERTIFICATION_OUTPUT_DIR || path.join(os.tmpdir(), "sumadora-2-certification");
  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, "certification-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, reportPath }, null, 2));
}

main();
