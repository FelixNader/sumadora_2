const fs = require("fs");
const os = require("os");
const path = require("path");
const refactorRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(refactorRoot, "..");
const ts = require(path.join(refactorRoot, "node_modules/typescript"));

require.extensions[".ts"] = function registerTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  module._compile(transpiled.outputText, filename);
};

function digits(value) {
  return String(value).split("");
}

function seq(id, name, actions, category) {
  return { id, name, actions, category };
}

const sequences = [
  seq(1, "remision desde acumulado aditivo y continuidad", [...digits(250), "+", ...digits(700), "+", ...digits(170), "+", ...digits(170), "+", ...digits(50), "+", "/", ...digits(11), "=", "SUBT", "2", "+"], "accumulator"),
  seq(2, "subtotal luego continuar suma y cerrar", [...digits(150), "+", ...digits(100), "SUBT", ...digits(100), "+", "*"], "accumulator"),
  seq(3, "subtotal subtractivo encadenado", [...digits(194), ".", "4", "-", ...digits(50), "SUBT", "-", ...digits(144), "SUBT"], "accumulator"),
  seq(4, "suma simple con equals", [...digits(100), "+", ...digits(20), "+", ...digits(30), "="], "accumulator"),
  seq(5, "resta con subtotal", [...digits(500), "-", ...digits(125), "-", ...digits(25), "SUBT"], "accumulator"),
  seq(6, "clear entry preserva suma pendiente", [...digits(12), "+", ...digits(5), "CE", ...digits(7), "="], "accumulator"),
  seq(7, "clear entry preserva resta pendiente", [...digits(80), "-", ...digits(10), "CE", ...digits(15), "="], "accumulator"),
  seq(8, "precedencia suma por multiplicacion", [...digits(7), "+", ...digits(3), "x", ...digits(2), "="], "mixed"),
  seq(9, "precedencia cadena mixta clasica", [...digits(5), "+", ...digits(8), "+", ...digits(3), "x", ...digits(2), "="], "mixed"),
  seq(10, "division simple", [...digits(60), "/", ...digits(8), "="], "mixed"),
  seq(11, "suma y luego division con precedencia", [...digits(300), "+", ...digits(400), "/", ...digits(2), "="], "mixed"),
  seq(12, "suma y division con subtotal", [...digits(300), "+", ...digits(400), "/", ...digits(2), "SUBT"], "mixed"),
  seq(13, "multiplicacion seguida de suma", [...digits(25), "x", ...digits(4), "+", ...digits(10), "="], "mixed"),
  seq(14, "multiplicacion seguida de total", [...digits(25), "x", ...digits(4), "+", ...digits(10), "*"], "mixed"),
  seq(15, "dos segmentos multiplicativos en cadena aditiva", [...digits(5), "x", ...digits(5), "+", ...digits(50), "x", ...digits(2), "="], "mixed"),
  seq(16, "division mas suma", [...digits(144), "/", ...digits(12), "+", ...digits(5), "="], "mixed"),
  seq(17, "division mas suma con subtotal", [...digits(144), "/", ...digits(12), "+", ...digits(5), "SUBT"], "mixed"),
  seq(18, "muldiv encadenado", [...digits(9), "x", ...digits(9), "/", ...digits(3), "="], "mixed"),
  seq(19, "divmul encadenado", [...digits(100), "/", ...digits(4), "x", ...digits(2), "="], "mixed"),
  seq(20, "muldiv con subtotal", [...digits(9), "x", ...digits(9), "/", ...digits(3), "SUBT"], "mixed"),

  seq(21, "porcentaje standalone", [...digits(10), "%"], "percent"),
  seq(22, "porcentaje aditivo clasico", [...digits(10), "+", ...digits(10), "%", "="], "percent"),
  seq(23, "porcentaje subtractivo clasico", [...digits(180), "-", ...digits(10), "%", "="], "percent"),
  seq(24, "porcentaje multiplicativo", [...digits(10), "x", ...digits(10), "%", "="], "percent"),
  seq(25, "porcentaje divisivo", [...digits(10), "/", ...digits(10), "%", "="], "percent"),
  seq(26, "porcentaje aditivo y luego suma real", [...digits(10), "+", ...digits(10), "%", "+", ...digits(5), "="], "percent"),
  seq(27, "porcentaje aditivo repetido", [...digits(10), "+", ...digits(10), "%", "+", ...digits(10), "%", "="], "percent"),
  seq(28, "porcentaje subtractivo con input negativo", [...digits(180), "-", ...digits(10), "+/-", "%", "="], "percent"),
  seq(29, "porcentaje decimal aditivo", [...digits(200), "+", ...digits(12), ".", "5", "%", "="], "percent"),
  seq(30, "porcentaje decimal subtractivo con subtotal", [...digits(200), "-", ...digits(12), ".", "5", "%", "SUBT"], "percent"),
  seq(31, "porcentaje multiplicativo y luego suma", [...digits(50), "x", ...digits(5), "%", "+", ...digits(2), "="], "percent"),
  seq(32, "porcentaje divisivo y luego suma", [...digits(50), "/", ...digits(5), "%", "+", ...digits(2), "="], "percent"),
  seq(33, "subtotal despues de porcentaje aditivo y continuidad", [...digits(90), "+", ...digits(10), "%", "SUBT", ...digits(10), "+"], "percent"),
  seq(34, "subtotal despues de porcentaje subtractivo y continuidad", [...digits(90), "-", ...digits(10), "%", "SUBT", ...digits(10), "-"], "percent"),
  seq(35, "porcentaje sobre cadena aditiva ya iniciada", [...digits(5), "+", ...digits(8), "+", ...digits(10), "%", "="], "percent"),

  seq(36, "tax plus directo", [...digits(100), "TAX+"], "tax-fx"),
  seq(37, "tax minus directo", [...digits(208), ".", "8", "TAX-"], "tax-fx"),
  seq(38, "tax plus y continuidad aditiva", [...digits(100), "TAX+", "+", ...digits(5), "SUBT"], "tax-fx"),
  seq(39, "tax minus y continuidad subtractiva", [...digits(208), ".", "8", "TAX-", "-", ...digits(8), "SUBT"], "tax-fx"),
  seq(40, "set tax 16 y aplicar plus", [...digits(16), "TAX SET", ...digits(100), "TAX+"], "tax-fx"),
  seq(41, "set tax 8 y aplicar minus", [...digits(8), "TAX SET", ...digits(108), "TAX-"], "tax-fx"),
  seq(42, "set rate y convertir domestico a extranjero", [...digits(2), "RATE", ...digits(4), "CONV ->"], "tax-fx"),
  seq(43, "set rate y convertir extranjero a domestico", [...digits(2), "RATE", ...digits(4), "<- CONV"], "tax-fx"),
  seq(44, "conversion y continuidad aditiva", [...digits(2), "RATE", ...digits(4), "CONV ->", "+", ...digits(5), "*"], "tax-fx"),
  seq(45, "conversion inversa y continuidad subtractiva", [...digits(2), "RATE", ...digits(4), "<- CONV", "-", ...digits(3), "SUBT"], "tax-fx"),
  seq(46, "rate decimal y conversion directa", ["1", ".", "2", "5", "RATE", ...digits(100), "CONV ->"], "tax-fx"),
  seq(47, "rate decimal y conversion inversa", ["1", ".", "2", "5", "RATE", ...digits(80), "<- CONV"], "tax-fx"),
  seq(48, "tax plus y luego division", [...digits(20), "TAX SET", ...digits(250), "TAX+", "/", ...digits(10), "="], "tax-fx"),
  seq(49, "tax minus y luego suma", [...digits(20), "TAX SET", ...digits(120), "TAX-", "+", ...digits(10), "="], "tax-fx"),
  seq(50, "conversion y luego division", [...digits(3), "RATE", ...digits(300), "CONV ->", "/", ...digits(5), "="], "tax-fx"),

  seq(51, "memoria add y recall", [...digits(9), "M+", "MR"], "memory-gt"),
  seq(52, "memoria acumulada", [...digits(9), "M+", ...digits(1), "M+", "MR"], "memory-gt"),
  seq(53, "memoria resta", [...digits(9), "M+", ...digits(4), "M-", "MR"], "memory-gt"),
  seq(54, "memoria clear y recall", [...digits(9), "M+", "MC", "MR"], "memory-gt"),
  seq(55, "total y grand total simple", [...digits(100), "+", ...digits(20), "*", "G*"], "memory-gt"),
  seq(56, "dos totales y grand total", [...digits(100), "+", ...digits(20), "*", ...digits(30), "+", ...digits(10), "*", "G*"], "memory-gt"),
  seq(57, "referencia impresa y luego suma", [...digits(12), "#", ...digits(3), "+", ...digits(4), "="], "memory-gt"),
  seq(58, "recall de memoria dentro de expresion", [...digits(5), "M+", ...digits(5), "+", "MR", "="], "memory-gt"),
  seq(59, "subtotal y luego promedio", [...digits(50), "+", ...digits(50), "SUBT", "AVG"], "memory-gt"),
  seq(60, "promedio de cadena aditiva", [...digits(100), "+", ...digits(50), "+", ...digits(25), "AVG"], "memory-gt"),

  seq(61, "base negativa y resta", [...digits(5), "+/-", "-", ...digits(2), "="], "sign-clear-error"),
  seq(62, "suma con operando negativo", [...digits(5), "+", ...digits(2), "+/-", "="], "sign-clear-error"),
  seq(63, "resta con operando negativo", [...digits(5), "-", ...digits(2), "+/-", "="], "sign-clear-error"),
  seq(64, "fraccion pequeña sumada", ["0", ".", "0", "5", "+", "0", ".", "0", "5", "="], "sign-clear-error"),
  seq(65, "fraccion pequena multiplicada", [".", "0", "0", "7", "x", ...digits(3), "="], "sign-clear-error"),
  seq(66, "division por cero", [...digits(1), "/", ...digits(0), "="], "sign-clear-error"),
  seq(67, "overflow por longitud", [...digits(999999999999), "+", ...digits(1), "="], "sign-clear-error"),
  seq(68, "clear entry de numero base y luego operar", [...digits(10), "CE", ...digits(5), "+", ...digits(2), "="], "sign-clear-error"),
  seq(69, "clear all reinicia sesion", [...digits(7), "CA", ...digits(8), "+", ...digits(1), "="], "sign-clear-error"),
  seq(70, "clear all en expresion abierta", [...digits(5), "+", ...digits(5), "CA", ...digits(2), "+", ...digits(3), "="], "sign-clear-error"),

  seq(71, "modo 2 suma redondeada", ["DEC:2", ...digits(100), "+", ...digits(25), "="], "decimal-mode"),
  seq(72, "modo 0 fuerza enteros", ["DEC:0", ...digits(1), ".", ...digits(6), "+", ...digits(1), ".", ...digits(6), "="], "decimal-mode"),
  seq(73, "modo 3 division", ["DEC:3", ...digits(1), "/", ...digits(3), "="], "decimal-mode"),
  seq(74, "modo add2 básico", ["DEC:ADD2", ...digits(1), "+", ...digits(2), "="], "decimal-mode"),
  seq(75, "modo add2 con enteros largos", ["DEC:ADD2", ...digits(100), "+", ...digits(25), "="], "decimal-mode"),
  seq(76, "modo flotante division sexta", ["DEC:F", ...digits(1), "/", ...digits(6), "="], "decimal-mode"),
  seq(77, "modo 2 subtotal aditivo", ["DEC:2", ...digits(250), "+", ...digits(750), "SUBT"], "decimal-mode"),
  seq(78, "modo 0 porcentaje", ["DEC:0", ...digits(50), "%"], "decimal-mode"),
  seq(79, "modo 3 rate y conversion", ["DEC:3", ...digits(2), "RATE", ...digits(3), "CONV ->"], "decimal-mode"),
  seq(80, "modo 2 tax plus", ["DEC:2", ...digits(100), "TAX+"], "decimal-mode"),

  seq(81, "business margen desde cost y sell", [...digits(100), "COST", ...digits(125), "SELL", "MGN"], "business"),
  seq(82, "business sell desde cost y margin", [...digits(100), "COST", ...digits(20), "MGN", "SELL"], "business"),
  seq(83, "business cost desde sell y margin", [...digits(125), "SELL", ...digits(20), "MGN", "COST"], "business"),
  seq(84, "margin result participa en suma", [...digits(100), "COST", ...digits(125), "SELL", "MGN", "+", ...digits(5), "="], "business"),
  seq(85, "margin result participa en subtotal", [...digits(100), "COST", ...digits(125), "SELL", "MGN", "SUBT"], "business"),
  seq(86, "business sell con margen 30", [...digits(50), "COST", ...digits(30), "MGN", "SELL"], "business"),
  seq(87, "business cost con sell 80 margen 20", [...digits(80), "SELL", ...digits(20), "MGN", "COST"], "business"),
  seq(88, "business margen 100 a 200", [...digits(100), "COST", ...digits(200), "SELL", "MGN"], "business"),
  seq(89, "business margin multiplicada", [...digits(100), "COST", ...digits(200), "SELL", "MGN", "x", ...digits(2), "="], "business"),
  seq(90, "business sell y luego resta", [...digits(100), "COST", ...digits(20), "MGN", "SELL", "-", ...digits(10), "="], "business"),

  seq(91, "remision completa subtotal total gt", [...digits(250), "+", ...digits(700), "+", ...digits(170), "+", ...digits(170), "+", ...digits(50), "+", "/", ...digits(11), "=", "SUBT", ...digits(2), "+", "*", "G*"], "high-risk"),
  seq(92, "tax plus seguido de porcentaje", [...digits(100), "TAX+", "+", ...digits(10), "%", "="], "high-risk"),
  seq(93, "tax minus seguido de porcentaje", [...digits(208), ".", "8", "TAX-", "-", ...digits(10), "%", "="], "high-risk"),
  seq(94, "conversion seguida de porcentaje", [...digits(2), "RATE", ...digits(4), "CONV ->", "+", ...digits(10), "%", "="], "high-risk"),
  seq(95, "porcentaje luego multiplicacion", [...digits(10), "+", ...digits(10), "%", "x", ...digits(2), "="], "high-risk"),
  seq(96, "dos ciclos de total y grand total", [...digits(100), "+", ...digits(20), "*", "G*", ...digits(3), "+", ...digits(4), "*", "G*"], "high-risk"),
  seq(97, "add2 subtotal y continuidad", ["DEC:ADD2", ...digits(100), "+", ...digits(25), "SUBT", ...digits(5), "+"], "high-risk"),
  seq(98, "subtotal despues de precedencia y luego resta", [...digits(5), "+", ...digits(8), "+", ...digits(3), "x", ...digits(2), "SUBT", ...digits(10), "-"], "high-risk"),
  seq(99, "business sell y luego division", [...digits(100), "COST", ...digits(20), "MGN", "SELL", "/", ...digits(2), "="], "high-risk"),
  seq(100, "tax rate conversion y suma en secuencia", [...digits(16), "TAX SET", ...digits(2), "RATE", ...digits(100), "TAX+", "CONV ->", "+", ...digits(5), "="], "high-risk"),
];

