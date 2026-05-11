import {
  nuevaCalculadora,
  restaurarCalculadora,
  encender,
  presionarTecla,
  ESTADO_ENCENDIDA_ESPERANDO_TYPING,
} from "./engine.mjs";

const STORAGE_KEY = "sumadora-contable-state-v1";

const displayNode = document.querySelector("[data-display]");
const subtotalNode = document.querySelector("[data-subtotal]");
const granTotalNode = document.querySelector("[data-gran-total]");
const estadoNode = document.querySelector("[data-estado]");
const cintaNode = document.querySelector("[data-cinta]");
const logNode = document.querySelector("[data-log]");
const panelButtons = document.querySelectorAll("[data-panel]");
const panelNodes = document.querySelectorAll("[data-panel-body]");
const keypad = document.querySelector("[data-keypad]");

let calculadora = cargarCalculadora();

render();
registrarServiceWorker();

keypad.addEventListener("click", (event) => {
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
  displayNode.textContent = calculadora.display || "0";
  subtotalNode.textContent = calculadora.ultimo_subtotal || "-";
  granTotalNode.textContent = calculadora.gran_total;
  estadoNode.textContent = calculadora.estado;

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
    c: "C",
    C: "C",
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
