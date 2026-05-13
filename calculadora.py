import os
import sys
from datetime import datetime
from decimal import Decimal
from decimal import ROUND_HALF_UP

try:
    import termios
    import tty
except ImportError:
    termios = None
    tty = None


ESTADO_APAGADA = "apagada"
ESTADO_ENCENDIDA_ESPERANDO_TYPING = "encendida_esperando_typing"
ESTADO_TYPING_OPERANDO = "typing_operando"
ESTADO_OPERADOR_PENDIENTE = "operador_pendiente"
ESTADO_RESULTADO_EN_DISPLAY = "resultado_en_display"

ARCHIVO_LOG_DETALLADO = "calculadora.log"
ARCHIVO_CINTA = "cinta.txt"
MODO_DECIMAL_FLOTANTE = "F"
MODO_DECIMAL_DOS = "2"
MODO_DECIMAL_TRES = "3"
MODO_DECIMAL_CUATRO = "4"
TECLAS_MODO_DECIMAL = {
    "f": MODO_DECIMAL_FLOTANTE,
    "F": MODO_DECIMAL_FLOTANTE,
    "d": MODO_DECIMAL_DOS,
    "D": MODO_DECIMAL_DOS,
    "t": MODO_DECIMAL_TRES,
    "T": MODO_DECIMAL_TRES,
    "c": MODO_DECIMAL_CUATRO,
    "C": MODO_DECIMAL_CUATRO,
}
TECLAS_IMPUESTO = {"i", "I", "u", "U", "r", "R"}
TECLAS_PORCENTAJE = {"p", "P"}
TECLAS_COMERCIALES = {"k", "K", "l", "L", "h", "H"}


def nueva_calculadora(ruta_log=ARCHIVO_LOG_DETALLADO, ruta_cinta=ARCHIVO_CINTA):
    return {
        "estado": ESTADO_APAGADA,
        "display": "",
        "operando_actual": "",
        "acumulado": "",
        "acumulado_multiplicativo": "",
        "operador_pendiente": "",
        "operador_subtotal": "+",
        "gran_total": "0",
        "ultimo_subtotal": "",
        "ultimo_gran_total": "",
        "modo_decimal": MODO_DECIMAL_DOS,
        "tasa_impuesto": "16",
        "editando_tasa_impuesto": False,
        "buffer_tasa_impuesto": "",
        "ultimo_impuesto": "",
        "memoria": "0",
        "valor_cost": "",
        "valor_sell": "",
        "valor_mar": "",
        "valor_disponible_para_funcion": False,
        "detalle_operando_cinta": "",
        "ruta_log": ruta_log,
        "ruta_cinta": ruta_cinta,
    }


def encender(calculadora):
    reiniciar_operacion(calculadora)
    calculadora["gran_total"] = "0"
    calculadora["ultimo_subtotal"] = ""
    calculadora["ultimo_gran_total"] = ""
    registrar_log(calculadora, "encender")
    registrar_cinta(calculadora, encabezado_cinta("encendida"))


def apagar(calculadora):
    registrar_log(calculadora, "apagar")
    registrar_cinta(calculadora, encabezado_cinta("apagada"))
    calculadora["estado"] = ESTADO_APAGADA
    calculadora["display"] = ""
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = ""
    calculadora["acumulado_multiplicativo"] = ""
    calculadora["operador_pendiente"] = ""
    calculadora["detalle_operando_cinta"] = ""


def presionar_tecla(calculadora, tecla):
    if len(tecla) != 1:
        raise ValueError("La tecla debe ser un unico caracter.")

    if calculadora["estado"] == ESTADO_APAGADA:
        registrar_log(
            calculadora,
            "error",
            "tecla=" + tecla + " motivo=calculadora_apagada",
        )
        raise ValueError("La calculadora esta apagada.")

    estado_antes = describir_estado(calculadora)

    try:
        if calculadora["editando_tasa_impuesto"]:
            manejar_captura_tasa_impuesto(calculadora, tecla)
        elif tecla in {"e", "E"}:
            borrar_entrada(calculadora)
        elif tecla in {"a", "A"}:
            borrar_todo(calculadora)
        elif tecla in TECLAS_MODO_DECIMAL:
            cambiar_modo_decimal(calculadora, TECLAS_MODO_DECIMAL[tecla])
        elif tecla in {"r", "R"}:
            iniciar_captura_tasa_impuesto(calculadora)
        elif tecla in {"i", "I"}:
            sumar_impuesto(calculadora)
        elif tecla in {"u", "U"}:
            restar_impuesto(calculadora)
        elif tecla in TECLAS_PORCENTAJE:
            aplicar_porcentaje(calculadora)
        elif tecla in {"k", "K"}:
            manejar_funcion_comercial(calculadora, "cost")
        elif tecla in {"l", "L"}:
            manejar_funcion_comercial(calculadora, "sell")
        elif tecla in {"h", "H"}:
            manejar_funcion_comercial(calculadora, "mar")
        elif tecla in {"m", "M"}:
            leer_memoria(calculadora)
        elif tecla in {"n", "N"}:
            sumar_a_memoria(calculadora)
        elif tecla in {"v", "V"}:
            restar_de_memoria(calculadora)
        elif tecla in {"x", "X"}:
            limpiar_memoria(calculadora)
        elif tecla in {"s", "S"}:
            subtotalizar(calculadora)
        elif tecla in {"g", "G"}:
            gran_totalizar(calculadora)
        elif calculadora["estado"] == ESTADO_ENCENDIDA_ESPERANDO_TYPING:
            manejar_encendida_esperando_typing(calculadora, tecla)
        elif calculadora["estado"] == ESTADO_TYPING_OPERANDO:
            manejar_typing_operando(calculadora, tecla)
        elif calculadora["estado"] == ESTADO_OPERADOR_PENDIENTE:
            manejar_operador_pendiente(calculadora, tecla)
        elif calculadora["estado"] == ESTADO_RESULTADO_EN_DISPLAY:
            manejar_resultado_en_display(calculadora, tecla)
        else:
            raise ValueError("Estado no soportado.")
    except ValueError as error:
        registrar_log(
            calculadora,
            "error",
            "tecla=" + tecla + " antes=" + estado_antes + " motivo=" + str(error),
        )
        raise

    registrar_log(
        calculadora,
        "tecla",
        "tecla=" + tecla
        + " antes=" + estado_antes
        + " despues=" + describir_estado(calculadora),
    )


