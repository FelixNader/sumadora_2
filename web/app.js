import {
  nuevaCalculadora,
  restaurarCalculadora,
  encender,
  formatearValorVisible,
  obtenerDisplayVisible,
  presionarTecla,
  ESTADO_ENCENDIDA_ESPERANDO_TYPING,
} from "./engine.mjs";

const STORAGE_KEY = "sumadora-contable-state-v1";

const displayNode = document.querySelector("[data-display]");
const subtotalNode = document.querySelector("[data-subtotal]");
const granTotalNode = document.querySelector("[data-gran-total]");
const memoriaNode = document.querySelector("[data-memoria]");
const pubNode = document.querySelector("[data-pub]");
const estadoNode = document.querySelector("[data-estado]");
const cintaNode = document.querySelector("[data-cinta]");
const logNode = document.querySelector("[data-log]");
const panelButtons = document.querySelectorAll("[data-panel]");
const panelNodes = document.querySelectorAll("[data-panel-body]");
const deckButtons = document.querySelectorAll("[data-deck]");
const deckNodes = document.querySelectorAll("[data-deck-body]");
const keypad = document.querySelector("[data-keypad]");
const modeButtons = document.querySelectorAll("[data-decimal-mode]");
const taxRateButton = document.querySelector("[data-tax-rate]");
const conversionRateButton = document.querySelector("[data-conversion-rate]");
const outRateButton = document.querySelector("[data-out-rate]");
const spreadRateButton = document.querySelector("[data-spread-rate]");
const metaModeNode = document.querySelector("[data-meta-mode]");
const metaTaxNode = document.querySelector("[data-meta-tax]");
const metaRateNode = document.querySelector("[data-meta-rate]");
const metaPubNode = document.querySelector("[data-meta-pub]");

let calculadora = cargarCalculadora();

sincronizarViewport();
render();
registrarServiceWorker();
blindarGestosIOS();

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-key]");
  if (!button) {
    return;
  }
  procesarTecla(button.dataset.key);
});

document.addEventListener("keydown", (event) => {
  const tecla = mapearTecla(event.key);
  if (!tecla) {
    return;
  }
  event.preventDefault();
  procesarTecla(tecla);
});

panelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nombre = button.dataset.panel;
    activarPanel(nombre);
  });
});

deckButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nombre = button.dataset.deck;
    activarDeck(nombre);
  });
});

window.addEventListener("resize", sincronizarViewport);
window.addEventListener("orientationchange", () => {
  sincronizarViewport();
  requestAnimationFrame(() => {
    requestAnimationFrame(sincronizarViewport);
  });
  setTimeout(sincronizarViewport, 120);
  setTimeout(sincronizarViewport, 320);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", sincronizarViewport);
}

function cargarCalculadora() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const nueva = nuevaCalculadora();
    encender(nueva);
    guardarCalculadora(nueva);
    return nueva;
  }

  try {
    const snapshot = JSON.parse(raw);
    const restaurada = restaurarCalculadora(snapshot);
    if (restaurada.estado === "apagada") {
      encender(restaurada);
    }
    return restaurada;
  } catch {
    const nueva = nuevaCalculadora();
    encender(nueva);
    guardarCalculadora(nueva);
    return nueva;
  }
}

