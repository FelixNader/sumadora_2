export const ESTADO_APAGADA = "apagada";
export const ESTADO_ENCENDIDA_ESPERANDO_TYPING = "encendida_esperando_typing";
export const ESTADO_TYPING_OPERANDO = "typing_operando";
export const ESTADO_OPERADOR_PENDIENTE = "operador_pendiente";
export const ESTADO_RESULTADO_EN_DISPLAY = "resultado_en_display";
export const MODO_DECIMAL_FLOTANTE = "F";
export const MODO_DECIMAL_DOS = "2";
export const MODO_DECIMAL_TRES = "3";
export const MODO_DECIMAL_CUATRO = "4";

const PRECISION_DIVISION = 28n;
const TECLAS_MODO_DECIMAL = {
  f: MODO_DECIMAL_FLOTANTE,
  F: MODO_DECIMAL_FLOTANTE,
  d: MODO_DECIMAL_DOS,
  D: MODO_DECIMAL_DOS,
  t: MODO_DECIMAL_TRES,
  T: MODO_DECIMAL_TRES,
  c: MODO_DECIMAL_CUATRO,
  C: MODO_DECIMAL_CUATRO,
};

export function nuevaCalculadora() {
  return {
    estado: ESTADO_APAGADA,
    display: "",
    operando_actual: "",
    acumulado: "",
    acumulado_multiplicativo: "",
    operador_pendiente: "",
    operador_subtotal: "+",
    gran_total: "0",
    ultimo_subtotal: "",
    ultimo_gran_total: "",
    modo_decimal: MODO_DECIMAL_DOS,
    tasa_impuesto: "16",
    editando_tasa_impuesto: false,
    buffer_tasa_impuesto: "",
    ultimo_impuesto: "",
    log_entries: [],
    cinta_entries: [],
  };
}

export function restaurarCalculadora(snapshot) {
  return {
    ...nuevaCalculadora(),
    ...snapshot,
    log_entries: Array.isArray(snapshot?.log_entries) ? snapshot.log_entries : [],
    cinta_entries: Array.isArray(snapshot?.cinta_entries)
      ? snapshot.cinta_entries
      : [],
  };
}

export function encender(calculadora) {
  reiniciarOperacion(calculadora);
  calculadora.gran_total = "0";
  calculadora.ultimo_subtotal = "";
  calculadora.ultimo_gran_total = "";
  registrarLog(calculadora, "encender");
  registrarCinta(calculadora, encabezadoCinta("encendida"));
}

export function presionarTecla(calculadora, tecla) {
  if (tecla.length !== 1) {
    throw new Error("La tecla debe ser un unico caracter.");
  }

  if (calculadora.estado === ESTADO_APAGADA) {
    registrarLog(
      calculadora,
      "error",
      `tecla=${tecla} motivo=calculadora_apagada`,
    );
    throw new Error("La calculadora esta apagada.");
  }

  const estadoAntes = describirEstado(calculadora);

  try {
    if (calculadora.editando_tasa_impuesto) {
      manejarCapturaTasaImpuesto(calculadora, tecla);
    } else if (tecla === "e" || tecla === "E") {
      borrarEntrada(calculadora);
    } else if (tecla === "a" || tecla === "A") {
      borrarTodo(calculadora);
    } else if (Object.hasOwn(TECLAS_MODO_DECIMAL, tecla)) {
      cambiarModoDecimal(calculadora, TECLAS_MODO_DECIMAL[tecla]);
    } else if (tecla === "r" || tecla === "R") {
      iniciarCapturaTasaImpuesto(calculadora);
    } else if (tecla === "i" || tecla === "I") {
      sumarImpuesto(calculadora);
    } else if (tecla === "u" || tecla === "U") {
      restarImpuesto(calculadora);
    } else if (tecla === "s" || tecla === "S") {
      subtotalizar(calculadora);
    } else if (tecla === "g" || tecla === "G") {
      granTotalizar(calculadora);
    } else if (calculadora.estado === ESTADO_ENCENDIDA_ESPERANDO_TYPING) {
      manejarEncendidaEsperandoTyping(calculadora, tecla);
    } else if (calculadora.estado === ESTADO_TYPING_OPERANDO) {
      manejarTypingOperando(calculadora, tecla);
    } else if (calculadora.estado === ESTADO_OPERADOR_PENDIENTE) {
      manejarOperadorPendiente(calculadora, tecla);
    } else if (calculadora.estado === ESTADO_RESULTADO_EN_DISPLAY) {
      manejarResultadoEnDisplay(calculadora, tecla);
    } else {
      throw new Error("Estado no soportado.");
    }
  } catch (error) {
    registrarLog(
      calculadora,
      "error",
      `tecla=${tecla} antes=${estadoAntes} motivo=${error.message}`,
    );
    throw error;
  }

  registrarLog(
    calculadora,
    "tecla",
    `tecla=${tecla} antes=${estadoAntes} despues=${describirEstado(calculadora)}`,
  );
}