def es_operador(tecla):
    return tecla in {"+", "-", "*", "/"}


def es_operador_aditivo(tecla):
    return tecla in {"+", "-"}


def es_operador_multiplicativo(tecla):
    return tecla in {"*", "/"}


def es_operando_incompleto(texto):
    return texto == "-"


def formatear_decimal(valor):
    texto = format(valor.normalize(), "f")
    if texto == "-0":
        return "0"
    return texto


def obtener_plantilla_decimal(modo_decimal):
    if modo_decimal == MODO_DECIMAL_DOS:
        return Decimal("0.01")
    if modo_decimal == MODO_DECIMAL_TRES:
        return Decimal("0.001")
    if modo_decimal == MODO_DECIMAL_CUATRO:
        return Decimal("0.0001")
    return None


def aplicar_modo_decimal(calculadora, valor):
    valor_decimal = Decimal(valor)
    plantilla = obtener_plantilla_decimal(calculadora["modo_decimal"])
    if plantilla is None:
        return formatear_decimal(valor_decimal)
    return format(valor_decimal.quantize(plantilla, rounding=ROUND_HALF_UP), "f")


def formatear_miles_parte_entera(texto):
    if texto == "":
        return "0"

    signo = ""
    if texto.startswith("-"):
        signo = "-"
        texto = texto[1:]

    grupos = []
    while len(texto) > 3:
        grupos.append(texto[-3:])
        texto = texto[:-3]
    grupos.append(texto or "0")
    return signo + ",".join(reversed(grupos))


def formatear_operando_visible(texto):
    if texto in {"", "0"}:
        return "0"
    if texto == "-":
        return "-"

    signo = ""
    if texto.startswith("-"):
        signo = "-"
        texto = texto[1:]

    if "." in texto:
        entero, fraccion = texto.split(".", 1)
        entero_visible = formatear_miles_parte_entera(signo + (entero or "0"))
        return entero_visible + "." + fraccion

    return formatear_miles_parte_entera(signo + texto)


def formatear_valor_visible(calculadora, valor, forzar_fijo=True):
    texto = valor
    if texto == "":
        texto = "0"

    if forzar_fijo:
        texto = aplicar_modo_decimal(calculadora, texto)
    else:
        texto = formatear_decimal(Decimal(texto))

    signo = ""
    if texto.startswith("-"):
        signo = "-"
        texto = texto[1:]

    if "." in texto:
        entero, fraccion = texto.split(".", 1)
        return formatear_miles_parte_entera(signo + entero) + "." + fraccion

    return formatear_miles_parte_entera(signo + texto)


def obtener_display_visible(calculadora):
    if calculadora["editando_tasa_impuesto"]:
        return "TASA " + formatear_operando_visible(
            calculadora["buffer_tasa_impuesto"] or "0"
        ) + "%"
    if calculadora["estado"] == ESTADO_TYPING_OPERANDO and calculadora["operando_actual"] != "":
        return formatear_operando_visible(calculadora["operando_actual"])
    return formatear_valor_visible(calculadora, calculadora["display"] or "0")


def obtener_tasa_impuesto_decimal(calculadora):
    return Decimal(calculadora["tasa_impuesto"]) / Decimal("100")


def obtener_valor_actual_para_impuesto(calculadora):
    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        if es_operando_incompleto(calculadora["operando_actual"]):
            raise ValueError("Falta completar el operando negativo.")
        if calculadora["operando_actual"] != "":
            return calculadora["operando_actual"]
    return obtener_subtotal_actual(calculadora, registrar=False)


def obtener_valor_actual_para_memoria(calculadora):
    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        if es_operando_incompleto(calculadora["operando_actual"]):
            raise ValueError("Falta completar el operando negativo.")
        if calculadora["operando_actual"] != "":
            return calculadora["operando_actual"]
    return obtener_subtotal_actual(calculadora, registrar=False)


def obtener_valor_actual_para_funcion_comercial(calculadora):
    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        if es_operando_incompleto(calculadora["operando_actual"]):
            raise ValueError("Falta completar el operando negativo.")
        if calculadora["operando_actual"] != "":
            return calculadora["operando_actual"]

    if calculadora["display"] != "":
        return calculadora["display"]

    return "0"


def fijar_resultado(calculadora, resultado):
    calculadora["display"] = resultado
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = resultado
    calculadora["acumulado_multiplicativo"] = ""
    calculadora["operador_pendiente"] = ""
    calculadora["operador_subtotal"] = "+"
    calculadora["estado"] = ESTADO_RESULTADO_EN_DISPLAY
    calculadora["valor_disponible_para_funcion"] = True


def aplicar_resultado_transformacion(calculadora, resultado):
    if (
        calculadora["estado"] == ESTADO_TYPING_OPERANDO
        and calculadora["operador_pendiente"] != ""
    ):
        calculadora["operando_actual"] = resultado
        calculadora["display"] = resultado
        return

    fijar_resultado(calculadora, resultado)


