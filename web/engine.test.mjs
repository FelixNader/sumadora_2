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

console.log("engine ok");