function esOperadorAditivo(tecla) {
  return tecla === "+" || tecla === "-";
}

function esOperadorMultiplicativo(tecla) {
  return tecla === "*" || tecla === "/";
}

function esOperandoIncompleto(texto) {
  return texto === "-";
}

function scaleForMode(modoDecimal) {
  if (modoDecimal === MODO_DECIMAL_DOS) {
    return 2;
  }
  if (modoDecimal === MODO_DECIMAL_TRES) {
    return 3;
  }
  if (modoDecimal === MODO_DECIMAL_CUATRO) {
    return 4;
  }
  return null;
}

function applyModeDecimal(calculadora, value) {
  const decimal = typeof value === "string" ? parseDecimal(value) : value;
  const fixedScale = scaleForMode(calculadora.modo_decimal);
  if (fixedScale === null) {
    return decimalToString(decimal);
  }
  return decimalToFixedString(roundDecimal(decimal, fixedScale), fixedScale);
}

function formatThousandsInteger(texto) {
  if (texto === "") {
    return "0";
  }

  let sign = "";
  let digits = texto;
  if (digits.startsWith("-")) {
    sign = "-";
    digits = digits.slice(1);
  }

  const grupos = [];
  while (digits.length > 3) {
    grupos.push(digits.slice(-3));
    digits = digits.slice(0, -3);
  }
  grupos.push(digits || "0");
  return `${sign}${grupos.reverse().join(",")}`;
}

function formatTypedOperand(texto) {
  if (texto === "" || texto === "0") {
    return "0";
  }
  if (texto === "-") {
    return "-";
  }

  let sign = "";
  let normalizado = texto;
  if (normalizado.startsWith("-")) {
    sign = "-";
    normalizado = normalizado.slice(1);
  }

  if (normalizado.includes(".")) {
    const [entero, fraccion] = normalizado.split(".");
    return `${formatThousandsInteger(`${sign}${entero || "0"}`)}.${fraccion}`;
  }

  return formatThousandsInteger(`${sign}${normalizado}`);
}

export function formatearValorVisible(calculadora, valor, forceFixed = true) {
  let texto = valor || "0";
  if (forceFixed) {
    texto = applyModeDecimal(calculadora, texto);
  } else {
    texto = decimalToString(parseDecimal(texto));
  }

  let sign = "";
  if (texto.startsWith("-")) {
    sign = "-";
    texto = texto.slice(1);
  }

  if (texto.includes(".")) {
    const [entero, fraccion] = texto.split(".");
    return `${formatThousandsInteger(`${sign}${entero}`)}.${fraccion}`;
  }

  return formatThousandsInteger(`${sign}${texto}`);
}

export function obtenerDisplayVisible(calculadora) {
  if (calculadora.editando_tasa_impuesto) {
    return `TASA ${formatTypedOperand(calculadora.buffer_tasa_impuesto || "0")}%`;
  }
  if (
    calculadora.estado === ESTADO_TYPING_OPERANDO &&
    calculadora.operando_actual !== ""
  ) {
    return formatTypedOperand(calculadora.operando_actual);
  }
  return formatearValorVisible(calculadora, calculadora.display || "0");
}

function obtenerTasaImpuestoDecimal(calculadora) {
  return divideDecimals(parseDecimal(calculadora.tasa_impuesto), parseDecimal("100"), 12n);
}

function obtenerValorActualParaImpuesto(calculadora) {
  if (calculadora.estado === ESTADO_TYPING_OPERANDO) {
    if (esOperandoIncompleto(calculadora.operando_actual)) {
      throw new Error("Falta completar el operando negativo.");
    }
    if (calculadora.operando_actual !== "") {
      return calculadora.operando_actual;
    }
  }
  return obtenerSubtotalActual(calculadora, false);
}