def aplicar_recall_memoria(calculadora, valor):
    if calculadora["estado"] == ESTADO_OPERADOR_PENDIENTE:
        calculadora["operando_actual"] = valor
        calculadora["display"] = valor
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if calculadora["estado"] == ESTADO_TYPING_OPERANDO and calculadora["operador_pendiente"] != "":
        calculadora["operando_actual"] = valor
        calculadora["display"] = valor
        calculadora["valor_disponible_para_funcion"] = True
        return

    fijar_resultado(calculadora, valor)


def resolver_operacion(calculadora, izquierda, operador, derecha):
    valor_izquierdo = Decimal(izquierda)
    valor_derecho = Decimal(derecha)

    if operador == "+":
        return aplicar_modo_decimal(calculadora, valor_izquierdo + valor_derecho)

    if operador == "-":
        return aplicar_modo_decimal(calculadora, valor_izquierdo - valor_derecho)

    if operador == "*":
        return aplicar_modo_decimal(calculadora, valor_izquierdo * valor_derecho)

    if operador == "/":
        if valor_derecho == 0:
            raise ValueError("No se puede dividir entre cero.")
        return aplicar_modo_decimal(calculadora, valor_izquierdo / valor_derecho)

    raise ValueError("Operador no soportado.")


def manejar_encendida_esperando_typing(calculadora, tecla):
    if tecla == "-":
        calculadora["operando_actual"] = "-"
        calculadora["display"] = "-"
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if tecla.isdigit():
        calculadora["detalle_operando_cinta"] = ""
        calculadora["operando_actual"] = tecla
        calculadora["display"] = tecla
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if tecla == ".":
        calculadora["detalle_operando_cinta"] = ""
        calculadora["operando_actual"] = "0."
        calculadora["display"] = "0."
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    raise ValueError(
        "En encendida_esperando_typing solo se aceptan digitos, '.' o '-'."
    )


def manejar_typing_operando(calculadora, tecla):
    if tecla.isdigit():
        calculadora["detalle_operando_cinta"] = ""
        if calculadora["operando_actual"] == "-":
            calculadora["operando_actual"] = "-" + tecla
        elif calculadora["operando_actual"] == "0":
            calculadora["operando_actual"] = tecla
        elif calculadora["operando_actual"] == "-0":
            calculadora["operando_actual"] = "-" + tecla
        else:
            calculadora["operando_actual"] += tecla
        calculadora["display"] = calculadora["operando_actual"]
        calculadora["valor_disponible_para_funcion"] = True
        return

    if tecla == ".":
        calculadora["detalle_operando_cinta"] = ""
        if "." in calculadora["operando_actual"]:
            raise ValueError("El operando actual ya tiene punto decimal.")
        if calculadora["operando_actual"] == "-":
            calculadora["operando_actual"] = "-0."
        elif calculadora["operando_actual"] == "":
            calculadora["operando_actual"] = "0."
        else:
            calculadora["operando_actual"] += "."
        calculadora["display"] = calculadora["operando_actual"]
        calculadora["valor_disponible_para_funcion"] = True
        return

    if es_operador_aditivo(tecla):
        preparar_o_encadenar_adicion(calculadora, tecla)
        return

    if es_operador_multiplicativo(tecla):
        preparar_o_encadenar_multiplicacion(calculadora, tecla)
        return

    if tecla == "=":
        cerrar_operacion(calculadora)
        return

    raise ValueError("Tecla no soportada en typing_operando.")


def manejar_operador_pendiente(calculadora, tecla):
    if tecla == "-":
        calculadora["detalle_operando_cinta"] = ""
        calculadora["operando_actual"] = "-"
        calculadora["display"] = "-"
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if tecla.isdigit():
        calculadora["detalle_operando_cinta"] = ""
        calculadora["operando_actual"] = tecla
        calculadora["display"] = tecla
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if tecla == ".":
        calculadora["detalle_operando_cinta"] = ""
        calculadora["operando_actual"] = "0."
        calculadora["display"] = "0."
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if es_operador_aditivo(tecla) and es_operador_aditivo(calculadora["operador_pendiente"]):
        calculadora["operador_pendiente"] = tecla
        calculadora["operador_subtotal"] = tecla
        return

    if es_operador_multiplicativo(tecla) and es_operador_multiplicativo(
        calculadora["operador_pendiente"]
    ):
        calculadora["operador_pendiente"] = tecla
        return

    if tecla == "=":
        raise ValueError("Falta capturar el segundo operando.")

    raise ValueError("Tecla no soportada mientras hay un operador pendiente.")


def manejar_resultado_en_display(calculadora, tecla):
    if tecla.isdigit():
        reiniciar_operacion(calculadora)
        calculadora["detalle_operando_cinta"] = ""
        calculadora["operando_actual"] = tecla
        calculadora["display"] = tecla
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if tecla == ".":
        reiniciar_operacion(calculadora)
        calculadora["detalle_operando_cinta"] = ""
        calculadora["operando_actual"] = "0."
        calculadora["display"] = "0."
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        calculadora["valor_disponible_para_funcion"] = True
        return

    if es_operador_aditivo(tecla):
        calculadora["acumulado"] = calculadora["display"]
        calculadora["operador_subtotal"] = tecla
        calculadora["operador_pendiente"] = tecla
        calculadora["operando_actual"] = ""
        calculadora["acumulado_multiplicativo"] = ""
        calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE
        calculadora["valor_disponible_para_funcion"] = False
        return

    if es_operador_multiplicativo(tecla):
        calculadora["acumulado"] = ""
        calculadora["acumulado_multiplicativo"] = calculadora["display"]
        calculadora["operador_subtotal"] = "+"
        calculadora["operador_pendiente"] = tecla
        calculadora["operando_actual"] = ""
        calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE
        calculadora["valor_disponible_para_funcion"] = False
        return

    if tecla == "=":
        return

    raise ValueError("Tecla no soportada en resultado_en_display.")


