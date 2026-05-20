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
const keypad = document.querySelector("[data-keypad]");
const metricsToggle = document.querySelector(".metrics-toggle");
const metricsContainer = document.querySelector(".metrics");
const modeButtons = document.querySelectorAll("[data-decimal-mode]");
const taxRateButton = document.querySelector("[data-tax-rate]");
const conversionRateButton = document.querySelector("[data-conversion-rate]");
const outRateButton = document.querySelector("[data-out-rate]");
const spreadRateButton = document.querySelector("[data-spread-rate]");
const metaModeNode = document.querySelector("[data-meta-mode]");
const metaTaxNode = document.querySelector("[data-meta-tax]");
const metaRateNode = document.querySelector("[data-meta-rate]");
const metaPubNode = document.querySelector("[data-meta-pub]");
const paperCountNode = document.querySelector("[data-paper-count]");

let calculadora = cargarCalculadora();

sincronizarViewport();
render();
registrarServiceWorker();
blindarGestosIOS();
configurarDobleTap();

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

if (metricsToggle && metricsContainer) {
  metricsToggle.addEventListener("click", () => {
    const expanded = metricsContainer.classList.toggle("metrics-visible");
    metricsToggle.setAttribute("aria-expanded", String(expanded));
  });
}

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
    guardarCalculadora(calculadora);
    render();
  } catch (error) {
    flashError(error.message);
  }
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
  if (taxRateButton) {
    taxRateButton.textContent = `IVA ${formatearValorVisible(calculadora, calculadora.tasa_impuesto)}%`;
    taxRateButton.dataset.active = calculadora.editando_tasa_impuesto ? "true" : "false";
  }
  if (conversionRateButton) {
    conversionRateButton.textContent = `RATE ${formatearValorVisible(
      calculadora,
      calculadora.tasa_conversion,
    )}`;
    conversionRateButton.dataset.active = calculadora.editando_tasa_conversion ? "true" : "false";
  }
  if (outRateButton) {
    outRateButton.textContent = `OUT ${formatearValorVisible(calculadora, calculadora.tasa_out)}`;
    outRateButton.dataset.active = calculadora.editando_tasa_out ? "true" : "false";
  }
  if (spreadRateButton) {
    spreadRateButton.textContent = `SPD ${formatearValorVisible(
      calculadora,
      calculadora.spread_seguro,
    )}`;
    spreadRateButton.dataset.active = calculadora.editando_spread_seguro ? "true" : "false";
  }

  cintaNode.innerHTML = renderizarCinta(calculadora.cinta_entries);
  logNode.textContent = calculadora.log_entries.join("\n") || "Sin log aun.";

  if (paperCountNode) {
    const count = calculadora.cinta_entries.filter((e) => e.trim()).length;
    paperCountNode.textContent = String(count);
  }

  if (calculadora.estado === ESTADO_ENCENDIDA_ESPERANDO_TYPING) {
    displayNode.dataset.mode = "listo";
  } else {
    displayNode.dataset.mode = "activo";
  }
}

function renderizarCinta(entries) {
  if (!entries.length) {
    return "Sin cinta aun.";
  }

  return entries.map(renderizarLineaCinta).join("");
}

function renderizarLineaCinta(linea) {
  const clases = ["tape-entry"];
  const tipo = detectarTipoCinta(linea);

  clases.push(`tape-entry-${tipo}`);

  if (tipo === "control-meta") {
    return `<span class="${clases.join(" ")}">${escaparHtml(linea)}</span>`;
  }

  if (tipo === "subtotal") {
    clases.push("tape-entry-subtotal");
  } else if (tipo === "grand-total") {
    clases.push("tape-entry-grand-total");
  }

  const matches = [...linea.matchAll(/-?\d[\d,]*(?:\.\d+)?%?/g)];
  if (!matches.length) {
    return `<span class="${clases.join(" ")}">${escaparHtml(linea)}</span>`;
  }

  let cursor = 0;
  let html = "";
  const ultimoIndice = matches.length - 1;

  matches.forEach((match, index) => {
    const valor = match[0];
    const inicio = match.index ?? 0;
    html += escaparHtml(linea.slice(cursor, inicio));
    const valorClases = ["tape-value"];
    if (index === ultimoIndice && linea.includes("=")) {
      valorClases.push("tape-value-final");
    }
    html += `<span class="${valorClases.join(" ")}">${escaparHtml(valor)}</span>`;
    cursor = inicio + valor.length;
  });

  html += escaparHtml(linea.slice(cursor));
  return `<span class="${clases.join(" ")}">${html}</span>`;
}

