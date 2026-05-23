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
    tasa_conversion: "1",
    editando_tasa_conversion: false,
    buffer_tasa_conversion: "",
    reemplazar_buffer_tasa_conversion: false,
    tasa_out: "0",
    editando_tasa_out: false,
    buffer_tasa_out: "",
    reemplazar_buffer_tasa_out: false,
    spread_seguro: "0",
    editando_spread_seguro: false,
    buffer_spread_seguro: "",
    reemplazar_buffer_spread_seguro: false,
    tasa_publicada_segura: "",
    ultimo_impuesto: "",
    memoria: "0",
    valor_cost: "",
    valor_sell: "",
    valor_mar: "",
    valor_disponible_para_funcion: false,
    detalle_operando_cinta: "",
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

export function apagar(calculadora) {
  registrarLog(calculadora, "apagar");
  registrarCinta(calculadora, encabezadoCinta("apagada"));
  calculadora.estado = ESTADO_APAGADA;
  calculadora.display = "";
  calculadora.operando_actual = "";
  calculadora.acumulado = "";
  calculadora.acumulado_multiplicativo = "";
  calculadora.operador_pendiente = "";
  calculadora.detalle_operando_cinta = "";
}

export function iniciarNuevaCinta(calculadora) {
  const memoria = calculadora.memoria;
  const modoDecimal = calculadora.modo_decimal;
  const tasaImpuesto = calculadora.tasa_impuesto;
  const tasaConversion = calculadora.tasa_conversion;
  const tasaOut = calculadora.tasa_out;
  const spreadSeguro = calculadora.spread_seguro;
  const tasaPublicadaSegura = calculadora.tasa_publicada_segura;

  Object.assign(calculadora, nuevaCalculadora(), {
    memoria,
    modo_decimal: modoDecimal,
    tasa_impuesto: tasaImpuesto,
    tasa_conversion: tasaConversion,
    tasa_out: tasaOut,
    spread_seguro: spreadSeguro,
    tasa_publicada_segura: tasaPublicadaSegura,
  });

  reiniciarOperacion(calculadora);
  registrarLog(calculadora, "nueva_cinta");
  registrarCinta(calculadora, encabezadoCinta("nueva_cinta"));
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
    } else if (calculadora.editando_tasa_conversion) {
      manejarCapturaTasaConversion(calculadora, tecla);
    } else if (calculadora.editando_tasa_out) {
      manejarCapturaTasaOut(calculadora, tecla);
    } else if (calculadora.editando_spread_seguro) {
      manejarCapturaSpreadSeguro(calculadora, tecla);
    } else if (tecla === "e" || tecla === "E") {
      borrarEntrada(calculadora);
    } else if (tecla === "a" || tecla === "A") {
      borrarTodo(calculadora);
    } else if (Object.hasOwn(TECLAS_MODO_DECIMAL, tecla)) {
      cambiarModoDecimal(calculadora, TECLAS_MODO_DECIMAL[tecla]);
    } else if (tecla === "r" || tecla === "R") {
      iniciarCapturaTasaImpuesto(calculadora);
    } else if (tecla === "w" || tecla === "W") {
      iniciarCapturaTasaConversion(calculadora);
    } else if (tecla === "o" || tecla === "O") {
      iniciarCapturaTasaOut(calculadora);
    } else if (tecla === "b" || tecla === "B") {
      iniciarCapturaSpreadSeguro(calculadora);
    } else if (tecla === "i" || tecla === "I") {
      sumarImpuesto(calculadora);
    } else if (tecla === "u" || tecla === "U") {
      restarImpuesto(calculadora);
    } else if (tecla === "y" || tecla === "Y") {
      convertirValor(calculadora);
    } else if (tecla === "j" || tecla === "J") {
      publicarTipoSeguro(calculadora);
    } else if (tecla === "z" || tecla === "Z") {
      calcularDolaresACobrar(calculadora);
    } else if (tecla === "p" || tecla === "P") {
      aplicarPorcentaje(calculadora);
    } else if (tecla === "m" || tecla === "M") {
      leerMemoria(calculadora);
    } else if (tecla === "n" || tecla === "N") {
      sumarAMemoria(calculadora);
    } else if (tecla === "v" || tecla === "V") {
      restarDeMemoria(calculadora);
    } else if (tecla === "x" || tecla === "X") {
      limpiarMemoria(calculadora);
    } else if (tecla === "k" || tecla === "K") {
      manejarFuncionComercial(calculadora, "cost");
    } else if (tecla === "l" || tecla === "L") {
      manejarFuncionComercial(calculadora, "sell");
    } else if (tecla === "h" || tecla === "H") {
      manejarFuncionComercial(calculadora, "mar");
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
  if (calculadora.editando_tasa_conversion) {
    return `RATE ${formatTypedOperand(calculadora.buffer_tasa_conversion || "0")}`;
  }
  if (calculadora.editando_tasa_out) {
    return `OUT ${formatTypedOperand(calculadora.buffer_tasa_out || "0")}`;
  }
  if (calculadora.editando_spread_seguro) {
    return `SPD ${formatTypedOperand(calculadora.buffer_spread_seguro || "0")}`;
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

function obtenerTasaConversionDecimal(calculadora) {
  return parseDecimal(calculadora.tasa_conversion);
}

function calcularTasaPublicadaSeguraDecimal(calculadora) {
  const publicada = subtractDecimals(
    parseDecimal(calculadora.tasa_out),
    parseDecimal(calculadora.spread_seguro),
  );
  if (publicada.sign < 0n || publicada.value === 0n) {
    throw new Error("OUT debe ser mayor que SPD para publicar un tipo seguro.");
  }
  return publicada;
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

function obtenerValorActualParaMemoria(calculadora) {
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

function obtenerValorActualParaFuncionComercial(calculadora) {
  if (calculadora.estado === ESTADO_TYPING_OPERANDO) {
    if (esOperandoIncompleto(calculadora.operando_actual)) {
      throw new Error("Falta completar el operando negativo.");
    }
    if (calculadora.operando_actual !== "") {
      return calculadora.operando_actual;
    }
  }

  if (calculadora.display !== "") {
    return calculadora.display;
  }

  return "0";
}

function fijarResultado(calculadora, resultado) {
  calculadora.display = resultado;
  calculadora.operando_actual = "";
  calculadora.acumulado = resultado;
  calculadora.acumulado_multiplicativo = "";
  calculadora.operador_pendiente = "";
  calculadora.operador_subtotal = "+";
  calculadora.estado = ESTADO_RESULTADO_EN_DISPLAY;
  calculadora.valor_disponible_para_funcion = true;
}

function aplicarResultadoTransformacion(calculadora, resultado) {
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

function aplicarRecallMemoria(calculadora, valor) {
  if (calculadora.estado === ESTADO_OPERADOR_PENDIENTE) {
    calculadora.operando_actual = valor;
    calculadora.display = valor;
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (
    calculadora.estado === ESTADO_TYPING_OPERANDO &&
    calculadora.operador_pendiente !== ""
  ) {
    calculadora.operando_actual = valor;
    calculadora.display = valor;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  fijarResultado(calculadora, valor);
}

function manejarEncendidaEsperandoTyping(calculadora, tecla) {
  if (tecla === "-") {
    calculadora.operando_actual = "-";
    calculadora.display = "-";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (esDigito(tecla)) {
    calculadora.detalle_operando_cinta = "";
    calculadora.operando_actual = tecla;
    calculadora.display = tecla;
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (tecla === ".") {
    calculadora.detalle_operando_cinta = "";
    calculadora.operando_actual = "0.";
    calculadora.display = "0.";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  throw new Error(
    "En encendida_esperando_typing solo se aceptan digitos, '.' o '-'.",
  );
}

function manejarTypingOperando(calculadora, tecla) {
  if (esDigito(tecla)) {
    calculadora.detalle_operando_cinta = "";
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
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (tecla === ".") {
    calculadora.detalle_operando_cinta = "";
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
    calculadora.valor_disponible_para_funcion = true;
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
    calculadora.detalle_operando_cinta = "";
    calculadora.operando_actual = "-";
    calculadora.display = "-";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (esDigito(tecla)) {
    calculadora.detalle_operando_cinta = "";
    calculadora.operando_actual = tecla;
    calculadora.display = tecla;
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (tecla === ".") {
    calculadora.detalle_operando_cinta = "";
    calculadora.operando_actual = "0.";
    calculadora.display = "0.";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
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
    calculadora.detalle_operando_cinta = "";
    calculadora.operando_actual = tecla;
    calculadora.display = tecla;
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (tecla === ".") {
    reiniciarOperacion(calculadora);
    calculadora.detalle_operando_cinta = "";
    calculadora.operando_actual = "0.";
    calculadora.display = "0.";
    calculadora.estado = ESTADO_TYPING_OPERANDO;
    calculadora.valor_disponible_para_funcion = true;
    return;
  }

  if (esOperadorAditivo(tecla)) {
    calculadora.acumulado = calculadora.display;
    calculadora.operador_subtotal = tecla;
    calculadora.operador_pendiente = tecla;
    calculadora.operando_actual = "";
    calculadora.acumulado_multiplicativo = "";
    calculadora.estado = ESTADO_OPERADOR_PENDIENTE;
    calculadora.valor_disponible_para_funcion = false;
    return;
  }

  if (esOperadorMultiplicativo(tecla)) {
    calculadora.acumulado = "";
    calculadora.acumulado_multiplicativo = calculadora.display;
    calculadora.operador_subtotal = "+";
    calculadora.operador_pendiente = tecla;
    calculadora.operando_actual = "";
    calculadora.estado = ESTADO_OPERADOR_PENDIENTE;
    calculadora.valor_disponible_para_funcion = false;
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
  aplicarResultadoTransformacion(calculadora, total);
  registrarCinta(
    calculadora,
    `TAX+ ${formatearValorVisible(calculadora, base)} @ ${formatearValorVisible(
      calculadora,
      calculadora.tasa_impuesto,
    )}% = ${formatearValorVisible(calculadora, total)} (TAX ${formatearValorVisible(
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
  aplicarResultadoTransformacion(calculadora, base);
  registrarCinta(
    calculadora,
    `TAX- ${formatearValorVisible(calculadora, total)} @ ${formatearValorVisible(
      calculadora,
      calculadora.tasa_impuesto,
    )}% = ${formatearValorVisible(calculadora, base)} (TAX ${formatearValorVisible(
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

function convertirValor(calculadora) {
  const valor = obtenerValorActualParaImpuesto(calculadora);
  const tasa = obtenerTasaConversionDecimal(calculadora);
  const convertido = applyModeDecimal(
    calculadora,
    multiplyDecimals(parseDecimal(valor), tasa),
  );
  aplicarResultadoTransformacion(calculadora, convertido);
  if (
    calculadora.estado === ESTADO_TYPING_OPERANDO &&
    calculadora.operador_pendiente !== ""
  ) {
    calculadora.detalle_operando_cinta = `CONV ${formatearValorVisible(
      calculadora,
      valor,
    )} @ ${formatearValorVisible(calculadora, calculadora.tasa_conversion)}`;
  }
  registrarCinta(
    calculadora,
    `CONV ${formatearValorVisible(calculadora, valor)} @ ${formatearValorVisible(
      calculadora,
      calculadora.tasa_conversion,
    )} = ${formatearValorVisible(calculadora, convertido)}`,
  );
  registrarLog(
    calculadora,
    "conversion",
    `valor=${valor} tasa_conversion=${calculadora.tasa_conversion} convertido=${convertido}`,
  );
}

function publicarTipoSeguro(calculadora) {
  const publicada = applyModeDecimal(
    calculadora,
    calcularTasaPublicadaSeguraDecimal(calculadora),
  );
  calculadora.tasa_publicada_segura = publicada;
  fijarResultado(calculadora, publicada);
  registrarCinta(
    calculadora,
    `PUB = ${formatearValorVisible(calculadora, publicada)} (OUT ${formatearValorVisible(
      calculadora,
      calculadora.tasa_out,
    )}, SPD ${formatearValorVisible(calculadora, calculadora.spread_seguro)})`,
  );
  registrarLog(
    calculadora,
    "tipo_publicado",
    `out=${calculadora.tasa_out} spread=${calculadora.spread_seguro} publicado=${publicada}`,
  );
}

function calcularDolaresACobrar(calculadora) {
  const valor = obtenerValorActualParaImpuesto(calculadora);
  const publicada = applyModeDecimal(
    calculadora,
    calcularTasaPublicadaSeguraDecimal(calculadora),
  );
  calculadora.tasa_publicada_segura = publicada;
  const dolares = applyModeDecimal(
    calculadora,
    divideDecimals(parseDecimal(valor), parseDecimal(publicada), PRECISION_DIVISION),
  );
  aplicarResultadoTransformacion(calculadora, dolares);
  if (
    calculadora.estado === ESTADO_TYPING_OPERANDO &&
    calculadora.operador_pendiente !== ""
  ) {
    calculadora.detalle_operando_cinta = `BASE ${formatearValorVisible(
      calculadora,
      valor,
    )} / PUB ${formatearValorVisible(calculadora, publicada)}`;
  }
  registrarCinta(
    calculadora,
    `BASE ${formatearValorVisible(calculadora, valor)} / PUB ${formatearValorVisible(
      calculadora,
      publicada,
    )} = ${formatearValorVisible(calculadora, dolares)}`,
  );
  registrarLog(
    calculadora,
    "usd_cobro",
    `mxn=${valor} publicado=${publicada} usd=${dolares}`,
  );
}

function aplicarPorcentaje(calculadora) {
  if (calculadora.estado === ESTADO_OPERADOR_PENDIENTE) {
    throw new Error("Falta capturar el operando para aplicar porcentaje.");
  }

  let operando;
  if (calculadora.estado === ESTADO_TYPING_OPERANDO) {
    if (esOperandoIncompleto(calculadora.operando_actual)) {
      throw new Error("Falta completar el operando negativo.");
    }
    if (calculadora.operando_actual === "") {
      throw new Error("Falta capturar el operando para aplicar porcentaje.");
    }
    operando = calculadora.operando_actual;
  } else {
    operando = obtenerSubtotalActual(calculadora, false);
  }

  let base = "";
  let resultado;
  let detalleCinta;

  if (
    calculadora.estado === ESTADO_TYPING_OPERANDO &&
    esOperadorAditivo(calculadora.operador_pendiente) &&
    calculadora.acumulado !== ""
  ) {
    base = calculadora.acumulado;
    resultado = applyModeDecimal(
      calculadora,
      divideDecimals(
        multiplyDecimals(parseDecimal(base), parseDecimal(operando)),
        parseDecimal("100"),
        PRECISION_DIVISION,
      ),
    );
    detalleCinta = `PORC ${formatearValorVisible(calculadora, operando)}% DE ${formatearValorVisible(
      calculadora,
      base,
    )} = ${formatearValorVisible(calculadora, resultado)}`;
    calculadora.detalle_operando_cinta = `${formatearValorVisible(
      calculadora,
      operando,
    )}% DE ${formatearValorVisible(calculadora, base)}`;
  } else {
    resultado = applyModeDecimal(
      calculadora,
      divideDecimals(parseDecimal(operando), parseDecimal("100"), PRECISION_DIVISION),
    );
    detalleCinta = `PORC ${formatearValorVisible(calculadora, operando)}% = ${formatearValorVisible(
      calculadora,
      resultado,
    )}`;
    if (
      calculadora.estado === ESTADO_TYPING_OPERANDO &&
      (calculadora.operador_pendiente === "*" || calculadora.operador_pendiente === "/")
    ) {
      calculadora.detalle_operando_cinta = `${formatearValorVisible(calculadora, operando)}%`;
    } else {
      calculadora.detalle_operando_cinta = "";
    }
  }

  aplicarResultadoTransformacion(calculadora, resultado);
  registrarCinta(calculadora, detalleCinta);
  registrarLog(
    calculadora,
    "porcentaje",
    `operando=${operando} base=${base} resultado=${resultado}`,
  );
}

function sumarAMemoria(calculadora) {
  const valor = obtenerValorActualParaMemoria(calculadora);
  const memoriaNueva = applyModeDecimal(
    calculadora,
    addDecimals(parseDecimal(calculadora.memoria), parseDecimal(valor)),
  );
  calculadora.memoria = memoriaNueva;
  registrarCinta(
    calculadora,
    `M+ ${formatearValorVisible(calculadora, valor)} => ${formatearValorVisible(
      calculadora,
      memoriaNueva,
    )}`,
  );
  registrarLog(
    calculadora,
    "memoria_suma",
    `valor=${valor} memoria=${memoriaNueva}`,
  );
}

function restarDeMemoria(calculadora) {
  const valor = obtenerValorActualParaMemoria(calculadora);
  const memoriaNueva = applyModeDecimal(
    calculadora,
    subtractDecimals(parseDecimal(calculadora.memoria), parseDecimal(valor)),
  );
  calculadora.memoria = memoriaNueva;
  registrarCinta(
    calculadora,
    `M- ${formatearValorVisible(calculadora, valor)} => ${formatearValorVisible(
      calculadora,
      memoriaNueva,
    )}`,
  );
  registrarLog(
    calculadora,
    "memoria_resta",
    `valor=${valor} memoria=${memoriaNueva}`,
  );
}

function leerMemoria(calculadora) {
  const valor = applyModeDecimal(calculadora, calculadora.memoria);
  aplicarRecallMemoria(calculadora, valor);
  registrarCinta(calculadora, `MR = ${formatearValorVisible(calculadora, valor)}`);
  registrarLog(calculadora, "memoria_leer", `memoria=${valor}`);
}

function limpiarMemoria(calculadora) {
  calculadora.memoria = "0";
  registrarCinta(calculadora, "MC");
  registrarLog(calculadora, "memoria_limpiar");
}

function manejarFuncionComercial(calculadora, campo) {
  if (calculadora.valor_disponible_para_funcion) {
    const valor = applyModeDecimal(
      calculadora,
      obtenerValorActualParaFuncionComercial(calculadora),
    );
    asignarValorFuncionComercial(calculadora, campo, valor);
    fijarResultado(calculadora, valor);
    calculadora.valor_disponible_para_funcion = false;
    registrarCinta(
      calculadora,
      `${etiquetaFuncionComercial(campo)} = ${formatearValorVisible(calculadora, valor)}`,
    );
    registrarLog(
      calculadora,
      "funcion_comercial_guardar",
      `campo=${campo} valor=${valor}`,
    );
    return;
  }

  const resultado = calcularFuncionComercial(calculadora, campo);
  asignarValorFuncionComercial(calculadora, campo, resultado);
  fijarResultado(calculadora, resultado);
  calculadora.valor_disponible_para_funcion = false;
  registrarCinta(
    calculadora,
    describirCalculoFuncionComercial(calculadora, campo, resultado),
  );
  registrarLog(
    calculadora,
    "funcion_comercial_calcular",
    `campo=${campo} resultado=${resultado}`,
  );
}

function etiquetaFuncionComercial(campo) {
  if (campo === "cost") return "COST";
  if (campo === "sell") return "SELL";
  if (campo === "mar") return "MAR";
  throw new Error("Campo comercial no soportado.");
}

function asignarValorFuncionComercial(calculadora, campo, valor) {
  if (campo === "cost") {
    calculadora.valor_cost = valor;
    return;
  }
  if (campo === "sell") {
    calculadora.valor_sell = valor;
    return;
  }
  if (campo === "mar") {
    calculadora.valor_mar = valor;
    return;
  }
  throw new Error("Campo comercial no soportado.");
}

function calcularFuncionComercial(calculadora, campo) {
  const costo = calculadora.valor_cost;
  const venta = calculadora.valor_sell;
  const margen = calculadora.valor_mar;

  if (campo === "cost") {
    if (venta === "" || margen === "") {
      throw new Error("Para calcular COST se requieren SELL y MAR.");
    }
    const divisor = subtractDecimals(
      parseDecimal("1"),
      divideDecimals(parseDecimal(margen), parseDecimal("100"), PRECISION_DIVISION),
    );
    if (divisor.sign < 0n || divisor.value === 0n) {
      throw new Error("El margen debe ser menor a 100.");
    }
    return applyModeDecimal(
      calculadora,
      multiplyDecimals(parseDecimal(venta), divisor),
    );
  }

  if (campo === "sell") {
    if (costo === "" || margen === "") {
      throw new Error("Para calcular SELL se requieren COST y MAR.");
    }
    const divisor = subtractDecimals(
      parseDecimal("1"),
      divideDecimals(parseDecimal(margen), parseDecimal("100"), PRECISION_DIVISION),
    );
    if (divisor.sign < 0n || divisor.value === 0n) {
      throw new Error("El margen debe ser menor a 100.");
    }
    return applyModeDecimal(
      calculadora,
      divideDecimals(parseDecimal(costo), divisor, PRECISION_DIVISION),
    );
  }

  if (campo === "mar") {
    if (costo === "" || venta === "") {
      throw new Error("Para calcular MAR se requieren COST y SELL.");
    }
    if (parseDecimal(venta).value === 0n) {
      throw new Error("SELL no puede ser cero para calcular MAR.");
    }
    return applyModeDecimal(
      calculadora,
      multiplyDecimals(
        divideDecimals(
          subtractDecimals(parseDecimal(venta), parseDecimal(costo)),
          parseDecimal(venta),
          PRECISION_DIVISION,
        ),
        parseDecimal("100"),
      ),
    );
  }

  throw new Error("Campo comercial no soportado.");
}

function describirCalculoFuncionComercial(calculadora, campo, resultado) {
  if (campo === "cost") {
    return `COST = ${formatearValorVisible(calculadora, resultado)} (SELL ${formatearValorVisible(
      calculadora,
      calculadora.valor_sell,
    )}, MAR ${formatearValorVisible(calculadora, calculadora.valor_mar)}%)`;
  }
  if (campo === "sell") {
    return `SELL = ${formatearValorVisible(calculadora, resultado)} (COST ${formatearValorVisible(
      calculadora,
      calculadora.valor_cost,
    )}, MAR ${formatearValorVisible(calculadora, calculadora.valor_mar)}%)`;
  }
  if (campo === "mar") {
    return `MAR = ${formatearValorVisible(calculadora, resultado)}% (COST ${formatearValorVisible(
      calculadora,
      calculadora.valor_cost,
    )}, SELL ${formatearValorVisible(calculadora, calculadora.valor_sell)})`;
  }
  throw new Error("Campo comercial no soportado.");
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
  let derechaVisible = formatearValorVisible(calculadora, derecha);
  if (calculadora.detalle_operando_cinta !== "") {
    derechaVisible = calculadora.detalle_operando_cinta;
    calculadora.detalle_operando_cinta = "";
  }
  registrarCinta(
    calculadora,
    `${formatearValorVisible(calculadora, izquierda)} ${operador} ${derechaVisible} = ${formatearValorVisible(calculadora, resultado)}`,
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

  registrarCinta(calculadora, "C");
  registrarLog(calculadora, "borrar_entrada");
  calculadora.detalle_operando_cinta = "";
}

function borrarTodo(calculadora) {
  reiniciarOperacion(calculadora);
  calculadora.gran_total = "0";
  calculadora.ultimo_subtotal = "";
  calculadora.ultimo_gran_total = "";
  calculadora.ultimo_impuesto = "";
  calculadora.valor_cost = "";
  calculadora.valor_sell = "";
  calculadora.valor_mar = "";
  calculadora.editando_tasa_impuesto = false;
  calculadora.buffer_tasa_impuesto = "";
  calculadora.editando_tasa_conversion = false;
  calculadora.buffer_tasa_conversion = "";
  calculadora.reemplazar_buffer_tasa_conversion = false;
  calculadora.editando_tasa_out = false;
  calculadora.buffer_tasa_out = "";
  calculadora.reemplazar_buffer_tasa_out = false;
  calculadora.editando_spread_seguro = false;
  calculadora.buffer_spread_seguro = "";
  calculadora.reemplazar_buffer_spread_seguro = false;
  calculadora.detalle_operando_cinta = "";
  registrarCinta(calculadora, "AC");
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
      `TAX = ${formatearValorVisible(calculadora, calculadora.tasa_impuesto)}%`,
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

function iniciarCapturaTasaConversion(calculadora) {
  calculadora.editando_tasa_conversion = true;
  calculadora.buffer_tasa_conversion = calculadora.tasa_conversion;
  calculadora.reemplazar_buffer_tasa_conversion = true;
  registrarLog(
    calculadora,
    "tasa_conversion_editar",
    `tasa_conversion=${calculadora.tasa_conversion}`,
  );
}

function manejarCapturaTasaConversion(calculadora, tecla) {
  if (tecla === "a" || tecla === "A") {
    calculadora.editando_tasa_conversion = false;
    calculadora.buffer_tasa_conversion = "";
    calculadora.reemplazar_buffer_tasa_conversion = false;
    borrarTodo(calculadora);
    return;
  }

  if (tecla === "w" || tecla === "W") {
    calculadora.editando_tasa_conversion = false;
    calculadora.buffer_tasa_conversion = "";
    calculadora.reemplazar_buffer_tasa_conversion = false;
    registrarLog(calculadora, "tasa_conversion_cancelar");
    return;
  }

  if (tecla === "e" || tecla === "E") {
    calculadora.buffer_tasa_conversion = "0";
    calculadora.reemplazar_buffer_tasa_conversion = false;
    return;
  }

  if (esDigito(tecla)) {
    if (calculadora.reemplazar_buffer_tasa_conversion) {
      calculadora.buffer_tasa_conversion = tecla;
      calculadora.reemplazar_buffer_tasa_conversion = false;
    } else if (
      calculadora.buffer_tasa_conversion === "" ||
      calculadora.buffer_tasa_conversion === "0"
    ) {
      calculadora.buffer_tasa_conversion = tecla;
    } else {
      calculadora.buffer_tasa_conversion += tecla;
    }
    return;
  }

  if (tecla === ".") {
    if (calculadora.buffer_tasa_conversion.includes(".")) {
      throw new Error("La tasa de conversion ya tiene punto decimal.");
    }
    if (calculadora.reemplazar_buffer_tasa_conversion) {
      calculadora.buffer_tasa_conversion = "0.";
      calculadora.reemplazar_buffer_tasa_conversion = false;
    } else if (calculadora.buffer_tasa_conversion === "") {
      calculadora.buffer_tasa_conversion = "0.";
    } else {
      calculadora.buffer_tasa_conversion += ".";
    }
    return;
  }

  if (tecla === "=") {
    let buffer = calculadora.buffer_tasa_conversion || "0";
    if (buffer.endsWith(".")) {
      buffer += "0";
    }
    const tasa = parseDecimal(buffer);
    if (tasa.sign < 0n) {
      throw new Error("La tasa de conversion no puede ser negativa.");
    }
    calculadora.tasa_conversion = decimalToString(tasa);
    calculadora.editando_tasa_conversion = false;
    calculadora.buffer_tasa_conversion = "";
    calculadora.reemplazar_buffer_tasa_conversion = false;
    registrarCinta(
      calculadora,
      `RATE = ${formatearValorVisible(calculadora, calculadora.tasa_conversion)}`,
    );
    registrarLog(
      calculadora,
      "tasa_conversion",
      `tasa_conversion=${calculadora.tasa_conversion}`,
    );
    return;
  }

  throw new Error("Mientras editas rate solo se aceptan digitos, '.', '=', 'e' o 'w'.");
}

function iniciarCapturaTasaOut(calculadora) {
  calculadora.editando_tasa_out = true;
  calculadora.buffer_tasa_out = calculadora.tasa_out;
  calculadora.reemplazar_buffer_tasa_out = true;
  registrarLog(calculadora, "tasa_out_editar", `tasa_out=${calculadora.tasa_out}`);
}

function manejarCapturaTasaOut(calculadora, tecla) {
  if (tecla === "a" || tecla === "A") {
    calculadora.editando_tasa_out = false;
    calculadora.buffer_tasa_out = "";
    calculadora.reemplazar_buffer_tasa_out = false;
    borrarTodo(calculadora);
    return;
  }

  if (tecla === "o" || tecla === "O") {
    calculadora.editando_tasa_out = false;
    calculadora.buffer_tasa_out = "";
    calculadora.reemplazar_buffer_tasa_out = false;
    registrarLog(calculadora, "tasa_out_cancelar");
    return;
  }

  if (tecla === "e" || tecla === "E") {
    calculadora.buffer_tasa_out = "0";
    calculadora.reemplazar_buffer_tasa_out = false;
    return;
  }

  if (esDigito(tecla)) {
    if (calculadora.reemplazar_buffer_tasa_out) {
      calculadora.buffer_tasa_out = tecla;
      calculadora.reemplazar_buffer_tasa_out = false;
    } else if (calculadora.buffer_tasa_out === "" || calculadora.buffer_tasa_out === "0") {
      calculadora.buffer_tasa_out = tecla;
    } else {
      calculadora.buffer_tasa_out += tecla;
    }
    return;
  }

  if (tecla === ".") {
    if (calculadora.buffer_tasa_out.includes(".")) {
      throw new Error("OUT ya tiene punto decimal.");
    }
    if (calculadora.reemplazar_buffer_tasa_out) {
      calculadora.buffer_tasa_out = "0.";
      calculadora.reemplazar_buffer_tasa_out = false;
    } else if (calculadora.buffer_tasa_out === "") {
      calculadora.buffer_tasa_out = "0.";
    } else {
      calculadora.buffer_tasa_out += ".";
    }
    return;
  }

  if (tecla === "=") {
    let buffer = calculadora.buffer_tasa_out || "0";
    if (buffer.endsWith(".")) {
      buffer += "0";
    }
    const tasa = parseDecimal(buffer);
    if (tasa.sign < 0n) {
      throw new Error("OUT no puede ser negativo.");
    }
    calculadora.tasa_out = decimalToString(tasa);
    calculadora.editando_tasa_out = false;
    calculadora.buffer_tasa_out = "";
    calculadora.reemplazar_buffer_tasa_out = false;
    registrarCinta(calculadora, `OUT = ${formatearValorVisible(calculadora, calculadora.tasa_out)}`);
    registrarLog(calculadora, "tasa_out", `tasa_out=${calculadora.tasa_out}`);
    return;
  }

  throw new Error("Mientras editas OUT solo se aceptan digitos, '.', '=', 'e' u 'o'.");
}

function iniciarCapturaSpreadSeguro(calculadora) {
  calculadora.editando_spread_seguro = true;
  calculadora.buffer_spread_seguro = calculadora.spread_seguro;
  calculadora.reemplazar_buffer_spread_seguro = true;
  registrarLog(
    calculadora,
    "spread_seguro_editar",
    `spread_seguro=${calculadora.spread_seguro}`,
  );
}

function manejarCapturaSpreadSeguro(calculadora, tecla) {
  if (tecla === "a" || tecla === "A") {
    calculadora.editando_spread_seguro = false;
    calculadora.buffer_spread_seguro = "";
    calculadora.reemplazar_buffer_spread_seguro = false;
    borrarTodo(calculadora);
    return;
  }

  if (tecla === "b" || tecla === "B") {
    calculadora.editando_spread_seguro = false;
    calculadora.buffer_spread_seguro = "";
    calculadora.reemplazar_buffer_spread_seguro = false;
    registrarLog(calculadora, "spread_seguro_cancelar");
    return;
  }

  if (tecla === "e" || tecla === "E") {
    calculadora.buffer_spread_seguro = "0";
    calculadora.reemplazar_buffer_spread_seguro = false;
    return;
  }

  if (esDigito(tecla)) {
    if (calculadora.reemplazar_buffer_spread_seguro) {
      calculadora.buffer_spread_seguro = tecla;
      calculadora.reemplazar_buffer_spread_seguro = false;
    } else if (
      calculadora.buffer_spread_seguro === "" ||
      calculadora.buffer_spread_seguro === "0"
    ) {
      calculadora.buffer_spread_seguro = tecla;
    } else {
      calculadora.buffer_spread_seguro += tecla;
    }
    return;
  }

  if (tecla === ".") {
    if (calculadora.buffer_spread_seguro.includes(".")) {
      throw new Error("SPD ya tiene punto decimal.");
    }
    if (calculadora.reemplazar_buffer_spread_seguro) {
      calculadora.buffer_spread_seguro = "0.";
      calculadora.reemplazar_buffer_spread_seguro = false;
    } else if (calculadora.buffer_spread_seguro === "") {
      calculadora.buffer_spread_seguro = "0.";
    } else {
      calculadora.buffer_spread_seguro += ".";
    }
    return;
  }

  if (tecla === "=") {
    let buffer = calculadora.buffer_spread_seguro || "0";
    if (buffer.endsWith(".")) {
      buffer += "0";
    }
    const tasa = parseDecimal(buffer);
    if (tasa.sign < 0n) {
      throw new Error("SPD no puede ser negativo.");
    }
    calculadora.spread_seguro = decimalToString(tasa);
    calculadora.editando_spread_seguro = false;
    calculadora.buffer_spread_seguro = "";
    calculadora.reemplazar_buffer_spread_seguro = false;
    registrarCinta(
      calculadora,
      `SPD = ${formatearValorVisible(calculadora, calculadora.spread_seguro)}`,
    );
    registrarLog(
      calculadora,
      "spread_seguro",
      `spread_seguro=${calculadora.spread_seguro}`,
    );
    return;
  }

  throw new Error("Mientras editas SPD solo se aceptan digitos, '.', '=', 'e' o 'b'.");
}

function reiniciarOperacion(calculadora) {
  calculadora.estado = ESTADO_ENCENDIDA_ESPERANDO_TYPING;
  calculadora.display = "0";
  calculadora.operando_actual = "";
  calculadora.acumulado = "";
  calculadora.acumulado_multiplicativo = "";
  calculadora.operador_pendiente = "";
  calculadora.operador_subtotal = "+";
  calculadora.detalle_operando_cinta = "";
  calculadora.valor_disponible_para_funcion = false;
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
    `memoria=${calculadora.memoria}`,
    `valor_cost=${calculadora.valor_cost}`,
    `valor_sell=${calculadora.valor_sell}`,
    `valor_mar=${calculadora.valor_mar}`,
    `tasa_impuesto=${calculadora.tasa_impuesto}`,
    `editando_tasa_impuesto=${calculadora.editando_tasa_impuesto}`,
    `tasa_conversion=${calculadora.tasa_conversion}`,
    `editando_tasa_conversion=${calculadora.editando_tasa_conversion}`,
    `tasa_out=${calculadora.tasa_out}`,
    `editando_tasa_out=${calculadora.editando_tasa_out}`,
    `spread_seguro=${calculadora.spread_seguro}`,
    `editando_spread_seguro=${calculadora.editando_spread_seguro}`,
    `tasa_publicada_segura=${calculadora.tasa_publicada_segura}`,
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