def preparar_o_encadenar_adicion(calculadora, operador):
    termino = resolver_termino_actual(calculadora, registrar=True)

    if calculadora["acumulado"] == "":
        nuevo_subtotal = aplicar_modo_decimal(calculadora, termino)
    else:
        nuevo_subtotal = resolver_y_registrar(
            calculadora,
            calculadora["acumulado"],
            calculadora["operador_subtotal"],
            termino,
        )

    calculadora["acumulado"] = nuevo_subtotal
    calculadora["acumulado_multiplicativo"] = ""
    calculadora["operador_subtotal"] = operador
    calculadora["operador_pendiente"] = operador
    calculadora["operando_actual"] = ""
    calculadora["display"] = nuevo_subtotal
    calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE


def preparar_o_encadenar_multiplicacion(calculadora, operador):
    if calculadora["operador_pendiente"] in {"*", "/"}:
        termino = resolver_termino_actual(calculadora, registrar=True)
        calculadora["acumulado_multiplicativo"] = termino
    else:
        calculadora["acumulado_multiplicativo"] = calculadora["operando_actual"]
        calculadora["operando_actual"] = ""
        calculadora["display"] = calculadora["acumulado_multiplicativo"]

    calculadora["operador_pendiente"] = operador
    calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE


def cerrar_operacion(calculadora):
    subtotal = obtener_subtotal_actual(calculadora, registrar=True)
    calculadora["display"] = subtotal
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = subtotal
    calculadora["acumulado_multiplicativo"] = ""
    calculadora["operador_pendiente"] = ""
    calculadora["operador_subtotal"] = "+"
    calculadora["estado"] = ESTADO_RESULTADO_EN_DISPLAY


def subtotalizar(calculadora):
    subtotal = obtener_subtotal_actual(calculadora, registrar=True)
    gran_total = sumar_a_gran_total(calculadora, calculadora["gran_total"], subtotal)
    calculadora["ultimo_subtotal"] = subtotal
    calculadora["gran_total"] = gran_total
    registrar_cinta(
        calculadora,
        "SUBTOTAL = " + formatear_valor_visible(calculadora, subtotal),
    )
    registrar_log(
        calculadora,
        "subtotal",
        "subtotal=" + subtotal + " gran_total=" + gran_total,
    )
    reiniciar_operacion(calculadora)


def gran_totalizar(calculadora):
    gran_total = calculadora["gran_total"]
    calculadora["ultimo_gran_total"] = gran_total
    registrar_cinta(
        calculadora,
        "GRAN TOTAL = " + formatear_valor_visible(calculadora, gran_total),
    )
    registrar_log(calculadora, "gran_total", "gran_total=" + gran_total)
    reiniciar_operacion(calculadora)
    calculadora["gran_total"] = "0"
    calculadora["ultimo_subtotal"] = ""
    registrar_cinta(calculadora, encabezado_cinta("nueva_calculadora"))


def sumar_impuesto(calculadora):
    base = obtener_valor_actual_para_impuesto(calculadora)
    factor = Decimal("1") + obtener_tasa_impuesto_decimal(calculadora)
    total = aplicar_modo_decimal(calculadora, Decimal(base) * factor)
    impuesto = aplicar_modo_decimal(calculadora, Decimal(total) - Decimal(base))
    calculadora["ultimo_impuesto"] = impuesto
    aplicar_resultado_transformacion(calculadora, total)
    registrar_cinta(
        calculadora,
        "IVA+ "
        + formatear_valor_visible(calculadora, base)
        + " @ "
        + formatear_valor_visible(calculadora, calculadora["tasa_impuesto"])
        + "% = "
        + formatear_valor_visible(calculadora, total)
        + " (IVA "
        + formatear_valor_visible(calculadora, impuesto)
        + ")",
    )
    registrar_log(
        calculadora,
        "impuesto_suma",
        "base=" + base + " tasa=" + calculadora["tasa_impuesto"]
        + " impuesto=" + impuesto + " total=" + total,
    )


def restar_impuesto(calculadora):
    total = obtener_valor_actual_para_impuesto(calculadora)
    factor = Decimal("1") + obtener_tasa_impuesto_decimal(calculadora)
    base = aplicar_modo_decimal(calculadora, Decimal(total) / factor)
    impuesto = aplicar_modo_decimal(calculadora, Decimal(total) - Decimal(base))
    calculadora["ultimo_impuesto"] = impuesto
    aplicar_resultado_transformacion(calculadora, base)
    registrar_cinta(
        calculadora,
        "IVA- "
        + formatear_valor_visible(calculadora, total)
        + " @ "
        + formatear_valor_visible(calculadora, calculadora["tasa_impuesto"])
        + "% = "
        + formatear_valor_visible(calculadora, base)
        + " (IVA "
        + formatear_valor_visible(calculadora, impuesto)
        + ")",
    )
    registrar_log(
        calculadora,
        "impuesto_resta",
        "total=" + total + " tasa=" + calculadora["tasa_impuesto"]
        + " impuesto=" + impuesto + " base=" + base,
    )


