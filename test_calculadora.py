import os
import json
import tempfile
import unittest

from calculadora import ESTADO_ENCENDIDA_ESPERANDO_TYPING
from calculadora import ESTADO_OPERADOR_PENDIENTE
from calculadora import ESTADO_RESULTADO_EN_DISPLAY
from calculadora import ESTADO_TYPING_OPERANDO
from calculadora import encender
from calculadora import nueva_calculadora
from calculadora import presionar_tecla


class CalculadoraContableTest(unittest.TestCase):
    def setUp(self):
        self.directorio_temporal = tempfile.TemporaryDirectory()
        self.ruta_log = os.path.join(self.directorio_temporal.name, "calculadora.log")
        self.ruta_cinta = os.path.join(self.directorio_temporal.name, "cinta.txt")

    def tearDown(self):
        self.directorio_temporal.cleanup()

    def crear_calculadora(self):
        return nueva_calculadora(
            ruta_log=self.ruta_log,
            ruta_cinta=self.ruta_cinta,
        )

    def leer_archivo(self, ruta):
        with open(ruta, "r", encoding="utf-8") as archivo:
            return archivo.read()

    def leer_casos_compartidos(self):
        ruta = os.path.join(
            os.path.dirname(__file__),
            "spec",
            "casos_compartidos.json",
        )
        with open(ruta, "r", encoding="utf-8") as archivo:
            return json.load(archivo)

    def test_encender_activa_estado_inicial(self):
        calculadora = self.crear_calculadora()

        encender(calculadora)

        self.assertEqual(calculadora["estado"], ESTADO_ENCENDIDA_ESPERANDO_TYPING)
        self.assertEqual(calculadora["display"], "0")
        self.assertEqual(calculadora["gran_total"], "0")

    def test_casos_compartidos_python_y_js(self):
        for caso in self.leer_casos_compartidos():
            with self.subTest(secuencia=caso["secuencia"]):
                calculadora = self.crear_calculadora()
                encender(calculadora)

                for tecla in caso["secuencia"]:
                    presionar_tecla(calculadora, tecla)

                self.assertEqual(calculadora["display"], caso["display_final"])
                self.assertEqual(calculadora["estado"], caso["estado_final"])

    def test_primer_digito_desde_esperando_typing_inicia_captura(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "7")

        self.assertEqual(calculadora["estado"], ESTADO_TYPING_OPERANDO)
        self.assertEqual(calculadora["display"], "7")

    def test_e_borra_operando_actual_y_conserva_operador_pendiente(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "12+3e":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "0")
        self.assertEqual(calculadora["operando_actual"], "")
        self.assertEqual(calculadora["operador_pendiente"], "+")
        self.assertEqual(calculadora["estado"], ESTADO_OPERADOR_PENDIENTE)

    def test_a_reinicia_toda_la_calculadora_y_memorias(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "2+3s4+1a":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "0")
        self.assertEqual(calculadora["estado"], ESTADO_ENCENDIDA_ESPERANDO_TYPING)
        self.assertEqual(calculadora["gran_total"], "0")
        self.assertEqual(calculadora["ultimo_subtotal"], "")
        self.assertEqual(calculadora["ultimo_gran_total"], "")

    def test_operador_prepara_segundo_operando(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "7")
        presionar_tecla(calculadora, "+")

        self.assertEqual(calculadora["estado"], ESTADO_OPERADOR_PENDIENTE)
        self.assertEqual(calculadora["acumulado"], "7.00")
        self.assertEqual(calculadora["operador_pendiente"], "+")

    def test_suma_basica(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "2")
        presionar_tecla(calculadora, "+")
        presionar_tecla(calculadora, "3")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)
        self.assertEqual(calculadora["display"], "5.00")

    def test_resta_basica(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "9")
        presionar_tecla(calculadora, "-")
        presionar_tecla(calculadora, "4")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["display"], "5.00")

    def test_multiplicacion_basica(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "6")
        presionar_tecla(calculadora, "*")
        presionar_tecla(calculadora, "7")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["display"], "42.00")

    def test_division_basica(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "8")
        presionar_tecla(calculadora, "/")
        presionar_tecla(calculadora, "4")
        presionar_tecla(calculadora, "=")

        self.assertEqual(calculadora["display"], "2.00")

    def test_division_entre_cero_falla(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "8")
        presionar_tecla(calculadora, "/")
        presionar_tecla(calculadora, "0")

        with self.assertRaises(ValueError):
            presionar_tecla(calculadora, "=")

    def test_log_detallado_registra_acciones_y_errores(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "2")
        presionar_tecla(calculadora, "+")

        with self.assertRaises(ValueError):
            presionar_tecla(calculadora, "=")

        contenido_log = self.leer_archivo(self.ruta_log)

        self.assertIn("accion=encender", contenido_log)
        self.assertIn("accion=tecla tecla=2", contenido_log)
        self.assertIn("accion=tecla tecla=+", contenido_log)
        self.assertIn("accion=error tecla==", contenido_log)

    def test_cinta_registra_operacion_resuelta(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "2")
        presionar_tecla(calculadora, "+")
        presionar_tecla(calculadora, "3")
        presionar_tecla(calculadora, "=")

        contenido_cinta = self.leer_archivo(self.ruta_cinta)

        self.assertIn("encendida", contenido_cinta)
        self.assertIn("2.00 + 3.00 = 5.00", contenido_cinta)

    def test_subtotal_suma_al_gran_total_y_reinicia_operacion(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "2")
        presionar_tecla(calculadora, "+")
        presionar_tecla(calculadora, "3")
        presionar_tecla(calculadora, "s")

        self.assertEqual(calculadora["estado"], ESTADO_ENCENDIDA_ESPERANDO_TYPING)
        self.assertEqual(calculadora["display"], "0")
        self.assertEqual(calculadora["ultimo_subtotal"], "5.00")
        self.assertEqual(calculadora["gran_total"], "5.00")

    def test_subtotales_son_independientes_y_acumulan_gran_total(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "2+3s4+1s":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["gran_total"], "10.00")
        self.assertEqual(calculadora["display"], "0")
        self.assertEqual(calculadora["estado"], ESTADO_ENCENDIDA_ESPERANDO_TYPING)

    def test_gran_total_imprime_y_reinicia_todo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "2+3s4+1sg":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["ultimo_gran_total"], "10.00")
        self.assertEqual(calculadora["gran_total"], "0")
        self.assertEqual(calculadora["display"], "0")
        self.assertEqual(calculadora["estado"], ESTADO_ENCENDIDA_ESPERANDO_TYPING)

        contenido_cinta = self.leer_archivo(self.ruta_cinta)
        self.assertIn("SUBTOTAL = 5.00", contenido_cinta)
        self.assertIn("GRAN TOTAL = 10.00", contenido_cinta)

    def test_multiplicacion_despues_de_suma_no_suma_el_factor_antes_de_tiempo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "50+50+2*":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "2")
        self.assertEqual(calculadora["acumulado"], "100.00")
        self.assertEqual(calculadora["acumulado_multiplicativo"], "2")
        self.assertEqual(calculadora["operador_pendiente"], "*")

    def test_multiplicacion_se_integra_al_subtotal_al_cerrar(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "50+50+2*50=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "200.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_multiplicacion_despues_de_resta_no_resta_el_factor_antes_de_tiempo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100-2*":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "2")
        self.assertEqual(calculadora["acumulado"], "100.00")
        self.assertEqual(calculadora["acumulado_multiplicativo"], "2")
        self.assertEqual(calculadora["operador_pendiente"], "*")
        self.assertEqual(calculadora["operador_subtotal"], "-")

    def test_multiplicacion_se_descuenta_del_subtotal_al_cerrar(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100-2*50=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "0.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_division_se_integra_al_subtotal_despues_de_suma(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100+50/2=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "125.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_division_se_descuenta_del_subtotal_despues_de_resta(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100-50/2=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "75.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_division_y_multiplicacion_encadenadas_forman_un_mismo_termino(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100+50/2*4=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "200.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_numero_negativo_desde_el_arranque_se_captura_como_operando(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        presionar_tecla(calculadora, "-")
        presionar_tecla(calculadora, "5")

        self.assertEqual(calculadora["display"], "-5")
        self.assertEqual(calculadora["operando_actual"], "-5")
        self.assertEqual(calculadora["estado"], ESTADO_TYPING_OPERANDO)

    def test_resta_iniciando_con_numero_negativo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "-5-10=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "-15.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_multiplicacion_con_segundo_operando_negativo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "5*-2=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "-10.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_division_con_segundo_operando_negativo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "5/-2=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "-2.50")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_resta_de_operando_negativo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "5--2=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "7.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_suma_de_operando_negativo(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "5+-2=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "3.00")
        self.assertEqual(calculadora["estado"], ESTADO_RESULTADO_EN_DISPLAY)

    def test_selector_decimal_cambia_precision(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "t1/3=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["modo_decimal"], "3")
        self.assertEqual(calculadora["display"], "0.333")

    def test_modo_flotante_conserva_precision_al_dividir(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "f1/3=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["modo_decimal"], "F")
        self.assertEqual(
            calculadora["display"],
            "0.3333333333333333333333333333",
        )

    def test_cinta_formatea_miles_y_decimales(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "1250+300=":
            presionar_tecla(calculadora, tecla)

        contenido_cinta = self.leer_archivo(self.ruta_cinta)
        self.assertIn("1,250.00 + 300.00 = 1,550.00", contenido_cinta)

    def test_iva_suma_aplica_tasa_sobre_base(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100i":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "116.00")
        self.assertEqual(calculadora["ultimo_impuesto"], "16.00")

    def test_iva_resta_recupera_base(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "116u":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "100.00")
        self.assertEqual(calculadora["ultimo_impuesto"], "16.00")

    def test_iva_resta_respeta_suma_pendiente(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100u+100u=":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["display"], "172.42")

    def test_tasa_impuesto_se_puede_editar(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "re8=100i":
            presionar_tecla(calculadora, tecla)

        self.assertEqual(calculadora["tasa_impuesto"], "8")
        self.assertEqual(calculadora["display"], "108.00")
        self.assertEqual(calculadora["ultimo_impuesto"], "8.00")

    def test_cinta_registra_iva_y_tasa(self):
        calculadora = self.crear_calculadora()
        encender(calculadora)

        for tecla in "100i":
            presionar_tecla(calculadora, tecla)

        contenido_cinta = self.leer_archivo(self.ruta_cinta)
        self.assertIn("IVA+ 100.00 @ 16.00% = 116.00 (IVA 16.00)", contenido_cinta)


if __name__ == "__main__":
    unittest.main()