if (sequences.length !== 100) {
  throw new Error(`Expected 100 sequences, got ${sequences.length}`);
}

function loadCalculator(repoRoot) {
  const calculatorPath = path.join(repoRoot, "src/domain/calculator/Calculator.ts");
  delete require.cache[calculatorPath];
  const loaded = require(calculatorPath);
  return loaded.Calculator;
}

function applyAction(calculator, action) {
  if (/^[0-9]$/.test(action)) {
    calculator.inputDigit(action);
    return;
  }

  switch (action) {
    case ".":
      calculator.inputDecimal();
      return;
    case "+/-":
      calculator.toggleSign();
      return;
    case "CE":
      calculator.clearEntry();
      return;
    case "CA":
      calculator.clearAll();
      return;
    case "+":
      calculator.add();
      return;
    case "-":
      calculator.subtract();
      return;
    case "x":
      calculator.multiply();
      return;
    case "/":
      calculator.divide();
      return;
    case "=":
      calculator.equals();
      return;
    case "SUBT":
      calculator.subtotal();
      return;
    case "*":
      calculator.total();
      return;
    case "G*":
      calculator.grandTotalRecall();
      return;
    case "#":
      calculator.printReference();
      return;
    case "%":
      calculator.percent();
      return;
    case "TAX+":
      calculator.addTax();
      return;
    case "TAX-":
      calculator.subtractTax();
      return;
    case "TAX SET":
      calculator.setTaxRate();
      return;
    case "RATE":
      calculator.setConversionRate();
      return;
    case "CONV ->":
      calculator.convertDomesticToForeign();
      return;
    case "<- CONV":
      calculator.convertForeignToDomestic();
      return;
    case "M+":
      calculator.memoryAdd();
      return;
    case "M-":
      calculator.memorySubtract();
      return;
    case "MR":
      calculator.memoryRecall();
      return;
    case "MC":
      calculator.memoryClear();
      return;
    case "AVG":
      calculator.printOperationAverage();
      return;
    case "COST":
    case "SELL":
    case "MGN":
      calculator.businessFunction(action);
      return;
    case "DEC:F":
      calculator.setDecimalMode("F");
      return;
    case "DEC:3":
      calculator.setDecimalMode("3");
      return;
    case "DEC:2":
      calculator.setDecimalMode("2");
      return;
    case "DEC:0":
      calculator.setDecimalMode("0");
      return;
    case "DEC:ADD2":
      calculator.setDecimalMode("ADD2");
      return;
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

function extractLastComparableTapeValue(tapeLines) {
  for (let index = tapeLines.length - 1; index >= 0; index -= 1) {
    const line = tapeLines[index].trim();
    if (!line) {
      continue;
    }

    const patterns = [
      /(-?\d+(?:\.\d+)?%?)\s*(?:◇|\*|G\*)$/,
      /^(-?\d+(?:\.\d+)?%?)$/,
      /(?:TOTAL|BASE|TAX|RATE|OUT)\s+(-?\d+(?:\.\d+)?%?)$/,
      /->\s+(-?\d+(?:\.\d+)?)\s+(?:FC|DC)$/,
      /(-?\d+(?:\.\d+)?)\s+M[+\-*◇]$/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}

function normalizeComparableValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).replace(/,/g, "").trim();
}

function closureExpected(actions) {
  const last = actions[actions.length - 1];
  return new Set([
    "=",
    "SUBT",
    "*",
    "G*",
    "AVG",
    "TAX+",
    "TAX-",
    "CONV ->",
    "<- CONV",
    "MR",
    "MC",
    "COST",
    "SELL",
    "MGN",
  ]).has(last);
}

function runSequence(Calculator, sequence) {
  const calculator = new Calculator(() => new Date("2026-09-01T17:20:00"));

  for (const action of sequence.actions) {
    applyAction(calculator, action);
  }

  const state = calculator.getState();
  const tapeTail = state.paperTape.slice(-6);
  const lastTapeValue = extractLastComparableTapeValue(state.paperTape);
  const displayComparable = normalizeComparableValue(state.displayValue);
  const tapeComparable = normalizeComparableValue(lastTapeValue);
  const flags = [];

  if (state.error) {
    flags.push(`error:${state.error}`);
  }

  if (
    closureExpected(sequence.actions) &&
    !state.error &&
    tapeComparable !== null &&
    displayComparable !== tapeComparable
  ) {
    flags.push(`display-vs-tape:${displayComparable}!=${tapeComparable}`);
  }

  if (
    closureExpected(sequence.actions) &&
    !state.error &&
    state.pendingOperation !== null
  ) {
    flags.push(`pending-after-close:${state.pendingOperation}`);
  }

  if (
    !state.error &&
    !/^-?\d+(?:\.\d+)?%?$/.test(state.displayValue)
  ) {
    flags.push(`non-numeric-display:${state.displayValue}`);
  }

  return {
    id: sequence.id,
    name: sequence.name,
    category: sequence.category,
    actions: sequence.actions,
    finalDisplay: state.displayValue,
    error: state.error,
    grandTotal: state.grandTotal,
    operationCount: state.operationCount,
    subtotalCount: state.subtotalCount,
    pendingOperation: state.pendingOperation,
    accumulatorContext: state.accumulatorContext,
    tapeLength: state.paperTape.length,
    tapeTail,
    lastTapeValue,
    flags,
  };
}

function compareResults(left, right) {
  const mismatches = [];
  const comparableKeys = [
    "finalDisplay",
    "error",
    "grandTotal",
    "operationCount",
    "subtotalCount",
    "pendingOperation",
    "accumulatorContext",
    "lastTapeValue",
  ];

  for (const key of comparableKeys) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
      mismatches.push(key);
    }
  }

  if (JSON.stringify(left.tapeTail) !== JSON.stringify(right.tapeTail)) {
    mismatches.push("tapeTail");
  }

  return mismatches;
}

