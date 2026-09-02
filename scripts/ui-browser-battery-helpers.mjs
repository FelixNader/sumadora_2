import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

const WORKSPACE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const BATTERY_SCRIPT_PATH = path.join(
  WORKSPACE_ROOT,
  "sumadora-2-refactor",
  "scripts",
  "run-differential-sequence-battery.js"
);

function loadBatteryExports() {
  const batteryDir = path.dirname(BATTERY_SCRIPT_PATH);
  const batterySource = fs
    .readFileSync(BATTERY_SCRIPT_PATH, "utf8")
    .replace(/if \(require\.main === module\) \{[\s\S]*?\}\s*$/, "");

  const fakeRequire = (id) => {
    if (id === "fs") {
      return fs;
    }
    if (id === "os") {
      return os;
    }
    if (id === "path") {
      return path;
    }
    if (id.endsWith("/node_modules/typescript")) {
      return {
        ModuleKind: { CommonJS: 1 },
        ScriptTarget: { ES2019: 1 },
        JsxEmit: { ReactJSX: 1 },
        transpileModule: (source) => ({ outputText: source }),
      };
    }
    throw new Error(`Unsupported require in battery helper: ${id}`);
  };

  fakeRequire.extensions = {};

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: fakeRequire,
    __dirname: batteryDir,
    __filename: BATTERY_SCRIPT_PATH,
    console: { log: () => {} },
    process: { env: {} },
  };

  vm.runInNewContext(
    `${batterySource}\nmodule.exports = { sequences, extractLastComparableTapeValue, normalizeComparableValue };`,
    sandbox,
    { filename: BATTERY_SCRIPT_PATH }
  );

  return sandbox.module.exports;
}

const battery = loadBatteryExports();

export const uiSequences = battery.sequences;
export const extractUiTapeValue = battery.extractLastComparableTapeValue;
export const normalizeUiValue = battery.normalizeComparableValue;

const secondaryTabsByAction = {
  "G*": "Cuenta y cierre",
  "*": "Cuenta y cierre",
  AVG: "Cuenta y cierre",
  "M+": "Memoria",
  "M-": "Memoria",
  MR: "Memoria",
  MC: "Memoria",
  "TAX SET": "Impuesto y conversion",
  RATE: "Impuesto y conversion",
  "CONV ->": "Impuesto y conversion",
  "<- CONV": "Impuesto y conversion",
  COST: "Negocio",
  SELL: "Negocio",
  MGN: "Negocio",
};

const buttonLabelsByAction = {
  SUBT: "SUBT ◇",
  "G*": "GT G*",
  "*": "TOTAL *",
  MR: "M◇",
  MC: "M*",
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function openCalculatorTab(browser, url) {
  const tab = await browser.tabs.new();
  await tab.goto(url);
  await tab.playwright.waitForLoadState({
    state: "domcontentloaded",
    timeoutMs: 30000,
  });
  return tab;
}

async function clickTopbarButton(tab, label) {
  await tab.playwright
    .getByRole("button", { name: label, exact: true })
    .click({ timeoutMs: 10000 });
}

export async function clickUiAction(tab, action) {
  const page = tab.playwright;

  if (action.startsWith("DEC:")) {
    const label = action.slice(4);
    await page
      .locator(".hr-selector-buttons button")
      .filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) })
      .first()
      .click({ timeoutMs: 10000 });
    return;
  }

  const secondaryTab = secondaryTabsByAction[action];
  if (secondaryTab) {
    await page
      .getByRole("tab", { name: secondaryTab, exact: true })
      .click({ timeoutMs: 10000 });
  }

  if (action === "=") {
    await page
      .getByRole("button", { name: "CA", exact: true })
      .press("=");
    return;
  }

  let locator;

  if (/^[1-9]$/.test(action)) {
    locator = page
      .locator(".hr-keypad-primary-grid button")
      .filter({ hasText: new RegExp(`^${action}$`) })
      .first();
  } else if (action === "0") {
    locator = page.locator(".hr-keypad-primary-grid .key-zero");
  } else if (action === ".") {
    locator = page
      .locator(".hr-keypad-primary-grid button")
      .filter({ hasText: /^\.$/ })
      .first();
  } else if (["+", "-", "x"].includes(action)) {
    locator = page
      .locator(".hr-keypad-primary-grid button")
      .filter({ hasText: new RegExp(`^${escapeRegExp(action)}$`) })
      .first();
  } else if (["CE", "/", "%", "+/-", "TAX+", "TAX-", "#", "CA"].includes(action)) {
    locator = page.getByRole("button", { name: action, exact: true });
  } else {
    locator = page.getByRole("button", {
      name: buttonLabelsByAction[action] ?? action,
      exact: true,
    });
  }

  await locator.click({ timeoutMs: 10000 });
}

