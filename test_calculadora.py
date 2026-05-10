import unittest

from calculadora import ESTADO_ENCENDIDA_ESPERANDO_TYPING
from calculadora import ESTADO_OPERADOR_PENDIENTE
from calculadora import ESTADO_RESULTADO_EN_DISPLAY
from calculadora import ESTADO_TYPING_OPERANDO
from calculadora import encender
from calculadora import nueva_calculadora
from calculadora import presionar_tecla


class CalculadoraContableTest(unittest.TestCase):
    def test_encender_activa_estado_inicial(self):
        calculadora = nueva_calculadora()

        encender(calculadora)

        self.assertEqual(calculadora["estado"], ESTADO_ENCENDIDA_ESPERANDO_TYPING)
        self.assertEqual(calculadora["display"], "0")

    def test_primer_digito_desde_esperando_typing_inicia_captura(self):
        calculadora = nueva_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "7")

        self.assertEqual(calculadora["estado"], ESTADO_TYPING_OPERANDO)
        self.assertEqual(calculadora["display"], "7")

    def test_operador_prepara_segundo_operando(self):
        calculadora = nueva_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "7")
        presionar_tecla(calculadora, "+")

        self.assertEqual(calculadora["estado"], ESTADO_OPERADOR_PENDIENTE)
        self.assertEqual(calculadora["acumulado"], "7")
        self.assertEqual(calculadora["operador_pendiente"], "+")

    def test_suma_basica(self):
        calculadora = nueva_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "2")
        presionar_tecla(calculadora, "+")
        presionar_tecla(calculadora, "3")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)
        self.assertEqual(calculadora["display"], "5")

    def test_resta_basica(self):
        calculadora = nueva_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "9")
        presionar_tecla(calculadora, "-")
        presionar_tecla(calculadora, "4")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["display"], "5")

    def test_multiplicacion_basica(self):
        calculadora = nueva_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "6")
        presionar_tecla(calculadora, "*")
        presionar_tecla(calculadora, "7")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["display"], "42")

    def test_division_basica(self):
        calculadora = nueva_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "8")
        presionar_tecla(calculadora, "/")
        presionar_tecla(calculadora, "4")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["display"], "2")

    def test_division_entre_cero_falla(self):
        calculadora = nueva_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "8")
        presionar_tecla(calculadora, "/")
        presionar_tecla(calculadora, "0")

        with self.assertRaises(ValueError):
            presionar_tecla(calculadora, "=")


if __name__ == "__main__":
    unittest.main()