function runBattery(repoRoot) {
  const Calculator = loadCalculator(repoRoot);
  return sequences.map((sequence) => runSequence(Calculator, sequence));
}

function toMarkdown(comparisonRows) {
  const lines = [];
  lines.push("# Calculator Sequence Battery");
  lines.push("");
  lines.push("| ID | Categoria | Secuencia | Baseline | Refactor | Diff | Flags |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");

  for (const row of comparisonRows) {
    const seqText = row.actions.join(" ");
    const baseline = `${row.baseline.finalDisplay} | tape:${row.baseline.lastTapeValue ?? "-"} | ctx:${row.baseline.accumulatorContext}`;
    const refactor = `${row.refactor.finalDisplay} | tape:${row.refactor.lastTapeValue ?? "-"} | ctx:${row.refactor.accumulatorContext}`;
    const diff = row.mismatches.length === 0 ? "match" : row.mismatches.join(", ");
    const flags = [...row.baseline.flags.map((f) => `B:${f}`), ...row.refactor.flags.map((f) => `R:${f}`)].join("; ") || "-";
    lines.push(`| ${row.id} | ${row.category} | ${seqText.replace(/\|/g, "\\|")} | ${baseline.replace(/\|/g, "\\|")} | ${refactor.replace(/\|/g, "\\|")} | ${diff.replace(/\|/g, "\\|")} | ${flags.replace(/\|/g, "\\|")} |`);
  }

  return lines.join("\n");
}