def aplicar_porcentaje(calculadora):
    if calculadora["estado"] == ESTADO_OPERADOR_PENDIENTE:
        raise ValueError("Falta capturar el operando para aplicar porcentaje.")

    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        if es_operando_incompleto(calculadora["operando_actual"]):
            raise ValueError("Falta completar el operando negativo.")
        if calculadora["operando_actual"] == "":
            raise ValueError("Falta capturar el operando para aplicar porcentaje.")
        operando = calculadora["operando_actual"]
    else:
        operando = obtener_subtotal_actual(calculadora, registrar=False)

    if (
        calculadora["estado"] == ESTADO_TYPING_OPERANDO
        and es_operador_aditivo(calculadora["operador_pendiente"])
        and calculadora["acumulado"] != ""
    ):
        base = calculadora["acumulado"]
        resultado = aplicar_modo_decimal(
            calculadora,
            Decimal(base) * Decimal(operando) / Decimal("100"),
        )
        detalle_cinta = (
            "PORC "
            + formatear_valor_visible(calculadora, operando)
            + "% DE "
            + formatear_valor_visible(calculadora, base)
            + " = "
            + formatear_valor_visible(calculadora, resultado)
        )
        calculadora["detalle_operando_cinta"] = (
            formatear_valor_visible(calculadora, operando)
            + "% DE "
            + formatear_valor_visible(calculadora, base)
        )
    else:
        base = ""
        resultado = aplicar_modo_decimal(calculadora, Decimal(operando) / Decimal("100"))
        detalle_cinta = (
            "PORC "
            + formatear_valor_visible(calculadora, operando)
            + "% = "
            + formatear_valor_visible(calculadora, resultado)
        )
        if calculadora["estado"] == ESTADO_TYPING_OPERANDO and calculadora["operador_pendiente"] in {"*", "/"}:
            calculadora["detalle_operando_cinta"] = (
                formatear_valor_visible(calculadora, operando) + "%"
            )
        else:
            calculadora["detalle_operando_cinta"] = ""

    aplicar_resultado_transformacion(calculadora, resultado)
    registrar_cinta(calculadora, detalle_cinta)
    registrar_log(
        calculadora,
        "porcentaje",
        "operando=" + operando + " base=" + base + " resultado=" + resultado,
    )


def sumar_a_memoria(calculadora):
    valor = obtener_valor_actual_para_memoria(calculadora)
    memoria_nueva = aplicar_modo_decimal(
        calculadora,
        Decimal(calculadora["memoria"]) + Decimal(valor),
    )
    calculadora["memoria"] = memoria_nueva
    registrar_cinta(
        calculadora,
        "M+ "
        + formatear_valor_visible(calculadora, valor)
        + " => "
        + formatear_valor_visible(calculadora, memoria_nueva),
    )
    registrar_log(
        calculadora,
        "memoria_suma",
        "valor=" + valor + " memoria=" + memoria_nueva,
    )


def restar_de_memoria(calculadora):
    valor = obtener_valor_actual_para_memoria(calculadora)
    memoria_nueva = aplicar_modo_decimal(
        calculadora,
        Decimal(calculadora["memoria"]) - Decimal(valor),
    )
    calculadora["memoria"] = memoria_nueva
    registrar_cinta(
        calculadora,
        "M- "
        + formatear_valor_visible(calculadora, valor)
        + " => "
        + formatear_valor_visible(calculadora, memoria_nueva),
    )
    registrar_log(
        calculadora,
        "memoria_resta",
        "valor=" + valor + " memoria=" + memoria_nueva,
    )


def leer_memoria(calculadora):
    valor = aplicar_modo_decimal(calculadora, calculadora["memoria"])
    aplicar_recall_memoria(calculadora, valor)
    registrar_cinta(
        calculadora,
        "MR = " + formatear_valor_visible(calculadora, valor),
    )
    registrar_log(calculadora, "memoria_leer", "memoria=" + valor)


def limpiar_memoria(calculadora):
    calculadora["memoria"] = "0"
    registrar_cinta(calculadora, "MC")
    registrar_log(calculadora, "memoria_limpiar")


def manejar_funcion_comercial(calculadora, campo):
    if calculadora["valor_disponible_para_funcion"]:
        valor = aplicar_modo_decimal(
            calculadora,
            obtener_valor_actual_para_funcion_comercial(calculadora),
        )
        asignar_valor_funcion_comercial(calculadora, campo, valor)
        fijar_resultado(calculadora, valor)
        calculadora["valor_disponible_para_funcion"] = False
        registrar_cinta(
            calculadora,
            etiqueta_funcion_comercial(campo) + " = " + formatear_valor_visible(calculadora, valor),
        )
        registrar_log(
            calculadora,
            "funcion_comercial_guardar",
            "campo=" + campo + " valor=" + valor,
        )
        return

    resultado = calcular_funcion_comercial(calculadora, campo)
    asignar_valor_funcion_comercial(calculadora, campo, resultado)
    fijar_resultado(calculadora, resultado)
    calculadora["valor_disponible_para_funcion"] = False
    registrar_cinta(
        calculadora,
        describir_calculo_funcion_comercial(calculadora, campo, resultado),
    )
    registrar_log(
        calculadora,
        "funcion_comercial_calcular",
        "campo=" + campo + " resultado=" + resultado,
    )


def etiqueta_funcion_comercial(campo):
    if campo == "cost":
        return "COST"
    if campo == "sell":
        return "SELL"
    if campo == "mar":
        return "MAR"
    raise ValueError("Campo comercial no soportado.")


def asignar_valor_funcion_comercial(calculadora, campo, valor):
    if campo == "cost":
        calculadora["valor_cost"] = valor
        return
    if campo == "sell":
        calculadora["valor_sell"] = valor
        return
    if campo == "mar":
        calculadora["valor_mar"] = valor
        return
    raise ValueError("Campo comercial no soportado.")