function detectarTipoCinta(linea) {
  if (/^--- .* ---$/.test(linea)) {
    return "control-meta";
  }
  if (linea.startsWith("SUBTOTAL =")) {
    return "subtotal";
  }
  if (linea.startsWith("GRAN TOTAL =")) {
    return "grand-total";
  }
  if (linea === "A" || linea === "E") {
    return "control";
  }
  if (linea.startsWith("IVA+") || linea.startsWith("IVA-") || linea.startsWith("TASA IMPUESTO =")) {
    return "fiscal";
  }
  if (linea.startsWith("CONV ") || linea.startsWith("BASE ") || linea.startsWith("PUB =")) {
    return "conversion";
  }
  if (
    linea.startsWith("RATE =") ||
    linea.startsWith("OUT =") ||
    linea.startsWith("SPD =") ||
    linea.startsWith("MODO DECIMAL =")
  ) {
    return "parametro";
  }
  if (
    linea.startsWith("M+ ") ||
    linea.startsWith("M- ") ||
    linea.startsWith("MR =") ||
    linea === "MC"
  ) {
    return "memoria";
  }
  if (
    linea.startsWith("COST =") ||
    linea.startsWith("SELL =") ||
    linea.startsWith("MAR =")
  ) {
    return "comercial";
  }
  if (linea.startsWith("PORC ")) {
    return "porcentaje";
  }
  if (/^-?\d[\d,]*(?:\.\d+)? [+\-*/] /.test(linea)) {
    return "resolutiva";
  }
  return "control";
}

function escaparHtml(texto) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function activarPanel(nombre) {
  panelButtons.forEach((button) => {
    button.dataset.active = button.dataset.panel === nombre ? "true" : "false";
  });
  panelNodes.forEach((panel) => {
    panel.hidden = panel.dataset.panelBody !== nombre;
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

function esEntornoLocal() {
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  );
}

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    if (esEntornoLocal()) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            caches.delete(key).catch(() => {});
          });
        });
      }
      return;
    }
    navigator.serviceWorker.register("./sw.js?v=20260520b").catch(() => {});
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

function configurarDobleTap() {
  if (!displayNode) return;

  let ultimoTap = 0;
  const DOBLE_TAP_MS = 300;

  displayNode.addEventListener("touchstart", (event) => {
    const ahora = Date.now();
    if (ahora - ultimoTap < DOBLE_TAP_MS) {
      event.preventDefault();
      copiarAlPortapapeles();
    }
    ultimoTap = ahora;
  }, { passive: false });
}

function copiarAlPortapapeles() {
  const texto = displayNode.textContent.trim();
  if (!texto || texto === "ERROR") return;

  navigator.clipboard.writeText(texto).then(() => {
    const caption = document.querySelector(".display-caption");
    if (caption) {
      const original = caption.textContent;
      caption.textContent = "Copiado";
      caption.style.color = "var(--screen-glow)";
      setTimeout(() => {
        caption.textContent = original;
        caption.style.color = "";
      }, 800);
    }
  }).catch(() => {});
}

function sincronizarViewport() {
  const ancho = window.visualViewport?.width || window.innerWidth;
  const alto = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-vh", `${alto}px`);
  document.documentElement.dataset.orientation = ancho > alto ? "landscape" : "portrait";
}
