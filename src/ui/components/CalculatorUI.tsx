import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DecimalMode,
  Mode,
} from "../../domain/calculator/Calculator";
import { CalculatorApplicationService } from "../../application/services/CalculatorApplicationService";
import { BrowserClipboardGateway } from "../../infrastructure/clipboard/BrowserClipboardGateway";
import { BrowserCalculatorSnapshotFileGateway } from "../../infrastructure/files/BrowserCalculatorSnapshotFileGateway";
import { LocalStorageCalculatorSnapshotRepository } from "../../infrastructure/persistence/LocalStorageCalculatorSnapshotRepository";
import { Calculator } from "../../domain/calculator/Calculator";
import { translateCalculatorKeyboardEvent } from "../keyboard/translateCalculatorKeyboardEvent";
import "./CalculatorUI.css";

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
  const [isTapePinned, setIsTapePinned] = useState(true);
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

  const handleModeChange = (mode: Mode) => {
    setState(service.setMode(mode));
  };

  const handleDecimalModeChange = (decimalMode: DecimalMode) => {
    setState(service.setDecimalMode(decimalMode));
  };

  const handleExport = () => {
    service.exportSnapshot();
  };

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
    event.target.value = '';
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

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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

  return (
    <div className="hr-container">
      <div className="hr-calculator">
        <div className="hr-topbar">
          <div className="hr-brand">
            <h2>Sumadora Contable V1</h2>
            <p>Replica web con cinta siempre activa</p>
          </div>
          <div className="hr-storage-actions">
            <button onClick={handleExport}>Exportar</button>
            <button onClick={handleImportClick}>Importar</button>
            <button onClick={() => handleButtonClick('TAPE CLR')}>Limpiar cinta</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              hidden
            />
          </div>
        </div>

        <div className="hr-display-section">
          <div className="hr-leds">
            <span>{state.mode}</span>
            <span>DEC {state.decimalMode}</span>
            <span>ITM {state.itemCount}</span>
            <span>M {state.independentMemory !== 0 ? 'ON' : 'OFF'}</span>
          </div>
          <div
            className="hr-display"
            onDoubleClick={handleCopyDisplayValue}
            title="Doble clic para copiar el valor mostrado"
          >
            {state.displayValue}
          </div>
          <div className="hr-status-line">
            <span>TAX {state.taxRate}%</span>
            <span>RATE {state.conversionRate}</span>
            <span>GT {state.grandTotal}</span>
          </div>
        </div>

        <div className="hr-selectors">
          <div className="hr-selector-group">
            <label>Modo de trabajo</label>
            <div className="hr-selector-buttons">
              {(['NORMAL', 'ITEM', 'CONVERSION'] as Mode[]).map((mode) => (
                <button
                  key={mode}
                  className={state.mode === mode ? 'active' : ''}
                  onClick={() => handleModeChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="hr-selector-group">
            <label>Selector decimal</label>
            <div className="hr-selector-buttons">
              {(['F', '3', '2', '0', 'ADD2'] as DecimalMode[]).map((decimalMode) => (
                <button
                  key={decimalMode}
                  className={state.decimalMode === decimalMode ? 'active' : ''}
                  onClick={() => handleDecimalModeChange(decimalMode)}
                >
                  {decimalMode}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="hr-helper-line">La cinta esta siempre activa; el modo solo cambia la logica contable o de conversion.</p>

        <div className="hr-keypad">
          <button className="key-fn" onClick={() => handleButtonClick('REF')}>REF</button>
          <button className="key-fn" onClick={() => handleButtonClick('GT')}>GT</button>
          <button className="key-fn" onClick={() => handleButtonClick('ITM')}>ITM+</button>
          <button className="key-fn" onClick={() => handleButtonClick('SUBT')}>SUBT</button>
          <button className="key-fn" onClick={() => handleButtonClick('AVG')}>AVG</button>

          <button className="key-fn" onClick={() => handleButtonClick('M+')}>M+</button>
          <button className="key-fn" onClick={() => handleButtonClick('M-')}>M-</button>
          <button className="key-fn" onClick={() => handleButtonClick('MR')}>MR</button>
          <button className="key-fn" onClick={() => handleButtonClick('MC')}>MC</button>
          <button className="key-warn" onClick={() => handleButtonClick('CA')}>CA</button>

          <button className="key-fn" onClick={() => handleButtonClick('TAX SET')}>TAX SET</button>
          <button className="key-fn" onClick={() => handleButtonClick('TAX+')}>TAX+</button>
          <button className="key-fn" onClick={() => handleButtonClick('TAX-')}>TAX-</button>
          <button className="key-fn" onClick={() => handleButtonClick('%')}>%</button>
          <button className="key-warn" onClick={() => handleButtonClick('CE')}>CE</button>

          <button className="key-fn" onClick={() => handleButtonClick('RATE')}>RATE</button>
          <button className="key-fn" onClick={() => handleButtonClick('CONV ->')}>CONV -&gt;</button>
          <button className="key-fn" onClick={() => handleButtonClick('<- CONV')}>&lt;- CONV</button>
          <button className="key-fn" onClick={() => handleButtonClick('COST')}>COST</button>
          <button className="key-fn" onClick={() => handleButtonClick('SELL')}>SELL</button>

          <button onClick={() => handleButtonClick('7')}>7</button>
          <button onClick={() => handleButtonClick('8')}>8</button>
          <button onClick={() => handleButtonClick('9')}>9</button>
          <button className="key-op" onClick={() => handleButtonClick('/')}>/</button>
          <button className="key-fn" onClick={() => handleButtonClick('MGN')}>MGN</button>

          <button onClick={() => handleButtonClick('4')}>4</button>
          <button onClick={() => handleButtonClick('5')}>5</button>
          <button onClick={() => handleButtonClick('6')}>6</button>
          <button className="key-op" onClick={() => handleButtonClick('x')}>x</button>
          <button className="key-op" onClick={() => handleButtonClick('-')}>-</button>

          <button onClick={() => handleButtonClick('1')}>1</button>
          <button onClick={() => handleButtonClick('2')}>2</button>
          <button onClick={() => handleButtonClick('3')}>3</button>
          <button className="key-op key-plus" onClick={() => handleButtonClick('+=')}>+ =</button>
          <button className="key-fn" onClick={() => handleButtonClick('ITM TOTAL')}>ITM Σ</button>

          <button className="key-wide" onClick={() => handleButtonClick('0')}>0</button>
          <button onClick={() => handleButtonClick('.')}>.</button>
          <button onClick={() => handleButtonClick('+/-')}>+/-</button>
        </div>

        {importError && <p className="import-error">{importError}</p>}
        {copyFeedback && <p className="copy-feedback">{copyFeedback}</p>}
      </div>

      <div className="hr-paper-tape">
        <h3>Cinta de papel</h3>
        <div className="hr-tape-scroll" ref={paperTapeRef} onScroll={handleTapeScroll}>
          <div className="hr-tape-content">
          {state.paperTape.map((line, index) => (
              <div
                key={index}
                className={`hr-tape-line ${index === state.paperTape.length - 1 ? 'hr-tape-line-last' : ''}`.trim()}
              >
                {line}
              </div>
          ))}
          </div>
        </div>
        {!isTapePinned && state.paperTape.length > 0 && (
          <button className="hr-scroll-end" onClick={scrollTapeToBottom}>Ir al final</button>
        )}
      </div>
    </div>
  );
};

export default CalculatorUI;
