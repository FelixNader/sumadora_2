import sys
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


def nueva_calculadora():
    return {
        "estado": ESTADO_APAGADA,
        "display": "",
        "operando_actual": "",
        "acumulado": "",
        "operador_pendiente": "",
    }


def encender(calculadora):
    calculadora["estado"] = ESTADO_ENCENDIDA_ESPERANDO_TYPING
    calculadora["display"] = "0"
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = ""
    calculadora["operador_pendiente"] = ""


def apagar(calculadora):
    calculadora["estado"] = ESTADO_APAGADA
    calculadora["display"] = ""
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = ""
    calculadora["operador_pendiente"] = ""


def presionar_tecla(calculadora, tecla):
    if len(tecla) != 1:
        raise ValueError("La tecla debe ser un unico caracter.")

    if calculadora["estado"] == ESTADO_APAGADA:
        raise ValueError("La calculadora esta apagada.")

    if calculadora["estado"] == ESTADO_ENCENDIDA_ESPERANDO_TYPING:
        manejar_encendida_esperando_typing(calculadora, tecla)
        return

    if calculadora["estado"] == ESTADO_TYPING_OPERANDO:
        manejar_typing_operando(calculadora, tecla)
        return

    if calculadora["estado"] == ESTADO_OPERADOR_PENDIENTE:
        manejar_operador_pendiente(calculadora, tecla)
        return

    if calculadora["estado"] == ESTADO_RESULTADO_EN_DISPLAY:
        manejar_resultado_en_display(calculadora, tecla)
        return

    raise ValueError("Estado no soportado.")


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
        calculadora["acumulado"] = resolver_operacion(
            calculadora["acumulado"],
            calculadora["operador_pendiente"],
            calculadora["operando_actual"],
        )
        calculadora["display"] = calculadora["acumulado"]

    calculadora["operador_pendiente"] = operador
    calculadora["operando_actual"] = ""
    calculadora["estado"] = ESTADO_OPERADOR_PENDIENTE


def cerrar_operacion(calculadora):
    if calculadora["operador_pendiente"] == "":
        calculadora["display"] = calculadora["operando_actual"]
        calculadora["estado"] = ESTADO_RESULTADO_EN_DISPLAY
        return

    resultado = resolver_operacion(
        calculadora["acumulado"],
        calculadora["operador_pendiente"],
        calculadora["operando_actual"],
    )
    calculadora["display"] = resultado
    calculadora["operando_actual"] = ""
    calculadora["acumulado"] = resultado
    calculadora["operador_pendiente"] = ""
    calculadora["estado"] = ESTADO_RESULTADO_EN_DISPLAY


def limpiar(calculadora):
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


def ejecutar_terminal():
    calculadora = nueva_calculadora()
    encender(calculadora)

    print("Calculadora sumadora contable")
    print("Estado inicial: encendida_esperando_typing")
    print("Usa teclas: 0-9 . + - * / = C")
    print("Cada tecla se procesa sin Enter")
    print("Usa q para salir")

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