function main() {
  const baselineRoot = process.env.BASELINE_ROOT || path.join(workspaceRoot, "sumadora-2");
  const outputDir =
    process.env.BATTERY_OUTPUT_DIR ||
    path.join(os.tmpdir(), "sumadora-2-sequence-battery");
  const baselineResults = runBattery(baselineRoot);
  const refactorResults = runBattery(refactorRoot);
  const comparisonRows = sequences.map((sequence, index) => ({
    id: sequence.id,
    name: sequence.name,
    category: sequence.category,
    actions: sequence.actions,
    baseline: baselineResults[index],
    refactor: refactorResults[index],
    mismatches: compareResults(baselineResults[index], refactorResults[index]),
  }));

  const summary = {
    generatedAt: "2026-09-01T17:20:00",
    totalSequences: comparisonRows.length,
    divergences: comparisonRows.filter((row) => row.mismatches.length > 0).length,
    baselineFlagged: comparisonRows.filter((row) => row.baseline.flags.length > 0).length,
    refactorFlagged: comparisonRows.filter((row) => row.refactor.flags.length > 0).length,
  };

  fs.mkdirSync(outputDir, { recursive: true });

  const jsonReportPath = path.join(outputDir, "calculator-sequence-battery-report.json");
  const mdReportPath = path.join(outputDir, "calculator-sequence-battery-report.md");

  fs.writeFileSync(
    jsonReportPath,
    JSON.stringify({ summary, rows: comparisonRows }, null, 2)
  );
  fs.writeFileSync(mdReportPath, toMarkdown(comparisonRows));

  console.log(
    JSON.stringify(
      {
        baselineRoot,
        refactorRoot,
        summary,
        jsonReportPath,
        mdReportPath,
      },
      null,
      2
    )
  );
}

module.exports = {
  sequences,
  runBattery,
  compareResults,
  extractLastComparableTapeValue,
  normalizeComparableValue,
  closureExpected,
};

if (require.main === module) {
  main();
}
