import os
import sys
from datetime import datetime
from decimal import Decimal

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


def nueva_calculadora(ruta_log=ARCHIVO_LOG_DETALLADO, ruta_cinta=ARCHIVO_CINTA):
    return {
        "estado": ESTADO_APAGADA,
        "display": "",
        "operando_actual": "",
        "acumulado": "",
        "operador_pendiente": "",
        "gran_total": "0",
        "ultimo_subtotal": "",
        "ultimo_gran_total": "",
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
    calculadora["operador_pendiente"] = ""


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
        if tecla in {"s", "S"}:
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


def formatear_decimal(valor):
    texto = format(valor.normalize(), "f")
    if texto == "-0":
        return "0"
    return texto


def resolver_operacion(izquierda, operador, derecha):
    valor_izquierdo = Decimal(izquierda)
    valor_derecho = Decimal(derecha)

    if operador == "+":
        return formatear_decimal(valor_izquierdo + valor_derecho)

    if operador == "-":
        return formatear_decimal(valor_izquierdo - valor_derecho)

    if operador == "*":
        return formatear_decimal(valor_izquierdo * valor_derecho)

    if operador == "/":
        if valor_derecho == 0:
            raise ValueError("No se puede dividir entre cero.")
        return formatear_decimal(valor_izquierdo / valor_derecho)

    raise ValueError("Operador no soportado.")


def manejar_encendida_esperando_typing(calculadora, tecla):
    if tecla.isdigit():
        calculadora["operando_actual"] = tecla
        calculadora["display"] = tecla
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        return

    if tecla == ".":
        calculadora["operando_actual"] = "0."
        calculadora["display"] = "0."
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        return

    if tecla in {"C", "c"}:
        limpiar(calculadora)
        return

    raise ValueError(
        "En encendida_esperando_typing solo se aceptan digitos, '.' o 'C'."
    )


def manejar_typing_operando(calculadora, tecla):
    if tecla.isdigit():
        if calculadora["operando_actual"] == "0":
            calculadora["operando_actual"] = tecla
        else:
            calculadora["operando_actual"] += tecla
        calculadora["display"] = calculadora["operando_actual"]
        return

    if tecla == ".":
        if "." in calculadora["operando_actual"]:
            raise ValueError("El operando actual ya tiene punto decimal.")
        if calculadora["operando_actual"] == "":
            calculadora["operando_actual"] = "0."
        else:
            calculadora["operando_actual"] += "."
        calculadora["display"] = calculadora["operando_actual"]
        return

    if tecla in {"C", "c"}:
        limpiar(calculadora)
        return

    if es_operador(tecla):
        preparar_o_encadenar_operacion(calculadora, tecla)
        return

    if tecla == "=":
        cerrar_operacion(calculadora)
        return

    raise ValueError("Tecla no soportada en typing_operando.")


def manejar_operador_pendiente(calculadora, tecla):
    if tecla.isdigit():
        calculadora["operando_actual"] = tecla
        calculadora["display"] = tecla
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        return

    if tecla == ".":
        calculadora["operando_actual"] = "0."
        calculadora["display"] = "0."
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        return

    if tecla in {"C", "c"}:
        limpiar(calculadora)
        return

    if es_operador(tecla):
        calculadora["operador_pendiente"] = tecla
        return

    if tecla == "=":
        raise ValueError("Falta capturar el segundo operando.")

    raise ValueError("Tecla no soportada mientras hay un operador pendiente.")


def manejar_resultado_en_display(calculadora, tecla):
    if tecla.isdigit():
        calculadora["operando_actual"] = tecla
        calculadora["display"] = tecla
        calculadora["acumulado"] = ""
        calculadora["operador_pendiente"] = ""
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        return

    if tecla == ".":
        calculadora["operando_actual"] = "0."
        calculadora["display"] = "0."
        calculadora["acumulado"] = ""
        calculadora["operador_pendiente"] = ""
        calculadora["estado"] = ESTADO_TYPING_OPERANDO
        return

    if tecla in {"C", "c"}:
        limpiar(calculadora)
        return

    if es_operador(tecla):
        calculadora["acumulado"] = calculadora["display"]
        calculadora["operador_pendiente"] = tecla
        calculadora["operando_actual"] = ""
        calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE
        return

    if tecla == "=":
        return

    raise ValueError("Tecla no soportada en resultado_en_display.")


def preparar_o_encadenar_operacion(calculadora, operador):
    if calculadora["operador_pendiente"] == "":
        calculadora["acumulado"] = calculadora["operando_actual"]
    else:
        izquierda = calculadora["acumulado"]
        operador_actual = calculadora["operador_pendiente"]
        derecha = calculadora["operando_actual"]
        resultado = resolver_operacion(izquierda, operador_actual, derecha)
        registrar_operacion_en_cinta(
            calculadora,
            izquierda,
            operador_actual,
            derecha,
            resultado,
        )
        registrar_log(
            calculadora,
            "resolver",
            "expresion=" + izquierda + " " + operador_actual + " " + derecha
            + " resultado=" + resultado,
        )
        calculadora["acumulado"] = resultado
        calculadora["display"] = calculadora["acumulado"]

    calculadora["operador_pendiente"] = operador
    calculadora["operando_actual"] = ""
    calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE


def cerrar_operacion(calculadora):
    if calculadora["operador_pendiente"] == "":
        calculadora["display"] = calculadora["operando_actual"]
        calculadora["estado"] = ESTADO_RESULTADO_EN_DISPLAY
        return

    izquierda = calculadora["acumulado"]
    operador = calculadora["operador_pendiente"]
    derecha = calculadora["operando_actual"]
    resultado = resolver_operacion(izquierda, operador, derecha)
    registrar_operacion_en_cinta(calculadora, izquierda, operador, derecha, resultado)
    registrar_log(
        calculadora,
        "resolver",
        "expresion=" + izquierda + " " + operador + " " + derecha
        + " resultado=" + resultado,
    )
    calculadora["display"] = resultado
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = resultado
    calculadora["operador_pendiente"] = ""
    calculadora["estado"] = ESTADO_RESULTADO_EN_DISPLAY


def subtotalizar(calculadora):
    subtotal = obtener_subtotal_actual(calculadora)
    gran_total = sumar_a_gran_total(calculadora["gran_total"], subtotal)
    calculadora["ultimo_subtotal"] = subtotal
    calculadora["gran_total"] = gran_total
    registrar_cinta(calculadora, "SUBTOTAL = " + subtotal)
    registrar_log(
        calculadora,
        "subtotal",
        "subtotal=" + subtotal + " gran_total=" + gran_total,
    )
    reiniciar_operacion(calculadora)


def gran_totalizar(calculadora):
    gran_total = calculadora["gran_total"]
    calculadora["ultimo_gran_total"] = gran_total
    registrar_cinta(calculadora, "GRAN TOTAL = " + gran_total)
    registrar_log(calculadora, "gran_total", "gran_total=" + gran_total)
    reiniciar_operacion(calculadora)
    calculadora["gran_total"] = "0"
    calculadora["ultimo_subtotal"] = ""
    registrar_cinta(calculadora, encabezado_cinta("nueva_calculadora"))


def obtener_subtotal_actual(calculadora):
    if calculadora["estado"] == ESTADO_ENCENDIDA_ESPERANDO_TYPING:
        return "0"

    if calculadora["estado"] == ESTADO_OPERADOR_PENDIENTE:
        if calculadora["acumulado"] != "":
            return calculadora["acumulado"]
        return calculadora["display"] or "0"

    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        if calculadora["operador_pendiente"] != "":
            return resolver_operacion(
                calculadora["acumulado"],
                calculadora["operador_pendiente"],
                calculadora["operando_actual"],
            )
        return calculadora["operando_actual"] or calculadora["display"] or "0"

    if calculadora["estado"] == ESTADO_RESULTADO_EN_DISPLAY:
        return calculadora["display"] or "0"

    raise ValueError("No se pudo obtener subtotal.")


def sumar_a_gran_total(gran_total, subtotal):
    return formatear_decimal(Decimal(gran_total) + Decimal(subtotal))


def limpiar(calculadora):
    reiniciar_operacion(calculadora)
    registrar_cinta(calculadora, "C")
    registrar_log(calculadora, "limpiar")


def reiniciar_operacion(calculadora):
    calculadora["estado"] = ESTADO_ENCENDIDA_ESPERANDO_TYPING
    calculadora["display"] = "0"
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = ""
    calculadora["operador_pendiente"] = ""


def mostrar_estado(calculadora):
    print()
    print("Estado:", calculadora["estado"])
    print("Display:", calculadora["display"])
    print("Acumulado:", calculadora["acumulado"] or "-")
    print("Operador pendiente:", calculadora["operador_pendiente"] or "-")
    print("Gran total:", calculadora["gran_total"])


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
        + ",operador_pendiente=" + calculadora["operador_pendiente"]
        + ",gran_total=" + calculadora["gran_total"]
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
    registrar_cinta(
        calculadora,
        izquierda + " " + operador + " " + derecha + " = " + resultado,
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
    print("Usa teclas: 0-9 . + - * / = C s g")
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
