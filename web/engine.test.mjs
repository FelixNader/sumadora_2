import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encender, nuevaCalculadora, presionarTecla } from "./engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rutaCasos = path.resolve(__dirname, "../spec/casos_compartidos.json");
const casos = JSON.parse(fs.readFileSync(rutaCasos, "utf-8"));

for (const caso of casos) {
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of caso.secuencia) {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, caso.display_final, caso.secuencia);
  assert.equal(calculadora.estado, caso.estado_final, caso.secuencia);
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "12+3e") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "0", "e display");
  assert.equal(calculadora.operando_actual, "", "e operando_actual");
  assert.equal(calculadora.operador_pendiente, "+", "e operador_pendiente");
  assert.equal(calculadora.estado, "operador_pendiente", "e estado");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "2+3s4+1a") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "0", "a display");
  assert.equal(calculadora.estado, "encendida_esperando_typing", "a estado");
  assert.equal(calculadora.gran_total, "0", "a gran_total");
  assert.equal(calculadora.ultimo_subtotal, "", "a ultimo_subtotal");
  assert.equal(calculadora.ultimo_gran_total, "", "a ultimo_gran_total");
}

console.log("engine ok");