export async function resetUiApp(tab) {
  await clickUiAction(tab, "CA");
  await clickTopbarButton(tab, "Limpiar cinta");
  await tab.playwright
    .locator(".hr-selector-buttons button")
    .filter({ hasText: /^F$/ })
    .first()
    .click({ timeoutMs: 10000 });

  await clickUiAction(tab, "1");
  await clickUiAction(tab, "6");
  await clickUiAction(tab, "TAX SET");
  await clickUiAction(tab, "1");
  await clickUiAction(tab, "RATE");
  await clickUiAction(tab, "MC");
  await clickUiAction(tab, "CA");
  await clickTopbarButton(tab, "Limpiar cinta");
  await tab.playwright
    .getByRole("tab", { name: "Cuenta y cierre", exact: true })
    .click({ timeoutMs: 10000 });
  await tab.playwright.waitForTimeout(10);
}

export async function readUiState(tab) {
  return tab.playwright.evaluate(() => {
    const text = (selector) => {
      const node = document.querySelector(selector);
      return node ? (node.textContent || "").trim() : null;
    };
    const texts = (selector) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean);

    return {
      display: text(".hr-display"),
      leds: texts(".hr-leds span"),
      status: texts(".hr-status-line span"),
      tapeLines: texts(".hr-tape-line"),
      activeSecondaryTab: text(".hr-secondary-tab.active"),
    };
  });
}

export async function probeUiResponsiveness(tab) {
  try {
    await clickUiAction(tab, "CA");
    await tab.playwright.waitForTimeout(10);
    const beforeInput = await tab.playwright
      .locator(".hr-display")
      .innerText({ timeoutMs: 5000 });
    await clickUiAction(tab, "1");
    await tab.playwright.waitForTimeout(10);

    const probeDisplay = await tab.playwright
      .locator(".hr-display")
      .innerText({ timeoutMs: 5000 });

    return {
      responsive: probeDisplay !== beforeInput,
      probeDisplay,
    };
  } catch (error) {
    return {
      responsive: false,
      probeDisplay: `probe-error:${error?.message || error}`,
    };
  }
}

export async function runUiSequence(tab, sequence) {
  await resetUiApp(tab);

  for (const action of sequence.actions) {
    await clickUiAction(tab, action);
    await tab.playwright.waitForTimeout(10);
  }

  const ui = await readUiState(tab);
  const lastTapeValue = extractUiTapeValue(ui.tapeLines);
  const comparableDisplay = normalizeUiValue(ui.display);
  const comparableTape = normalizeUiValue(lastTapeValue);
  const probe = await probeUiResponsiveness(tab);

  return {
    id: sequence.id,
    name: sequence.name,
    category: sequence.category,
    actions: sequence.actions,
    finalDisplay: ui.display,
    lastTapeValue,
    displayMatchesTape: comparableTape === null || comparableDisplay === comparableTape,
    leds: ui.leds,
    status: ui.status,
    tapeTail: ui.tapeLines.slice(-8),
    activeSecondaryTab: ui.activeSecondaryTab,
    responsive: probe.responsive,
    probeDisplay: probe.probeDisplay,
  };
}

export function buildUiFlags(result) {
  const flags = [];

  if (result.finalDisplay === "E") {
    flags.push("display:E");
  }

  if (!result.displayMatchesTape) {
    flags.push(`display-vs-tape:${result.finalDisplay}!=${result.lastTapeValue}`);
  }

  if (!result.responsive) {
    flags.push(`unresponsive:${result.probeDisplay}`);
  }

  return flags;
}

export function compareUiResults(left, right) {
  const mismatches = [];

  for (const key of ["finalDisplay", "lastTapeValue", "displayMatchesTape", "responsive"]) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
      mismatches.push(key);
    }
  }

  if (JSON.stringify(left.status) !== JSON.stringify(right.status)) {
    mismatches.push("status");
  }

  return mismatches;
}

