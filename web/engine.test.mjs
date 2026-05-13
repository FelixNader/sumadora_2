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

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "200+10p=") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "220.00", "porcentaje suma");
  assert.equal(
    calculadora.cinta_entries.at(-2),
    "PORC 10.00% DE 200.00 = 20.00",
    "cinta porcentaje",
  );
  assert.equal(
    calculadora.cinta_entries.at(-1),
    "200.00 + 10.00% DE 200.00 = 220.00",
    "cinta operacion con porcentaje",
  );
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "10nem") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.memoria, "10.00", "memoria suma");
  assert.equal(calculadora.display, "10.00", "memoria read");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "5ne2+m=") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "7.00", "mr como operando pendiente");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "10nxem") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.memoria, "0", "mc limpia memoria");
  assert.equal(calculadora.display, "0.00", "mr despues de mc");
}

console.log("engine ok");