def calcular_funcion_comercial(calculadora, campo):
    costo = calculadora["valor_cost"]
    venta = calculadora["valor_sell"]
    margen = calculadora["valor_mar"]

    if campo == "cost":
        if venta == "" or margen == "":
            raise ValueError("Para calcular COST se requieren SELL y MAR.")
        if Decimal(margen) >= Decimal("100"):
            raise ValueError("El margen debe ser menor a 100.")
        return aplicar_modo_decimal(
            calculadora,
            Decimal(venta) * (Decimal("1") - (Decimal(margen) / Decimal("100"))),
        )

    if campo == "sell":
        if costo == "" or margen == "":
            raise ValueError("Para calcular SELL se requieren COST y MAR.")
        if Decimal(margen) >= Decimal("100"):
            raise ValueError("El margen debe ser menor a 100.")
        return aplicar_modo_decimal(
            calculadora,
            Decimal(costo) / (Decimal("1") - (Decimal(margen) / Decimal("100"))),
        )

    if campo == "mar":
        if costo == "" or venta == "":
            raise ValueError("Para calcular MAR se requieren COST y SELL.")
        if Decimal(venta) == 0:
            raise ValueError("SELL no puede ser cero para calcular MAR.")
        return aplicar_modo_decimal(
            calculadora,
            ((Decimal(venta) - Decimal(costo)) / Decimal(venta)) * Decimal("100"),
        )

    raise ValueError("Campo comercial no soportado.")


def describir_calculo_funcion_comercial(calculadora, campo, resultado):
    if campo == "cost":
        return (
            "COST = "
            + formatear_valor_visible(calculadora, resultado)
            + " (SELL "
            + formatear_valor_visible(calculadora, calculadora["valor_sell"])
            + ", MAR "
            + formatear_valor_visible(calculadora, calculadora["valor_mar"])
            + "%)"
        )

    if campo == "sell":
        return (
            "SELL = "
            + formatear_valor_visible(calculadora, resultado)
            + " (COST "
            + formatear_valor_visible(calculadora, calculadora["valor_cost"])
            + ", MAR "
            + formatear_valor_visible(calculadora, calculadora["valor_mar"])
            + "%)"
        )

    if campo == "mar":
        return (
            "MAR = "
            + formatear_valor_visible(calculadora, resultado)
            + "% (COST "
            + formatear_valor_visible(calculadora, calculadora["valor_cost"])
            + ", SELL "
            + formatear_valor_visible(calculadora, calculadora["valor_sell"])
            + ")"
        )

    raise ValueError("Campo comercial no soportado.")


def obtener_subtotal_actual(calculadora, registrar=False):
    if calculadora["estado"] == ESTADO_ENCENDIDA_ESPERANDO_TYPING:
        if calculadora["acumulado"] != "":
            return calculadora["acumulado"]
        return "0"

    if calculadora["estado"] == ESTADO_OPERADOR_PENDIENTE:
        if es_operador_aditivo(calculadora["operador_pendiente"]):
            if calculadora["acumulado"] != "":
                return calculadora["acumulado"]
            if calculadora["display"] != "":
                return calculadora["display"]
            return "0"

        if es_operador_multiplicativo(calculadora["operador_pendiente"]):
            termino = calculadora["acumulado_multiplicativo"] or "0"
            if calculadora["acumulado"] == "":
                return termino
            if registrar:
                return resolver_y_registrar(
                    calculadora,
                    calculadora["acumulado"],
                    calculadora["operador_subtotal"],
                    termino,
                )
            return resolver_operacion(
                calculadora,
                calculadora["acumulado"],
                calculadora["operador_subtotal"],
                termino,
            )

    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        termino = resolver_termino_actual(calculadora, registrar=registrar)
        if calculadora["acumulado"] == "":
            return termino
        if registrar:
            return resolver_y_registrar(
                calculadora,
                calculadora["acumulado"],
                calculadora["operador_subtotal"],
                termino,
            )
        return resolver_operacion(
            calculadora,
            calculadora["acumulado"],
            calculadora["operador_subtotal"],
            termino,
        )

    if calculadora["estado"] == ESTADO_RESULTADO_EN_DISPLAY:
        return calculadora["display"] or "0"

    raise ValueError("No se pudo obtener subtotal.")


def resolver_termino_actual(calculadora, registrar=False):
    if calculadora["operador_pendiente"] in {"*", "/"}:
        if calculadora["operando_actual"] == "":
            if calculadora["acumulado_multiplicativo"] != "":
                return calculadora["acumulado_multiplicativo"]
            raise ValueError("Falta capturar el segundo operando.")

        if es_operando_incompleto(calculadora["operando_actual"]):
            raise ValueError("Falta completar el operando negativo.")

        izquierda = calculadora["acumulado_multiplicativo"]
        if izquierda == "":
            izquierda = calculadora["operando_actual"]

        if registrar:
            resultado = resolver_y_registrar(
                calculadora,
                izquierda,
                calculadora["operador_pendiente"],
                calculadora["operando_actual"],
            )
        else:
            resultado = resolver_operacion(
                calculadora,
                izquierda,
                calculadora["operador_pendiente"],
                calculadora["operando_actual"],
            )

        calculadora["acumulado_multiplicativo"] = resultado
        calculadora["operando_actual"] = ""
        calculadora["display"] = resultado
        return resultado

    if es_operando_incompleto(calculadora["operando_actual"]):
        raise ValueError("Falta completar el operando negativo.")

    if calculadora["operando_actual"] != "":
        return calculadora["operando_actual"]

    if calculadora["acumulado_multiplicativo"] != "":
        return calculadora["acumulado_multiplicativo"]

    if calculadora["display"] != "":
        return calculadora["display"]

    return "0"


def resolver_y_registrar(calculadora, izquierda, operador, derecha):
    resultado = resolver_operacion(calculadora, izquierda, operador, derecha)
    registrar_operacion_en_cinta(calculadora, izquierda, operador, derecha, resultado)
    registrar_log(
        calculadora,
        "resolver",
        "expresion=" + izquierda + " " + operador + " " + derecha
        + " resultado=" + resultado,
    )
    return resultado