function fijarResultado(calculadora, resultado) {
  calculadora.display = resultado;
  calculadora.operando_actual = "";
  calculadora.acumulado = resultado;
  calculadora.acumulado_multiplicativo = "";
  calculadora.operador_pendiente = "";
  calculadora.operador_subtotal = "+";
  calculadora.estado = ESTADO_RESULTADO_EN_DISPLAY;
}

function aplicarResultadoImpuesto(calculadora, resultado) {
  if (
    calculadora.estado === ESTADO_TYPING_OPERANDO &&
    calculadora.operador_pendiente !== ""
  ) {
    calculadora.operando_actual = resultado;
    calculadora.display = resultado;
    return;
  }

  fijarResultado(calculadora, resultado);
}

function manejarEncendidaEsperandoTyping(calculadora, tecla) {
  if (tecla === "-") {
    calculadora.operando_actual = "-";
    calculadora.display = "-";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  if (esDigito(tecla)) {
    calculadora.operando_actual = tecla;
    calculadora.display = tecla;
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  if (tecla === ".") {
    calculadora.operando_actual = "0.";
    calculadora.display = "0.";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  throw new Error(
    "En encendida_esperando_typing solo se aceptan digitos, '.' o '-'.",
  );
}

function manejarTypingOperando(calculadora, tecla) {
  if (esDigito(tecla)) {
    if (calculadora.operando_actual === "-") {
      calculadora.operando_actual = `-${tecla}`;
    } else if (calculadora.operando_actual === "0") {
      calculadora.operando_actual = tecla;
    } else if (calculadora.operando_actual === "-0") {
      calculadora.operando_actual = `-${tecla}`;
    } else {
      calculadora.operando_actual += tecla;
    }
    calculadora.display = calculadora.operando_actual;
    return;
  }

  if (tecla === ".") {
    if (calculadora.operando_actual.includes(".")) {
      throw new Error("El operando actual ya tiene punto decimal.");
    }
    if (calculadora.operando_actual === "-") {
      calculadora.operando_actual = "-0.";
    } else if (calculadora.operando_actual === "") {
      calculadora.operando_actual = "0.";
    } else {
      calculadora.operando_actual += ".";
    }
    calculadora.display = calculadora.operando_actual;
    return;
  }

  if (esOperadorAditivo(tecla)) {
    prepararOEncadenarAdicion(calculadora, tecla);
    return;
  }

  if (esOperadorMultiplicativo(tecla)) {
    prepararOEncadenarMultiplicacion(calculadora, tecla);
    return;
  }

  if (tecla === "=") {
    cerrarOperacion(calculadora);
    return;
  }

  throw new Error("Tecla no soportada en typing_operando.");
}

function manejarOperadorPendiente(calculadora, tecla) {
  if (tecla === "-") {
    calculadora.operando_actual = "-";
    calculadora.display = "-";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  if (esDigito(tecla)) {
    calculadora.operando_actual = tecla;
    calculadora.display = tecla;
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  if (tecla === ".") {
    calculadora.operando_actual = "0.";
    calculadora.display = "0.";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  if (esOperadorAditivo(tecla) && esOperadorAditivo(calculadora.operador_pendiente)) {
    calculadora.operador_pendiente = tecla;
    calculadora.operador_subtotal = tecla;
    return;
  }

  if (
    esOperadorMultiplicativo(tecla) &&
    esOperadorMultiplicativo(calculadora.operador_pendiente)
  ) {
    calculadora.operador_pendiente = tecla;
    return;
  }

  if (tecla === "=") {
    throw new Error("Falta capturar el segundo operando.");
  }

  throw new Error("Tecla no soportada mientras hay un operador pendiente.");
}

function manejarResultadoEnDisplay(calculadora, tecla) {
  if (esDigito(tecla)) {
    reiniciarOperacion(calculadora);
    calculadora.operando_actual = tecla;
    calculadora.display = tecla;
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  if (tecla === ".") {
    reiniciarOperacion(calculadora);
    calculadora.operando_actual = "0.";
    calculadora.display = "0.";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    return;
  }

  if (esOperadorAditivo(tecla)) {
    calculadora.acumulado = calculadora.display;
    calculadora.operador_subtotal = tecla;
    calculadora.operador_pendiente = tecla;
    calculadora.operando_actual = "";
    calculadora.acumulado_multiplicativo = "";
    calculadora.estado = ESTADO_OPERADOR_PENDIENTE;
    return;
  }

  if (esOperadorMultiplicativo(tecla)) {
    calculadora.acumulado = "";
    calculadora.acumulado_multiplicativo = calculadora.display;
    calculadora.operador_subtotal = "+";
    calculadora.operador_pendiente = tecla;
    calculadora.operando_actual = "";
    calculadora.estado = ESTADO_OPERADOR_PENDIENTE;
    return;
  }

  if (tecla === "=") {
    return;
  }

  throw new Error("Tecla no soportada en resultado_en_display.");
}

function prepararOEncadenarAdicion(calculadora, operador) {
  const termino = resolverTerminoActual(calculadora, true);

  let nuevoSubtotal = termino;
  if (calculadora.acumulado !== "") {
    nuevoSubtotal = resolverYRegistrar(
      calculadora,
      calculadora.acumulado,
      calculadora.operador_subtotal,
      termino,
    );
  } else {
    nuevoSubtotal = applyModeDecimal(calculadora, termino);
  }

  calculadora.acumulado = nuevoSubtotal;
  calculadora.acumulado_multiplicativo = "";
  calculadora.operador_subtotal = operador;
  calculadora.operador_pendiente = operador;
  calculadora.operando_actual = "";
  calculadora.display = nuevoSubtotal;
  calculadora.estado = ESTADO_OPERADOR_PENDIENTE;
}

function prepararOEncadenarMultiplicacion(calculadora, operador) {
  if (
    calculadora.operador_pendiente === "*" ||
    calculadora.operador_pendiente === "/"
  ) {
    const termino = resolverTerminoActual(calculadora, true);
    calculadora.acumulado_multiplicativo = termino;
  } else {
    calculadora.acumulado_multiplicativo = calculadora.operando_actual;
    calculadora.operando_actual = "";
    calculadora.display = calculadora.acumulado_multiplicativo;
  }

  calculadora.operador_pendiente = operador;
  calculadora.estado = ESTADO_OPERADOR_PENDIENTE;
}

function cerrarOperacion(calculadora) {
  const subtotal = obtenerSubtotalActual(calculadora, true);
  calculadora.display = subtotal;
  calculadora.operando_actual = "";
  calculadora.acumulado = subtotal;
  calculadora.acumulado_multiplicativo = "";
  calculadora.operador_pendiente = "";
  calculadora.operador_subtotal = "+";
  calculadora.estado = ESTADO_RESULTADO_EN_DISPLAY;
}

function subtotalizar(calculadora) {
  const subtotal = obtenerSubtotalActual(calculadora, true);
  const granTotal = sumarAGranTotal(calculadora, calculadora.gran_total, subtotal);
  calculadora.ultimo_subtotal = subtotal;
  calculadora.gran_total = granTotal;
  registrarCinta(calculadora, `SUBTOTAL = ${formatearValorVisible(calculadora, subtotal)}`);
  registrarLog(calculadora, "subtotal", `subtotal=${subtotal} gran_total=${granTotal}`);
  reiniciarOperacion(calculadora);
}

function granTotalizar(calculadora) {
  const granTotal = calculadora.gran_total;
  calculadora.ultimo_gran_total = granTotal;
  registrarCinta(
    calculadora,
    `GRAN TOTAL = ${formatearValorVisible(calculadora, granTotal)}`,
  );
  registrarLog(calculadora, "gran_total", `gran_total=${granTotal}`);
  reiniciarOperacion(calculadora);
  calculadora.gran_total = "0";
  calculadora.ultimo_subtotal = "";
  registrarCinta(calculadora, encabezadoCinta("nueva_calculadora"));
}

function sumarImpuesto(calculadora) {
  const base = obtenerValorActualParaImpuesto(calculadora);
  const factor = addDecimals(parseDecimal("1"), obtenerTasaImpuestoDecimal(calculadora));
  const total = applyModeDecimal(calculadora, multiplyDecimals(parseDecimal(base), factor));
  const impuesto = applyModeDecimal(
    calculadora,
    subtractDecimals(parseDecimal(total), parseDecimal(base)),
  );
  calculadora.ultimo_impuesto = impuesto;
  aplicarResultadoImpuesto(calculadora, total);
  registrarCinta(
    calculadora,
    `IVA+ ${formatearValorVisible(calculadora, base)} @ ${formatearValorVisible(
      calculadora,
      calculadora.tasa_impuesto,
    )}% = ${formatearValorVisible(calculadora, total)} (IVA ${formatearValorVisible(
      calculadora,
      impuesto,
    )})`,
  );
  registrarLog(
    calculadora,
    "impuesto_suma",
    `base=${base} tasa=${calculadora.tasa_impuesto} impuesto=${impuesto} total=${total}`,
  );
}

function restarImpuesto(calculadora) {
  const total = obtenerValorActualParaImpuesto(calculadora);
  const factor = addDecimals(parseDecimal("1"), obtenerTasaImpuestoDecimal(calculadora));
  const base = applyModeDecimal(calculadora, divideDecimals(parseDecimal(total), factor, PRECISION_DIVISION));
  const impuesto = applyModeDecimal(
    calculadora,
    subtractDecimals(parseDecimal(total), parseDecimal(base)),
  );
  calculadora.ultimo_impuesto = impuesto;
  aplicarResultadoImpuesto(calculadora, base);
  registrarCinta(
    calculadora,
    `IVA- ${formatearValorVisible(calculadora, total)} @ ${formatearValorVisible(
      calculadora,
      calculadora.tasa_impuesto,
    )}% = ${formatearValorVisible(calculadora, base)} (IVA ${formatearValorVisible(
      calculadora,
      impuesto,
    )})`,
  );
  registrarLog(
    calculadora,
    "impuesto_resta",
    `total=${total} tasa=${calculadora.tasa_impuesto} impuesto=${impuesto} base=${base}`,
  );
}

function obtenerSubtotalActual(calculadora, registrar = false) {
  if (calculadora.estado === ESTADO_ENCENDIDA_ESPERANDO_TYPING) {
    return calculadora.acumulado || "0";
  }

  if (calculadora.estado === ESTADO_OPERADOR_PENDIENTE) {
    if (esOperadorAditivo(calculadora.operador_pendiente)) {
      if (calculadora.acumulado !== "") {
        return calculadora.acumulado;
      }
      return calculadora.display || "0";
    }

    if (esOperadorMultiplicativo(calculadora.operador_pendiente)) {
      const termino = calculadora.acumulado_multiplicativo || "0";
      if (calculadora.acumulado === "") {
        return termino;
      }
      if (registrar) {
        return resolverYRegistrar(
          calculadora,
          calculadora.acumulado,
          calculadora.operador_subtotal,
          termino,
        );
      }
      return resolverOperacion(
        calculadora,
        calculadora.acumulado,
        calculadora.operador_subtotal,
        termino,
      );
    }
  }

  if (calculadora.estado === ESTADO_TYPING_OPERANDO) {
    const termino = resolverTerminoActual(calculadora, registrar);
    if (calculadora.acumulado === "") {
      return termino;
    }
    if (registrar) {
      return resolverYRegistrar(
        calculadora,
        calculadora.acumulado,
        calculadora.operador_subtotal,
        termino,
      );
    }
    return resolverOperacion(
      calculadora,
      calculadora.acumulado,
      calculadora.operador_subtotal,
      termino,
    );
  }

  if (calculadora.estado === ESTADO_RESULTADO_EN_DISPLAY) {
    return calculadora.display || "0";
  }

  throw new Error("No se pudo obtener subtotal.");
}

function resolverTerminoActual(calculadora, registrar = false) {
  if (
    calculadora.operador_pendiente === "*" ||
    calculadora.operador_pendiente === "/"
  ) {
    if (calculadora.operando_actual === "") {
      if (calculadora.acumulado_multiplicativo !== "") {
        return calculadora.acumulado_multiplicativo;
      }
      throw new Error("Falta capturar el segundo operando.");
    }

    if (esOperandoIncompleto(calculadora.operando_actual)) {
      throw new Error("Falta completar el operando negativo.");
    }

    let izquierda = calculadora.acumulado_multiplicativo;
    if (izquierda === "") {
      izquierda = calculadora.operando_actual;
    }

    const resultado = registrar
      ? resolverYRegistrar(
          calculadora,
          izquierda,
          calculadora.operador_pendiente,
          calculadora.operando_actual,
        )
      : resolverOperacion(
          calculadora,
          izquierda,
          calculadora.operador_pendiente,
          calculadora.operando_actual,
        );

    calculadora.acumulado_multiplicativo = resultado;
    calculadora.operando_actual = "";
    calculadora.display = resultado;
    return resultado;
  }

  if (esOperandoIncompleto(calculadora.operando_actual)) {
    throw new Error("Falta completar el operando negativo.");
  }

  if (calculadora.operando_actual !== "") {
    return calculadora.operando_actual;
  }

  if (calculadora.acumulado_multiplicativo !== "") {
    return calculadora.acumulado_multiplicativo;
  }

  if (calculadora.display !== "") {
    return calculadora.display;
  }

  return "0";
}

function resolverYRegistrar(calculadora, izquierda, operador, derecha) {
  const resultado = resolverOperacion(calculadora, izquierda, operador, derecha);
  registrarCinta(
    calculadora,
    `${formatearValorVisible(calculadora, izquierda)} ${operador} ${formatearValorVisible(
      calculadora,
      derecha,
    )} = ${formatearValorVisible(calculadora, resultado)}`,
  );
  registrarLog(
    calculadora,
    "resolver",
    `expresion=${izquierda} ${operador} ${derecha} resultado=${resultado}`,
  );
  return resultado;
}

function resolverOperacion(calculadora, izquierda, operador, derecha) {
  const a = parseDecimal(izquierda);
  const b = parseDecimal(derecha);

  if (operador === "+") {
    return applyModeDecimal(calculadora, addDecimals(a, b));
  }

  if (operador === "-") {
    return applyModeDecimal(calculadora, subtractDecimals(a, b));
  }

  if (operador === "*") {
    return applyModeDecimal(calculadora, multiplyDecimals(a, b));
  }

  if (operador === "/") {
    return applyModeDecimal(calculadora, divideDecimals(a, b, PRECISION_DIVISION));
  }

  throw new Error("Operador no soportado.");
}

function sumarAGranTotal(calculadora, granTotal, subtotal) {
  return applyModeDecimal(
    calculadora,
    addDecimals(parseDecimal(granTotal), parseDecimal(subtotal)),
  );
}

function borrarEntrada(calculadora) {
  if (calculadora.estado === ESTADO_TYPING_OPERANDO) {
    calculadora.operando_actual = "";
    calculadora.display = "0";
    calculadora.estado =
      calculadora.operador_pendiente !== ""
        ? ESTADO_OPERADOR_PENDIENTE
        : ESTADO_ENCENDIDA_ESPERANDO_TYPING;
  } else if (calculadora.estado === ESTADO_OPERADOR_PENDIENTE) {
    calculadora.operando_actual = "";
    calculadora.display = "0";
  } else if (calculadora.estado === ESTADO_RESULTADO_EN_DISPLAY) {
    reiniciarOperacion(calculadora);
  } else {
    calculadora.display = "0";
    calculadora.estado = ESTADO_ENCENDIDA_ESPERANDO_TYPING;
  }

  registrarCinta(calculadora, "E");
  registrarLog(calculadora, "borrar_entrada");
}

function borrarTodo(calculadora) {
  reiniciarOperacion(calculadora);
  calculadora.gran_total = "0";
  calculadora.ultimo_subtotal = "";
  calculadora.ultimo_gran_total = "";
  calculadora.ultimo_impuesto = "";
  calculadora.editando_tasa_impuesto = false;
  calculadora.buffer_tasa_impuesto = "";
  registrarCinta(calculadora, "A");
  registrarCinta(calculadora, encabezadoCinta("nueva_calculadora"));
  registrarLog(calculadora, "borrar_todo");
}

function cambiarModoDecimal(calculadora, modoDecimal) {
  calculadora.modo_decimal = modoDecimal;
  registrarCinta(calculadora, `MODO DECIMAL = ${modoDecimal}`);
  registrarLog(calculadora, "modo_decimal", `modo_decimal=${modoDecimal}`);
}

function iniciarCapturaTasaImpuesto(calculadora) {
  calculadora.editando_tasa_impuesto = true;
  calculadora.buffer_tasa_impuesto = calculadora.tasa_impuesto;
  registrarLog(
    calculadora,
    "tasa_impuesto_editar",
    `tasa_impuesto=${calculadora.tasa_impuesto}`,
  );
}

function manejarCapturaTasaImpuesto(calculadora, tecla) {
  if (tecla === "a" || tecla === "A") {
    calculadora.editando_tasa_impuesto = false;
    calculadora.buffer_tasa_impuesto = "";
    borrarTodo(calculadora);
    return;
  }

  if (tecla === "r" || tecla === "R") {
    calculadora.editando_tasa_impuesto = false;
    calculadora.buffer_tasa_impuesto = "";
    registrarLog(calculadora, "tasa_impuesto_cancelar");
    return;
  }

  if (tecla === "e" || tecla === "E") {
    calculadora.buffer_tasa_impuesto = "0";
    return;
  }

  if (esDigito(tecla)) {
    if (calculadora.buffer_tasa_impuesto === "" || calculadora.buffer_tasa_impuesto === "0") {
      calculadora.buffer_tasa_impuesto = tecla;
    } else {
      calculadora.buffer_tasa_impuesto += tecla;
    }
    return;
  }

  if (tecla === ".") {
    if (calculadora.buffer_tasa_impuesto.includes(".")) {
      throw new Error("La tasa de impuesto ya tiene punto decimal.");
    }
    if (calculadora.buffer_tasa_impuesto === "") {
      calculadora.buffer_tasa_impuesto = "0.";
    } else {
      calculadora.buffer_tasa_impuesto += ".";
    }
    return;
  }

  if (tecla === "=") {
    let buffer = calculadora.buffer_tasa_impuesto || "0";
    if (buffer.endsWith(".")) {
      buffer += "0";
    }
    const tasa = parseDecimal(buffer);
    if (tasa.sign < 0n) {
      throw new Error("La tasa de impuesto no puede ser negativa.");
    }
    calculadora.tasa_impuesto = decimalToString(tasa);
    calculadora.editando_tasa_impuesto = false;
    calculadora.buffer_tasa_impuesto = "";
    registrarCinta(
      calculadora,
      `TASA IMPUESTO = ${formatearValorVisible(calculadora, calculadora.tasa_impuesto)}%`,
    );
    registrarLog(
      calculadora,
      "tasa_impuesto",
      `tasa_impuesto=${calculadora.tasa_impuesto}`,
    );
    return;
  }

  throw new Error("Mientras editas tasa solo se aceptan digitos, '.', '=', 'e' o 'r'.");
}

function reiniciarOperacion(calculadora) {
  calculadora.estado = ESTADO_ENCENDIDA_ESPERANDO_TYPING;
  calculadora.display = "0";
  calculadora.operando_actual = "";
  calculadora.acumulado = "";
  calculadora.acumulado_multiplicativo = "";
  calculadora.operador_pendiente = "";
  calculadora.operador_subtotal = "+";
}

function describirEstado(calculadora) {
  return [
    `estado=${calculadora.estado}`,
    `display=${calculadora.display}`,
    `operando_actual=${calculadora.operando_actual}`,
    `acumulado=${calculadora.acumulado}`,
    `acumulado_multiplicativo=${calculadora.acumulado_multiplicativo}`,
    `operador_pendiente=${calculadora.operador_pendiente}`,
    `operador_subtotal=${calculadora.operador_subtotal}`,
    `gran_total=${calculadora.gran_total}`,
    `modo_decimal=${calculadora.modo_decimal}`,
    `tasa_impuesto=${calculadora.tasa_impuesto}`,
    `editando_tasa_impuesto=${calculadora.editando_tasa_impuesto}`,
  ].join(",");
}

function encabezadoCinta(evento) {
  return `--- ${marcaTiempo()} ${evento} ---`;
}

function registrarLog(calculadora, accion, detalle = "") {
  let linea = `[${marcaTiempo()}] accion=${accion}`;
  if (detalle !== "") {
    linea += ` ${detalle}`;
  }
  calculadora.log_entries.push(linea);
}

function registrarCinta(calculadora, linea) {
  calculadora.cinta_entries.push(linea);
}

function marcaTiempo() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function esDigito(tecla) {
  return tecla >= "0" && tecla <= "9";
}

function parseDecimal(texto) {
  let normalizado = texto.trim();
  if (normalizado === "" || normalizado === ".") {
    normalizado = "0";
  }
  if (normalizado === "-.") {
    normalizado = "-0";
  }
  if (normalizado.startsWith(".")) {
    normalizado = `0${normalizado}`;
  }
  if (normalizado.startsWith("-.")) {
    normalizado = normalizado.replace("-.", "-0.");
  }

  let signo = 1n;
  if (normalizado.startsWith("-")) {
    signo = -1n;
    normalizado = normalizado.slice(1);
  }

  const partes = normalizado.split(".");
  const enteros = partes[0] || "0";
  const fraccion = partes[1] || "";
  const scale = fraccion.length;
  const digits = `${enteros}${fraccion}`.replace(/^0+(?=\d)/, "") || "0";
  return normalizeDecimal({
    sign: digits === "0" ? 1n : signo,
    value: BigInt(digits),
    scale,
  });
}

function normalizeDecimal(decimal) {
  let value = decimal.value;
  let scale = decimal.scale;
  let sign = decimal.sign;

  if (value === 0n) {
    return { sign: 1n, value: 0n, scale: 0 };
  }

  while (scale > 0 && value % 10n === 0n) {
    value /= 10n;
    scale -= 1;
  }

  return { sign, value, scale };
}

function decimalToString(decimal) {
  const normalizado = normalizeDecimal(decimal);
  if (normalizado.value === 0n) {
    return "0";
  }

  let digits = normalizado.value.toString();
  const sign = normalizado.sign < 0n ? "-" : "";

  if (normalizado.scale === 0) {
    return `${sign}${digits}`;
  }

  if (digits.length <= normalizado.scale) {
    digits = digits.padStart(normalizado.scale + 1, "0");
  }

  const split = digits.length - normalizado.scale;
  const enteros = digits.slice(0, split);
  const fraccion = digits.slice(split).replace(/0+$/, "");
  if (fraccion === "") {
    return `${sign}${enteros}`;
  }
  return `${sign}${enteros}.${fraccion}`;
}

function decimalToFixedString(decimal, fixedScale) {
  const normalizado = normalizeDecimal(decimal);
  const sign = normalizado.value === 0n ? "" : normalizado.sign < 0n ? "-" : "";
  let digits = normalizado.value.toString();

  if (fixedScale === 0) {
    return `${sign}${digits}`;
  }

  if (normalizado.scale < fixedScale) {
    digits = digits.padEnd(digits.length + (fixedScale - normalizado.scale), "0");
  }

  if (digits.length <= fixedScale) {
    digits = digits.padStart(fixedScale + 1, "0");
  }

  const split = digits.length - fixedScale;
  const enteros = digits.slice(0, split);
  const fraccion = digits.slice(split);
  return `${sign}${enteros}.${fraccion}`;
}

function roundDecimal(decimal, targetScale) {
  const normalizado = normalizeDecimal(decimal);
  if (normalizado.scale <= targetScale) {
    return {
      sign: normalizado.sign,
      value: normalizado.value,
      scale: normalizado.scale,
    };
  }

  const factor = tenPow(BigInt(normalizado.scale - targetScale));
  let quotient = normalizado.value / factor;
  const remainder = normalizado.value % factor;
  if (remainder * 2n >= factor) {
    quotient += 1n;
  }

  return {
    sign: normalizado.sign,
    value: quotient,
    scale: targetScale,
  };
}

function alignDecimals(a, b) {
  const scale = Math.max(a.scale, b.scale);
  const factorA = tenPow(BigInt(scale - a.scale));
  const factorB = tenPow(BigInt(scale - b.scale));
  return {
    aValue: a.sign * a.value * factorA,
    bValue: b.sign * b.value * factorB,
    scale,
  };
}

function addDecimals(a, b) {
  const aligned = alignDecimals(a, b);
  const sum = aligned.aValue + aligned.bValue;
  return signedBigIntToDecimal(sum, aligned.scale);
}

function subtractDecimals(a, b) {
  const aligned = alignDecimals(a, b);
  const diff = aligned.aValue - aligned.bValue;
  return signedBigIntToDecimal(diff, aligned.scale);
}

function multiplyDecimals(a, b) {
  return normalizeDecimal({
    sign: a.sign * b.sign,
    value: a.value * b.value,
    scale: a.scale + b.scale,
  });
}

function divideDecimals(a, b, precision) {
  if (b.value === 0n) {
    throw new Error("No se puede dividir entre cero.");
  }

  const shift = precision + BigInt(b.scale) - BigInt(a.scale);
  let numerator = a.value;
  let denominator = b.value;
  let scale = Number(precision);

  if (shift >= 0n) {
    numerator *= tenPow(shift);
  } else {
    denominator *= tenPow(-shift);
  }

  let quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder !== 0n) {
    const doubled = remainder * 2n;
    if (doubled > denominator || doubled === denominator) {
      quotient += 1n;
    }
  }

  return normalizeDecimal({
    sign: a.sign * b.sign,
    value: quotient,
    scale,
  });
}

function signedBigIntToDecimal(value, scale) {
  if (value === 0n) {
    return { sign: 1n, value: 0n, scale: 0 };
  }
  return normalizeDecimal({
    sign: value < 0n ? -1n : 1n,
    value: value < 0n ? -value : value,
    scale,
  });
}

function tenPow(exp) {
  if (exp <= 0n) {
    return 1n;
  }
  return 10n ** exp;
}