function guardarCalculadora(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function procesarTecla(tecla) {
  try {
    presionarTecla(calculadora, tecla);
  } catch (error) {
    flashError(error.message);
  }
  guardarCalculadora(calculadora);
  render();
}

function render() {
  displayNode.textContent = obtenerDisplayVisible(calculadora);
  subtotalNode.textContent = calculadora.ultimo_subtotal
    ? formatearValorVisible(calculadora, calculadora.ultimo_subtotal)
    : "-";
  granTotalNode.textContent = formatearValorVisible(calculadora, calculadora.gran_total);
  memoriaNode.textContent = formatearValorVisible(calculadora, calculadora.memoria);
  pubNode.textContent = calculadora.tasa_publicada_segura
    ? formatearValorVisible(calculadora, calculadora.tasa_publicada_segura)
    : "-";
  estadoNode.textContent = calculadora.editando_tasa_impuesto
    ? "editando_tasa"
    : calculadora.editando_tasa_conversion
      ? "editando_rate"
      : calculadora.editando_tasa_out
        ? "editando_out"
        : calculadora.editando_spread_seguro
          ? "editando_spd"
          : calculadora.estado;
  modeButtons.forEach((button) => {
    button.dataset.active =
      button.dataset.decimalMode === calculadora.modo_decimal ? "true" : "false";
  });
  metaModeNode.textContent = `DEC ${calculadora.modo_decimal}`;
  metaTaxNode.textContent = `IVA ${formatearValorVisible(calculadora, calculadora.tasa_impuesto)}%`;
  metaRateNode.textContent = `RATE ${formatearValorVisible(
    calculadora,
    calculadora.tasa_conversion,
  )}`;
  metaPubNode.textContent = calculadora.tasa_publicada_segura
    ? `PUB ${formatearValorVisible(calculadora, calculadora.tasa_publicada_segura)}`
    : "PUB -";
  taxRateButton.textContent = `IVA ${formatearValorVisible(calculadora, calculadora.tasa_impuesto)}%`;
  taxRateButton.dataset.active = calculadora.editando_tasa_impuesto ? "true" : "false";
  conversionRateButton.textContent = `RATE ${formatearValorVisible(
    calculadora,
    calculadora.tasa_conversion,
  )}`;
  conversionRateButton.dataset.active = calculadora.editando_tasa_conversion ? "true" : "false";
  outRateButton.textContent = `OUT ${formatearValorVisible(calculadora, calculadora.tasa_out)}`;
  outRateButton.dataset.active = calculadora.editando_tasa_out ? "true" : "false";
  spreadRateButton.textContent = `SPD ${formatearValorVisible(
    calculadora,
    calculadora.spread_seguro,
  )}`;
  spreadRateButton.dataset.active = calculadora.editando_spread_seguro ? "true" : "false";

  cintaNode.textContent = calculadora.cinta_entries.join("\n") || "Sin cinta aun.";
  logNode.textContent = calculadora.log_entries.join("\n") || "Sin log aun.";

  if (calculadora.estado === ESTADO_ENCENDIDA_ESPERANDO_TYPING) {
    displayNode.dataset.mode = "listo";
  } else {
    displayNode.dataset.mode = "activo";
  }
}

function activarPanel(nombre) {
  panelButtons.forEach((button) => {
    button.dataset.active = button.dataset.panel === nombre ? "true" : "false";
  });
  panelNodes.forEach((panel) => {
    panel.hidden = panel.dataset.panelBody !== nombre;
  });
}

function activarDeck(nombre) {
  deckButtons.forEach((button) => {
    button.dataset.active = button.dataset.deck === nombre ? "true" : "false";
  });
  deckNodes.forEach((panel) => {
    panel.hidden = panel.dataset.deckBody !== nombre;
  });
}

function mapearTecla(tecla) {
  if (/^[0-9]$/.test(tecla)) {
    return tecla;
  }

  const permitidas = {
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    Enter: "=",
    "=": "=",
    ".": ".",
    e: "e",
    E: "e",
    a: "a",
    A: "a",
    Backspace: "e",
    Escape: "a",
    f: "f",
    F: "f",
    d: "d",
    D: "d",
    t: "t",
    T: "t",
    c: "c",
    C: "c",
    i: "i",
    I: "i",
    u: "u",
    U: "u",
    r: "r",
    R: "r",
    "%": "p",
    p: "p",
    P: "p",
    m: "m",
    M: "m",
    n: "n",
    N: "n",
    v: "v",
    V: "v",
    x: "x",
    X: "x",
    k: "k",
    K: "k",
    l: "l",
    L: "l",
    h: "h",
    H: "h",
    w: "w",
    W: "w",
    y: "y",
    Y: "y",
    o: "o",
    O: "o",
    b: "b",
    B: "b",
    j: "j",
    J: "j",
    z: "z",
    Z: "z",
    s: "s",
    S: "s",
    g: "g",
    G: "g",
  };

  return permitidas[tecla] || null;
}

function flashError(message) {
  displayNode.textContent = "ERROR";
  displayNode.dataset.mode = "error";
  estadoNode.textContent = message;
}

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function blindarGestosIOS() {
  let ultimoTouchEnd = 0;

  keypad.addEventListener(
    "touchend",
    (event) => {
      const ahora = Date.now();
      if (ahora - ultimoTouchEnd < 320) {
        event.preventDefault();
      }
      ultimoTouchEnd = ahora;
    },
    { passive: false },
  );

  keypad.addEventListener(
    "gesturestart",
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );

  keypad.addEventListener(
    "gesturechange",
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );

  keypad.addEventListener(
    "dblclick",
    (event) => {
      event.preventDefault();
    },
    { passive: false },
  );
}

function sincronizarViewport() {
  const ancho = window.visualViewport?.width || window.innerWidth;
  const alto = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-vh", `${alto}px`);
  document.documentElement.dataset.orientation = ancho > alto ? "landscape" : "portrait";
}