def sumar_a_gran_total(calculadora, gran_total, subtotal):
    return aplicar_modo_decimal(calculadora, Decimal(gran_total) + Decimal(subtotal))


def cambiar_modo_decimal(calculadora, modo_decimal):
    calculadora["modo_decimal"] = modo_decimal
    registrar_cinta(calculadora, "MODO DECIMAL = " + modo_decimal)
    registrar_log(calculadora, "modo_decimal", "modo_decimal=" + modo_decimal)


def iniciar_captura_tasa_impuesto(calculadora):
    calculadora["editando_tasa_impuesto"] = True
    calculadora["buffer_tasa_impuesto"] = calculadora["tasa_impuesto"]
    registrar_log(
        calculadora,
        "tasa_impuesto_editar",
        "tasa_impuesto=" + calculadora["tasa_impuesto"],
    )


def manejar_captura_tasa_impuesto(calculadora, tecla):
    if tecla in {"a", "A"}:
        calculadora["editando_tasa_impuesto"] = False
        calculadora["buffer_tasa_impuesto"] = ""
        borrar_todo(calculadora)
        return

    if tecla in {"r", "R"}:
        calculadora["editando_tasa_impuesto"] = False
        calculadora["buffer_tasa_impuesto"] = ""
        registrar_log(calculadora, "tasa_impuesto_cancelar")
        return

    if tecla in {"e", "E"}:
        calculadora["buffer_tasa_impuesto"] = "0"
        return

    if tecla.isdigit():
        if calculadora["buffer_tasa_impuesto"] in {"", "0"}:
            calculadora["buffer_tasa_impuesto"] = tecla
        else:
            calculadora["buffer_tasa_impuesto"] += tecla
        return

    if tecla == ".":
        if "." in calculadora["buffer_tasa_impuesto"]:
            raise ValueError("La tasa de impuesto ya tiene punto decimal.")
        if calculadora["buffer_tasa_impuesto"] == "":
            calculadora["buffer_tasa_impuesto"] = "0."
        else:
            calculadora["buffer_tasa_impuesto"] += "."
        return

    if tecla == "=":
        buffer = calculadora["buffer_tasa_impuesto"] or "0"
        if buffer.endswith("."):
            buffer += "0"
        tasa = Decimal(buffer)
        if tasa < 0:
            raise ValueError("La tasa de impuesto no puede ser negativa.")
        calculadora["tasa_impuesto"] = formatear_decimal(tasa)
        calculadora["editando_tasa_impuesto"] = False
        calculadora["buffer_tasa_impuesto"] = ""
        registrar_cinta(
            calculadora,
            "TASA IMPUESTO = "
            + formatear_valor_visible(calculadora, calculadora["tasa_impuesto"])
            + "%",
        )
        registrar_log(
            calculadora,
            "tasa_impuesto",
            "tasa_impuesto=" + calculadora["tasa_impuesto"],
        )
        return

    raise ValueError("Mientras editas tasa solo se aceptan digitos, '.', '=', 'e' o 'r'.")


def borrar_entrada(calculadora):
    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        calculadora["operando_actual"] = ""
        calculadora["display"] = "0"
        if calculadora["operador_pendiente"] != "":
            calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE
        else:
            calculadora["estado"] = ESTADO_ENCENDIDA_ESPERANDO_TYPING
    elif calculadora["estado"] == ESTADO_OPERADOR_PENDIENTE:
        calculadora["operando_actual"] = ""
        calculadora["display"] = "0"
    elif calculadora["estado"] == ESTADO_RESULTADO_EN_DISPLAY:
        reiniciar_operacion(calculadora)
    else:
        calculadora["display"] = "0"
        calculadora["estado"] = ESTADO_ENCENDIDA_ESPERANDO_TYPING

    registrar_cinta(calculadora, "E")
    registrar_log(calculadora, "borrar_entrada")
    calculadora["detalle_operando_cinta"] = ""


def borrar_todo(calculadora):
    reiniciar_operacion(calculadora)
    calculadora["gran_total"] = "0"
    calculadora["ultimo_subtotal"] = ""
    calculadora["ultimo_gran_total"] = ""
    calculadora["ultimo_impuesto"] = ""
    calculadora["valor_cost"] = ""
    calculadora["valor_sell"] = ""
    calculadora["valor_mar"] = ""
    calculadora["editando_tasa_impuesto"] = False
    calculadora["buffer_tasa_impuesto"] = ""
    calculadora["detalle_operando_cinta"] = ""
    registrar_cinta(calculadora, "A")
    registrar_cinta(calculadora, encabezado_cinta("nueva_calculadora"))
    registrar_log(calculadora, "borrar_todo")


def reiniciar_operacion(calculadora):
    calculadora["estado"] = ESTADO_ENCENDIDA_ESPERANDO_TYPING
    calculadora["display"] = "0"
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = ""
    calculadora["acumulado_multiplicativo"] = ""
    calculadora["operador_pendiente"] = ""
    calculadora["operador_subtotal"] = "+"
    calculadora["detalle_operando_cinta"] = ""
    calculadora["valor_disponible_para_funcion"] = False


