import React, { useCallback, useEffect, useRef, useState } from "react";
import { DecimalMode } from "../../domain/calculator/Calculator";
import { CalculatorApplicationService } from "../../application/services/CalculatorApplicationService";
import { BrowserClipboardGateway } from "../../infrastructure/clipboard/BrowserClipboardGateway";
import { BrowserCalculatorSnapshotFileGateway } from "../../infrastructure/files/BrowserCalculatorSnapshotFileGateway";
import { LocalStorageCalculatorSnapshotRepository } from "../../infrastructure/persistence/LocalStorageCalculatorSnapshotRepository";
import { Calculator } from "../../domain/calculator/Calculator";
import { translateCalculatorKeyboardEvent } from "../keyboard/translateCalculatorKeyboardEvent";
import "./CalculatorUI.css";

type SecondaryGroupId = "account" | "memory" | "tax" | "business";

const tapeNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 10,
});

function formatTapeNumericToken(token: string): string {
  const hasPercent = token.endsWith("%");
  const numericPortion = hasPercent ? token.slice(0, -1) : token;
  const parsed = Number(numericPortion);

  if (!Number.isFinite(parsed)) {
    return token;
  }

  const formatted = tapeNumberFormatter.format(parsed);
  return hasPercent ? `${formatted}%` : formatted;
}

function classifyTapeLine(line: string): string {
  const trimmed = line.trim();

  if (!trimmed) {
    return "hr-tape-line-empty";
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
    return "hr-tape-line-timestamp";
  }

  if (/^-+$/.test(trimmed)) {
    return "hr-tape-line-separator";
  }

  if (
    trimmed.startsWith("ItemNo.:") ||
    trimmed === "Sub Total:" ||
    trimmed === "Total:" ||
    trimmed === "GrandTotal:" ||
    trimmed === "TAX+" ||
    trimmed === "TAX-"
  ) {
    return "hr-tape-line-label";
  }

  if (
    trimmed.startsWith("BASE ") ||
    trimmed.startsWith("TOTAL ") ||
    trimmed.startsWith("TAX ") ||
    trimmed.startsWith("RATE ") ||
    trimmed.includes(" IN ") ||
    trimmed.includes(" OUT ")
  ) {
    return "hr-tape-line-summary";
  }

  return "hr-tape-line-operation";
}

