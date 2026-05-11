import assert from "node:assert/strict";
import { encender, nuevaCalculadora, presionarTecla } from "./engine.mjs";

const casos = [
  ["2+3=", "5"],
  ["50+50+2*50=", "200"],
  ["100-2*50=", "0"],
  ["5*-2=", "-10"],
  ["5--2=", "7"],
  ["100+50/2*4=", "200"],
  ["-5-10=", "-15"],
  ["2+3s4+1sg", "0"],
];

for (const [secuencia, esperado] of casos) {
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of secuencia) {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, esperado, secuencia);
}

console.log("engine ok");