def mostrar_estado(calculadora):
    print()
    print("Estado:", calculadora["estado"])
    print("Modo decimal:", calculadora["modo_decimal"])
    print("Memoria:", formatear_valor_visible(calculadora, calculadora["memoria"]))
    print(
        "COST/SELL/MAR:",
        (formatear_valor_visible(calculadora, calculadora["valor_cost"]) if calculadora["valor_cost"] else "-"),
        "/",
        (formatear_valor_visible(calculadora, calculadora["valor_sell"]) if calculadora["valor_sell"] else "-"),
        "/",
        (formatear_valor_visible(calculadora, calculadora["valor_mar"]) if calculadora["valor_mar"] else "-"),
    )
    print(
        "Tasa impuesto:",
        formatear_valor_visible(calculadora, calculadora["tasa_impuesto"]) + "%",
    )
    print("Display:", obtener_display_visible(calculadora))
    print(
        "Acumulado:",
        formatear_valor_visible(calculadora, calculadora["acumulado"])
        if calculadora["acumulado"] != ""
        else "-",
    )
    print(
        "Acumulado multiplicativo:",
        formatear_valor_visible(calculadora, calculadora["acumulado_multiplicativo"], False)
        if calculadora["acumulado_multiplicativo"] != ""
        else "-",
    )
    print("Operador pendiente:", calculadora["operador_pendiente"] or "-")
    print("Gran total:", formatear_valor_visible(calculadora, calculadora["gran_total"]))
    print(
        "Ultimo impuesto:",
        formatear_valor_visible(calculadora, calculadora["ultimo_impuesto"])
        if calculadora["ultimo_impuesto"] != ""
        else "-",
    )


def leer_tecla():
    if not sys.stdin.isatty() or termios is None or tty is None:
        entrada = input("tecla> ").strip()
        if entrada == "":
            return ""
        return entrada[0]

    descriptor = sys.stdin.fileno()
    configuracion_anterior = termios.tcgetattr(descriptor)

    try:
        tty.setraw(descriptor)
        tecla = sys.stdin.read(1)
    finally:
        termios.tcsetattr(descriptor, termios.TCSADRAIN, configuracion_anterior)

    if tecla in {"\r", "\n"}:
        return ""

    print(tecla)
    return tecla


def describir_estado(calculadora):
    return (
        "estado=" + calculadora["estado"]
        + ",display=" + calculadora["display"]
        + ",operando_actual=" + calculadora["operando_actual"]
        + ",acumulado=" + calculadora["acumulado"]
        + ",acumulado_multiplicativo=" + calculadora["acumulado_multiplicativo"]
        + ",operador_pendiente=" + calculadora["operador_pendiente"]
        + ",operador_subtotal=" + calculadora["operador_subtotal"]
        + ",gran_total=" + calculadora["gran_total"]
        + ",modo_decimal=" + calculadora["modo_decimal"]
        + ",memoria=" + calculadora["memoria"]
        + ",valor_cost=" + calculadora["valor_cost"]
        + ",valor_sell=" + calculadora["valor_sell"]
        + ",valor_mar=" + calculadora["valor_mar"]
        + ",tasa_impuesto=" + calculadora["tasa_impuesto"]
        + ",editando_tasa_impuesto=" + str(calculadora["editando_tasa_impuesto"])
    )


def encabezado_cinta(evento):
    return "--- " + marca_tiempo() + " " + evento + " ---"


def marca_tiempo():
    return datetime.now().isoformat(sep=" ", timespec="seconds")


def registrar_log(calculadora, accion, detalle=""):
    linea = "[" + marca_tiempo() + "] accion=" + accion
    if detalle != "":
        linea += " " + detalle
    escribir_linea(calculadora["ruta_log"], linea)


def registrar_cinta(calculadora, linea):
    escribir_linea(calculadora["ruta_cinta"], linea)


def registrar_operacion_en_cinta(calculadora, izquierda, operador, derecha, resultado):
    derecha_visible = formatear_valor_visible(calculadora, derecha)
    if calculadora["detalle_operando_cinta"] != "":
        derecha_visible = calculadora["detalle_operando_cinta"]
        calculadora["detalle_operando_cinta"] = ""

    registrar_cinta(
        calculadora,
        formatear_valor_visible(calculadora, izquierda)
        + " "
        + operador
        + " "
        + derecha_visible
        + " = "
        + formatear_valor_visible(calculadora, resultado),
    )


def escribir_linea(ruta, linea):
    directorio = os.path.dirname(ruta)
    if directorio != "":
        os.makedirs(directorio, exist_ok=True)

    with open(ruta, "a", encoding="utf-8") as archivo:
        archivo.write(linea + "\n")


def ejecutar_terminal():
    calculadora = nueva_calculadora()
    encender(calculadora)

    print("Calculadora sumadora contable")
    print("Estado inicial: encendida_esperando_typing")
    print("Usa teclas: 0-9 . + - * / = e a s g f d t c i u r p m n v x k l h")
    print("e borra la entrada actual")
    print("a borra todo menos memoria")
    print("f flotante, d 2 decimales, t 3 decimales, c 4 decimales")
    print("i suma impuesto, u deduce impuesto, r edita tasa")
    print("p aplica porcentaje")
    print("m memoria read, n memoria+, v memoria-, x memoria clean")
    print("k cost, l sell, h mar")
    print("En tasa: digitos y '.' capturan, '=' confirma, 'e' limpia, 'r' cancela")
    print("s subtotaliza y acumula al gran total")
    print("g imprime el gran total y reinicia en ceros")
    print("Cada tecla se procesa sin Enter")
    print("Usa q para salir")
    print("Log detallado:", calculadora["ruta_log"])
    print("Cinta:", calculadora["ruta_cinta"])

    while True:
        mostrar_estado(calculadora)
        print("tecla> ", end="", flush=True)
        entrada = leer_tecla()

        if entrada == "":
            continue

        if entrada.lower() == "q":
            apagar(calculadora)
            print("Calculadora apagada")
            break

        try:
            presionar_tecla(calculadora, entrada)
        except ValueError as error:
            print("Error:", error)


if __name__ == "__main__":
    ejecutar_terminal()
