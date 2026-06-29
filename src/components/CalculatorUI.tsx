import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Calculator, CalculatorSnapshot, Mode, DecimalMode } from '../Calculator';
import './CalculatorUI.css';

const STORAGE_KEY = 'casio-hr100tm-state-v1';

const CalculatorUI: React.FC = () => {
  const [calculator] = useState(() => new Calculator());
  const [state, setState] = useState(calculator.getState());
  const [importError, setImportError] = useState('');
  const [isTapePinned, setIsTapePinned] = useState(true);
  const paperTapeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setState(calculator.getState());
      return;
    }

    try {
      const snapshot = JSON.parse(raw) as CalculatorSnapshot;
      calculator.loadSnapshot(snapshot);
      setState(calculator.getState());
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setState(calculator.getState());
    }
  }, [calculator]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calculator.getSnapshot()));
  }, [calculator, state]);

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
    switch (action) {
      case '0': case '1': case '2': case '3': case '4':
      case '5': case '6': case '7': case '8': case '9':
        calculator.inputDigit(action);
        break;
      case '.':
        calculator.inputDecimal();
        break;
      case '+/-':
        calculator.toggleSign();
        break;
      case 'CE':
        calculator.clearEntry();
        break;
      case 'CA':
        calculator.clearAll();
        break;
      case '+':
        calculator.add();
        break;
      case '+=':
        calculator.add();
        break;
      case '-':
        calculator.subtract();
        break;
      case 'x':
        calculator.multiply();
        break;
      case '/':
        calculator.divide();
        break;
      case '=':
        calculator.equals();
        break;
      case 'M+':
        calculator.memoryAdd();
        break;
      case 'M-':
        calculator.memorySubtract();
        break;
      case 'MR':
        calculator.memoryRecall();
        break;
      case 'MC':
        calculator.memoryClear();
        break;
      case 'REF':
        calculator.printReference();
        break;
      case 'GT':
        calculator.grandTotalRecall();
        break;
      case 'ITM':
        calculator.addSpecifiedItemCount();
        break;
      case 'ITM TOTAL':
        calculator.printItemTotal();
        break;
      case 'SUBT':
        calculator.subtotal();
        break;
      case 'AVG':
        calculator.printItemAverage();
        break;
      case '%':
        calculator.percent();
        break;
      case 'TAX+':
        calculator.addTax();
        break;
      case 'TAX-':
        calculator.subtractTax();
        break;
      case 'TAX SET':
        calculator.setTaxRate();
        break;
      case 'RATE':
        calculator.setConversionRate();
        break;
      case 'CONV ->':
        calculator.convertDomesticToForeign();
        break;
      case '<- CONV':
        calculator.convertForeignToDomestic();
        break;
      case 'COST':
        calculator.businessFunction('COST');
        break;
      case 'SELL':
        calculator.businessFunction('SELL');
        break;
      case 'MGN':
        calculator.businessFunction('MGN');
        break;
      case 'TAPE CLR':
        calculator.clearTape();
        break;
      default:
        break;
    }

    setState(calculator.getState());
  }, [calculator]);

  const handleModeChange = (mode: Mode) => {
    calculator.setMode(mode);
    setState(calculator.getState());
  };

  const handleDecimalModeChange = (decimalMode: DecimalMode) => {
    calculator.setDecimalMode(decimalMode);
    setState(calculator.getState());
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(calculator.getSnapshot(), null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `casio-hr100tm-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const snapshot = JSON.parse(text) as CalculatorSnapshot;
      calculator.loadSnapshot(snapshot);
      setState(calculator.getState());
      setImportError('');
    } catch {
      setImportError('Archivo invalido. Debe ser un backup JSON exportado por la app.');
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const key = event.key;
      if (/^[0-9]$/.test(key)) {
        handleButtonClick(key);
        return;
      }

      if (key === '.') {
        handleButtonClick('.');
        return;
      }

      if (key === '+') {
        handleButtonClick('+');
        return;
      }

      if (key === '-') {
        handleButtonClick('-');
        return;
      }

      if (key === '*') {
        handleButtonClick('x');
        return;
      }

      if (key === '/') {
        event.preventDefault();
        handleButtonClick('/');
        return;
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault();
        handleButtonClick('=');
        return;
      }

      if (key === 'Escape') {
        handleButtonClick('CA');
        return;
      }

      if (key === 'Backspace') {
        handleButtonClick('CE');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [calculator, handleButtonClick]);

  return (
    <div className="hr-container">
      <div className="hr-calculator">
        <div className="hr-topbar">
          <div className="hr-brand">
            <h2>CASIO HR-100TM</h2>
            <p>Desktop Printing Calculator (Replica)</p>
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
          <div className="hr-display">{state.displayValue}</div>
          <div className="hr-status-line">
            <span>TAX {state.taxRate}%</span>
            <span>RATE {state.conversionRate}</span>
            <span>GT {state.grandTotal}</span>
          </div>
        </div>

        <div className="hr-selectors">
          <div className="hr-selector-group">
            <label>Function Selector</label>
            <div className="hr-selector-buttons">
              {(['OFF', 'ON', 'PRINT', 'ITEM', 'CONVERSION'] as Mode[]).map((mode) => (
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
            <label>Decimal Selector</label>
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
