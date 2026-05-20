import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  apagar,
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
  for (const tecla of "10n2+3s4+1a") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "0", "a display");
  assert.equal(calculadora.estado, "encendida_esperando_typing", "a estado");
  assert.equal(calculadora.gran_total, "0", "a gran_total");
  assert.equal(calculadora.ultimo_subtotal, "", "a ultimo_subtotal");
  assert.equal(calculadora.ultimo_gran_total, "", "a ultimo_gran_total");
  assert.equal(calculadora.memoria, "10.00", "a conserva memoria");
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

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "10n") {
    presionarTecla(calculadora, tecla);
  }
  apagar(calculadora);
  encender(calculadora);
  assert.equal(calculadora.memoria, "10.00", "memoria persiste tras apagar");
  assert.equal(calculadora.display, "0", "display reiniciado tras encender");
  assert.equal(calculadora.estado, "encendida_esperando_typing", "estado tras encender");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "100k20hl") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.valor_cost, "100.00", "cost guardado");
  assert.equal(calculadora.valor_mar, "20.00", "mar guardado");
  assert.equal(calculadora.valor_sell, "125.00", "sell calculado");
  assert.equal(
    calculadora.cinta_entries.at(-1),
    "SELL = 125.00 (COST 100.00, MAR 20.00%)",
    "cinta sell calculado",
  );
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "100k125lh") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.valor_mar, "20.00", "mar calculado");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "125l20hk") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.valor_cost, "100.00", "cost calculado");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "w17.5=100y") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.tasa_conversion, "17.5", "rate guardado");
  assert.equal(calculadora.display, "1750.00", "conversion directa");
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "w2=5+100y=") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "205.00", "conversion en operando pendiente");
  assert.equal(
    calculadora.cinta_entries.at(-2),
    "CONV 100.00 @ 2.00 = 200.00",
    "cinta conversion",
  );
  assert.equal(
    calculadora.cinta_entries.at(-1),
    "5.00 + CONV 100.00 @ 2.00 = 205.00",
    "cinta operacion con conversion",
  );
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "o19.5=b0.4=j") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.tasa_out, "19.5", "out guardado");
  assert.equal(calculadora.spread_seguro, "0.4", "spread guardado");
  assert.equal(calculadora.tasa_publicada_segura, "19.10", "pub calculado");
  assert.equal(
    calculadora.cinta_entries.at(-1),
    "PUB = 19.10 (OUT 19.50, SPD 0.40)",
    "cinta pub",
  );
}

{
  const calculadora = nuevaCalculadora();
  encender(calculadora);
  for (const tecla of "o19.5=b0.4=1000z") {
    presionarTecla(calculadora, tecla);
  }
  assert.equal(calculadora.display, "52.36", "usd a cobrar");
  assert.equal(
    calculadora.cinta_entries.at(-1),
    "BASE 1,000.00 / PUB 19.10 = 52.36",
    "cinta usd",
  );
}

console.log("engine ok");