export async function runUiBatch({
  baselineTab,
  refactorTab,
  startIndex,
  endIndexExclusive,
}) {
  const rows = [];

  for (const sequence of uiSequences.slice(startIndex, endIndexExclusive)) {
    let baseline;
    let refactor;

    try {
      baseline = await runUiSequence(baselineTab, sequence);
    } catch (error) {
      baseline = sequenceErrorResult(sequence, error);
      await tryRecoverTab(baselineTab);
    }

    try {
      refactor = await runUiSequence(refactorTab, sequence);
    } catch (error) {
      refactor = sequenceErrorResult(sequence, error);
      await tryRecoverTab(refactorTab);
    }

    rows.push({
      id: sequence.id,
      name: sequence.name,
      category: sequence.category,
      actions: sequence.actions,
      baseline,
      refactor,
      baselineFlags: buildUiFlags(baseline),
      refactorFlags: buildUiFlags(refactor),
      mismatches: compareUiResults(baseline, refactor),
    });
  }

  return rows;
}

function sequenceErrorResult(sequence, error) {
  return {
    id: sequence.id,
    name: sequence.name,
    category: sequence.category,
    actions: sequence.actions,
    finalDisplay: null,
    lastTapeValue: null,
    displayMatchesTape: false,
    leds: [],
    status: [],
    tapeTail: [],
    activeSecondaryTab: null,
    responsive: false,
    probeDisplay: `run-error:${error?.message || error}`,
  };
}

async function tryRecoverTab(tab) {
  try {
    await tab.reload();
    await tab.playwright.waitForLoadState({
      state: "domcontentloaded",
      timeoutMs: 30000,
    });
  } catch {}
}

export function summarizeUiRows(rows) {
  return {
    totalSequences: rows.length,
    divergences: rows.filter((row) => row.mismatches.length > 0).length,
    baselineFlagged: rows.filter((row) => row.baselineFlags.length > 0).length,
    refactorFlagged: rows.filter((row) => row.refactorFlags.length > 0).length,
    baselineUnresponsive: rows.filter((row) => !row.baseline.responsive).length,
    refactorUnresponsive: rows.filter((row) => !row.refactor.responsive).length,
  };
}

export function writeUiReport(rows, outputDir = path.join(os.tmpdir(), "sumadora-2-ui-sequence-battery")) {
  const summary = {
    generatedAt: new Date().toISOString(),
    ...summarizeUiRows(rows),
  };

  fs.mkdirSync(outputDir, { recursive: true });

  const jsonReportPath = path.join(outputDir, "ui-sequence-battery-report.json");
  const mdReportPath = path.join(outputDir, "ui-sequence-battery-report.md");

  fs.writeFileSync(jsonReportPath, JSON.stringify({ summary, rows }, null, 2));
  fs.writeFileSync(mdReportPath, toUiMarkdown(summary, rows));

  return { summary, jsonReportPath, mdReportPath };
}

function toUiMarkdown(summary, rows) {
  const lines = [];
  lines.push("# UI Differential Sequence Battery");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push("");
  lines.push("| ID | Categoria | Secuencia | Baseline | Refactor | Diff | Flags |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");

  for (const row of rows) {
    const seqText = row.actions.join(" ");
    const baselineText = `${row.baseline.finalDisplay ?? "-"} | tape:${row.baseline.lastTapeValue ?? "-"} | responsive:${row.baseline.responsive}`;
    const refactorText = `${row.refactor.finalDisplay ?? "-"} | tape:${row.refactor.lastTapeValue ?? "-"} | responsive:${row.refactor.responsive}`;
    const diffText = row.mismatches.length ? row.mismatches.join(", ") : "match";
    const flagsText =
      [
        ...row.baselineFlags.map((flag) => `B:${flag}`),
        ...row.refactorFlags.map((flag) => `R:${flag}`),
      ].join("; ") || "-";

    lines.push(
      `| ${row.id} | ${row.category} | ${seqText.replace(/\|/g, "\\|")} | ${baselineText.replace(/\|/g, "\\|")} | ${refactorText.replace(/\|/g, "\\|")} | ${diffText.replace(/\|/g, "\\|")} | ${flagsText.replace(/\|/g, "\\|")} |`
    );
  }

  return lines.join("\n");
}
