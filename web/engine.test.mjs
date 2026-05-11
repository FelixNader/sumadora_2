import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  encender,
  formatearValorVisible,
  nuevaCalculadora,
  obtenerDisplayVisible,
  presionarTecla,
} from "./engine.mjs";

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

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "t1/3=") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.modo_decimal, "3", "modo decimal 3");
  assert.equal(calculadora.display, "0.333", "display 3 decimales");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "1250+300=") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(obtenerDisplayVisible(calculadora), "1,550.00", "display con miles");
  assert.equal(
    calculadora.cinta_entries.at(-1),
    "1,250.00 + 300.00 = 1,550.00",
    "cinta con miles",
  );
  assert.equal(
    formatearValorVisible(calculadora, calculadora.gran_total),
    "0.00",
    "gran total visible",
  );
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "100i") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "116.00", "iva suma display");
  assert.equal(calculadora.ultimo_impuesto, "16.00", "iva suma impuesto");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "re8=100i") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.tasa_impuesto, "8", "tasa editada");
  assert.equal(calculadora.display, "108.00", "display tasa editada");
  assert.equal(
    calculadora.cinta_entries.at(-1),
    "IVA+ 100.00 @ 8.00% = 108.00 (IVA 8.00)",
    "cinta iva con tasa editada",
  );
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "100u+100u=") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "172.42", "iva resta en suma encadenada");
}

console.log("engine ok");