function renderTapeLine(line: string): React.ReactNode {
  const trimmed = line.trim();

  if (
    trimmed.startsWith("ItemNo.:") ||
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)
  ) {
    return line;
  }

  const parts = line.split(/(-?\d+(?:\.\d+)?%?)/g);

  return parts.map((part, index) => {
    if (/^-?\d+(?:\.\d+)?%?$/.test(part)) {
      return (
        <span key={`${part}-${index}`} className="hr-tape-number">
          {formatTapeNumericToken(part)}
        </span>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

const secondaryGroups: Array<{
  id: SecondaryGroupId;
  label: string;
  className: string;
  buttons: Array<{
    action: string;
    label: string;
    title?: string;
    className?: string;
  }>;
}> = [
  {
    id: "account",
    label: "Cuenta y cierre",
    className: "hr-keypad-group-account",
    buttons: [
      {
        action: "G*",
        label: "GT G*",
        title: "Grand total: imprime y borra el GT",
        className: "key-fn",
      },
      {
        action: "*",
        label: "TOTAL *",
        title: "Total: cierra la cuenta y la envia al grand total",
        className: "key-total key-commit",
      },
      {
        action: "AVG",
        label: "AVG",
        className: "key-fn",
      },
    ],
  },
  {
    id: "memory",
    label: "Memoria",
    className: "hr-keypad-group-memory",
    buttons: [
      { action: "M+", label: "M+", className: "key-fn key-memory" },
      { action: "M-", label: "M-", className: "key-fn key-memory" },
      { action: "MR", label: "M◇", className: "key-fn key-memory" },
      { action: "MC", label: "M*", className: "key-fn key-memory" },
    ],
  },
  {
    id: "tax",
    label: "Impuesto y conversion",
    className: "hr-keypad-group-tax",
    buttons: [
      { action: "TAX SET", label: "TAX SET", className: "key-fn key-tax" },
      { action: "RATE", label: "RATE", className: "key-fn key-conv" },
      { action: "CONV ->", label: "CONV ->", className: "key-fn key-conv" },
      { action: "<- CONV", label: "<- CONV", className: "key-fn key-conv" },
    ],
  },
  {
    id: "business",
    label: "Negocio",
    className: "hr-keypad-group-business",
    buttons: [
      { action: "COST", label: "COST", className: "key-fn" },
      { action: "SELL", label: "SELL", className: "key-fn" },
      { action: "MGN", label: "MGN", className: "key-fn" },
    ],
  },
];

const CalculatorUI: React.FC = () => {
  const [service] = useState(
    () =>
      new CalculatorApplicationService(
        new Calculator(),
        new LocalStorageCalculatorSnapshotRepository(),
        new BrowserCalculatorSnapshotFileGateway(),
        new BrowserClipboardGateway()
      )
  );
  const [state, setState] = useState(service.getState());
  const [importError, setImportError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [exportFeedback, setExportFeedback] = useState("");
  const [isTapePinned, setIsTapePinned] = useState(true);
  const [activeSecondaryGroup, setActiveSecondaryGroup] = useState<SecondaryGroupId>("account");
  const paperTapeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setState(service.hydrate());
  }, [service]);

  useEffect(() => {
    service.persist();
  }, [service, state]);

  useEffect(() => {
    if (paperTapeRef.current && isTapePinned) {
      paperTapeRef.current.scrollTop = paperTapeRef.current.scrollHeight;
    }
  }, [state.paperTape, isTapePinned]);

  const scrollTapeToBottom = useCallback(() => {
    if (!paperTapeRef.current) {
      return;
    }
    paperTapeRef.current.scrollTop = paperTapeRef.current.scrollHeight;
    setIsTapePinned(true);
  }, []);

  const handleTapeScroll = useCallback(() => {
    if (!paperTapeRef.current) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = paperTapeRef.current;
    const nearBottom = scrollHeight - (scrollTop + clientHeight) < 16;
    setIsTapePinned(nearBottom);
  }, []);

  const handleButtonClick = useCallback((action: string) => {
    setState(service.dispatch(action));
  }, [service]);

  const handleDecimalModeChange = (decimalMode: DecimalMode) => {
    setState(service.setDecimalMode(decimalMode));
  };

  const handleExport = () => {
    service.exportSnapshot();
  };

  const handleExportReceiptPdf = useCallback(async () => {
    try {
      await service.exportReceiptPdf();
      setExportFeedback("Ticket PDF listo.");
    } catch {
      setExportFeedback("No se pudo exportar el ticket PDF.");
    }
  }, [service]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCopyDisplayValue = useCallback(async () => {
    try {
      const copiedValue = await service.copyDisplayValue();
      setCopyFeedback(`Copiado: ${copiedValue}`);
    } catch {
      setCopyFeedback("No se pudo copiar el valor mostrado.");
    }
  }, [service]);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      setState(await service.importSnapshot(file));
      setImportError("");
    } catch {
      setImportError("Archivo invalido. Debe ser un backup JSON exportado por la app.");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const keyboardAction = translateCalculatorKeyboardEvent(event);
      if (!keyboardAction) {
        return;
      }

      if (keyboardAction.preventDefault) {
        event.preventDefault();
      }

      handleButtonClick(keyboardAction.action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleButtonClick]);

  useEffect(() => {
    if (!copyFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyFeedback("");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback]);

  useEffect(() => {
    if (!exportFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setExportFeedback("");
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [exportFeedback]);

  const activeSecondaryPanel =
    secondaryGroups.find((group) => group.id === activeSecondaryGroup) ?? secondaryGroups[0];

  return (
    <div className="hr-container">
      <div className="hr-calculator">
        <div className="hr-topbar">
          <div className="hr-brand">
            <h2>Sumadora Contable V1</h2>
            <p>Replica web con cinta siempre activa</p>
          </div>
          <div className="hr-storage-actions">
            <button onClick={handleExportReceiptPdf}>Ticket PDF</button>
            <button onClick={handleExport}>Backup</button>
            <button onClick={handleImportClick}>Importar</button>
            <button onClick={() => handleButtonClick("TAPE CLR")}>Limpiar cinta</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              hidden
            />
          </div>
        </div>

        <div className="hr-tape-display-stack">
          <div className="hr-paper-tape">
            <div className="hr-paper-tape-head">
              <h3>Cinta de papel</h3>
              {!isTapePinned && state.paperTape.length > 0 && (
                <button className="hr-scroll-end" onClick={scrollTapeToBottom}>
                  Ir al final
                </button>
              )}
            </div>
            <div className="hr-tape-scroll" ref={paperTapeRef} onScroll={handleTapeScroll}>
              <div className="hr-tape-content">
                {state.paperTape.map((line, index) => (
                  <div
                    key={index}
                    className={`hr-tape-line ${classifyTapeLine(line)} ${index === state.paperTape.length - 1 ? "hr-tape-line-last" : ""}`.trim()}
                  >
                    {renderTapeLine(line)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="hr-display-section"
            onDoubleClick={handleCopyDisplayValue}
            title="Doble clic para copiar el valor mostrado"
          >
            <div className="hr-leds">
              <span>DEC {state.decimalMode}</span>
              <span>ITEM {state.operationCount}</span>
              <span>GTN {state.subtotalCount}</span>
              <span>M {state.independentMemory !== 0 ? "ON" : "OFF"}</span>
            </div>
            <div className="hr-display">{state.displayValue}</div>
            <div className="hr-status-line">
              <span>TAX {state.taxRate}%</span>
              <span>RATE {state.conversionRate}</span>
              <span>GT {state.grandTotal}</span>
            </div>
          </div>
        </div>

        <div className="hr-selectors">
          <div className="hr-selector-group">
            <label>Selector decimal</label>
            <div className="hr-selector-buttons">
              {(["F", "3", "2", "0", "ADD2"] as DecimalMode[]).map((decimalMode) => (
                <button
                  key={decimalMode}
                  className={state.decimalMode === decimalMode ? "active" : ""}
                  onClick={() => handleDecimalModeChange(decimalMode)}
                >
                  {decimalMode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hr-keypad-layout">
          <div className="hr-keypad-primary">
            <div className="hr-keypad-primary-tools">
              <button className="key-fn" onClick={() => handleButtonClick("CE")}>CE</button>
              <button className="key-op" onClick={() => handleButtonClick("/")}>/</button>
              <button className="key-fn key-symbol" onClick={() => handleButtonClick("%")}>%</button>
              <button className="key-fn key-symbol" onClick={() => handleButtonClick("+/-")}>+/-</button>
            </div>

            <div className="hr-keypad-primary-tools">
              <button className="key-fn key-tax" onClick={() => handleButtonClick("TAX+")}>TAX+</button>
              <button className="key-fn key-tax" onClick={() => handleButtonClick("TAX-")}>TAX-</button>
              <button className="key-fn" onClick={() => handleButtonClick("#")}>#</button>
              <button
                className="key-warn"
                onClick={() => handleButtonClick("CA")}
              >
                CA
              </button>
            </div>

            <div className="hr-keypad-primary-grid">
              <button className="key-num" onClick={() => handleButtonClick("7")}>7</button>
              <button className="key-num" onClick={() => handleButtonClick("8")}>8</button>
              <button className="key-num" onClick={() => handleButtonClick("9")}>9</button>
              <button className="key-op" onClick={() => handleButtonClick("-")}>-</button>

              <button className="key-num" onClick={() => handleButtonClick("4")}>4</button>
              <button className="key-num" onClick={() => handleButtonClick("5")}>5</button>
              <button className="key-num" onClick={() => handleButtonClick("6")}>6</button>
              <button className="key-op" onClick={() => handleButtonClick("+")}>+</button>

              <button className="key-num" onClick={() => handleButtonClick("1")}>1</button>
              <button className="key-num" onClick={() => handleButtonClick("2")}>2</button>
              <button className="key-num" onClick={() => handleButtonClick("3")}>3</button>
              <button className="key-op" onClick={() => handleButtonClick("x")}>x</button>

              <button className="key-num key-zero" onClick={() => handleButtonClick("0")}>0</button>
              <button className="key-num" onClick={() => handleButtonClick(".")}>.</button>
              <button
                className="key-fn key-subtotal"
                title="Subtotal: imprime sin cerrar la cuenta"
                onClick={() => handleButtonClick("SUBT")}
              >
                SUBT ◇
              </button>
            </div>
          </div>

          <div className="hr-keypad-secondary">
            <div className="hr-secondary-switcher" role="tablist" aria-label="Funciones secundarias">
              {secondaryGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSecondaryGroup === group.id}
                  className={`hr-secondary-tab ${group.className} ${activeSecondaryGroup === group.id ? "active" : ""}`.trim()}
                  onClick={() => setActiveSecondaryGroup(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className={`hr-keypad-group hr-secondary-panel ${activeSecondaryPanel.className}`.trim()}>
              <h4>{activeSecondaryPanel.label}</h4>
              <div
                className={`hr-keypad-group-grid ${activeSecondaryPanel.id === "account" ? "hr-keypad-group-grid-account" : ""}`.trim()}
              >
                {activeSecondaryPanel.buttons.map((button) => (
                  <button
                    key={button.action}
                    className={button.className}
                    title={button.title}
                    onClick={() => handleButtonClick(button.action)}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {importError && <p className="import-error">{importError}</p>}
        {copyFeedback && <p className="copy-feedback">{copyFeedback}</p>}
        {exportFeedback && <p className="copy-feedback">{exportFeedback}</p>}
      </div>
    </div>
  );
};

export default CalculatorUI;
