# Guía de Uso

Esta guía explica cada botón, tecla y función disponible en la versión web de la Sumadora Contable PWA.

## Vista general

La aplicación está dividida en estas zonas:

- `Display`: muestra el importe activo.
- `Precisión`: cambia el modo decimal `F`, `2`, `3`, `4`.
- `Memoria`: `M+`, `M-`, `MR`, `MC`.
- `Teclado principal`: números, operadores, `AC`, `Sub`, `GT`.
- `Funciones`: TAX, conversión, parámetros y funciones comerciales.
- `Registro`: panel de `Cinta` y `Log`.

## Uso rápido

Flujo básico:

1. Captura un número.
2. Elige `+`, `-`, `X` o `/`.
3. Captura el siguiente número.
4. Pulsa `=` para resolver.
5. Usa `Sub` para enviar el subtotal al gran total.
6. Usa `GT` para mostrar el gran total acumulado y reiniciar la sesión operativa.

## Teclado principal

### Números y operadores

- `0` a `9`: capturan el operando actual.
- `.`: agrega punto decimal.
- `+`: suma.
- `-`: resta.
- `X`: multiplicación.
- `/`: división.
- `=`: resuelve la operación actual.

### Controles principales

- `AC`
  - Botón: `AC`
  - Tecla: `a` o `Escape`
  - Acción: borra la operación actual, reinicia subtotal visible y gran total operativo, pero conserva memoria.

- `Sub`
  - Botón: `Sub`
  - Tecla: `s`
  - Acción: calcula el subtotal actual y lo acumula en `Gran total`.

- `GT`
  - Botón: `GT`
  - Tecla: `g`
  - Acción: muestra el gran total acumulado, lo imprime en cinta y arranca una nueva sesión operativa.

### Nota sobre `C`

El botón visible `C` en la fila principal funciona como borrado de entrada.

Borrado disponible:

- botón `C`
- `Backspace`
- tecla `e`

La tecla física `c` sigue reservada para el modo decimal `4`.

## Precisión decimal

Estos botones cambian cómo se redondean y muestran los resultados:

- `F`
  - Tecla: `f`
  - Acción: modo flotante.

- `2`
  - Tecla: `d`
  - Acción: 2 decimales fijos.

- `3`
  - Tecla: `t`
  - Acción: 3 decimales fijos.

- `4`
  - Tecla: `c`
  - Acción: 4 decimales fijos.

La cinta registra estos cambios como `MODO DECIMAL = ...`.

## Memoria

- `M+`
  - Botón: `M+`
  - Tecla: `n`
  - Acción: suma el valor actual a la memoria.

- `M-`
  - Botón: `M-`
  - Tecla: `v`
  - Acción: resta el valor actual de la memoria.

- `MR`
  - Botón: `MR`
  - Tecla: `m`
  - Acción: recupera la memoria al display.

- `MC`
  - Botón: `MC`
  - Tecla: `x`
  - Acción: limpia la memoria.

### Qué es la memoria y qué no es

La memoria es un registro separado del flujo contable principal.

- No es el `subtotal`.
- No es el `gran total`.
- No se reinicia con `AC`.

Diferencia práctica:

- `Memoria`
  - Guarda un valor manual de referencia que tú decides conservar.
  - Sirve para apartar un importe y volverlo a llamar luego con `MR`.

- `Sub`
  - Consolida el subtotal actual de la operación en curso.
  - Forma parte del flujo de acumulación operativa.

- `GT`
  - Muestra el acumulado de subtotales.
  - Cierra o reinicia el ciclo operativo visible.

### Persistencia y manejo

- La memoria persiste entre reinicios operativos de la calculadora.
- Puedes pulsar `AC` varias veces y la memoria seguirá ahí.
- `AC` limpia la operación visible, pero no toca memoria.
- `MR` recupera la memoria al display sin borrarla.
- `MC` es la acción que sí vacía la memoria por completo.

En otras palabras: si quieres conservar un valor aunque limpies la calculadora o reinicies la captura, guárdalo en memoria.

## Qué borra y qué conserva

- `AC`
  - limpia la operación visible
  - reinicia el ciclo operativo
  - conserva memoria

- `Sub`
  - toma el subtotal actual
  - lo acumula en `Gran total`

- `GT`
  - muestra e imprime el gran total
  - reinicia el ciclo operativo
  - abre una nueva sesión operativa

- `MR`
  - recupera memoria
  - no la borra

- `MC`
  - sí borra memoria por completo

- `Nueva cinta`
  - limpia cinta y log
  - reinicia captura, subtotal y gran total
  - conserva memoria y parámetros (`DEC`, `TAX`, `RATE`, `OUT`, `SPD`)

Regla práctica:

- `AC` limpia captura
- `Sub` y `GT` consolidan operación
- `MC` es la limpieza real de memoria

## Porcentaje

- `%`
  - Botón: `%`
  - Tecla: `%` o `p`
  - Acción: aplica porcentaje sobre el operando actual.  
    Si hay una suma o resta en curso, calcula porcentaje respecto al acumulado.

### Cómo funciona `%`

La tecla `%` cambia su comportamiento según el contexto:

- Si no hay una base aditiva en curso, convierte el operando a fracción decimal.
- Si estás en una suma o resta, calcula `x%` de la base acumulada.
- Si estás en multiplicación o división, usa el porcentaje como decimal.

### Casos reales

- `10 %`
  - resultado: `0.10`
  - lectura: `10% = 0.10`

- `200 + 10 %`
  - resultado: `220.00`
  - lectura: `200 + (10% de 200)`

- `200 - 10 %`
  - resultado: `180.00`
  - lectura: `200 - (10% de 200)`

- `200 X 10 %`
  - resultado: `20.00`
  - lectura: `200 X 0.10`

- `200 / 10 %`
  - resultado: `2000.00`
  - lectura: `200 / 0.10`

### Qué aparece en cinta

- Porcentaje simple:
  - `PORC 10.00% = 0.10`

- Porcentaje aplicado sobre base:
  - `PORC 10.00% DE 200.00 = 20.00`

### Idea práctica

- Usa `%` solo para convertir un porcentaje a decimal cuando trabajas con `X` o `/`.
- Usa `%` como “porcentaje de la base” cuando trabajas con `+` o `-`.

## Funciones TAX

- `TAX+`
  - Botón: `TAX+`
  - Tecla: `i`
  - Acción: suma tax al valor actual usando la tasa configurada.

- `TAX-`
  - Botón: `TAX-`
  - Tecla: `u`
  - Acción: extrae tax del valor actual usando la tasa configurada.

- `TAX`
  - Botón: `TAX`
  - Tecla: `r`
  - Acción: entra en modo edición de tasa de impuesto.

### Editar `TAX`

1. Pulsa `TAX`.
2. Escribe números y `.` si hace falta.
3. Pulsa `=` para guardar.

Mientras editas:

- `=` confirma
- `r` cancela
- `e` reinicia el buffer a `0`
- `a` hace borrado general

### Por qué `TAX-` no es lo mismo que “menos porcentaje”

`TAX-` no significa:

- restarle un porcentaje directo al total visible

`TAX-` significa:

- tomar un total que ya incluye tax
- y extraer la base antes del tax

Matemáticamente:

- resta simple de porcentaje:
  - `total - (total * tasa)`

- extracción correcta de tax:
  - `base = total / (1 + tasa)`

Ejemplo con `16%`:

- `100 -> TAX+ = 116`
- `116 -> TAX- = 100`

Si intentaras hacerlo como resta simple, obtendrías:

- `116 - 16% de 116 = 97.44`

Ese resultado es incorrecto para extraer la base.

La razón es que en `TAX-` el número visible ya contiene impuesto. Entonces no estás descontando un porcentaje cualquiera: estás invirtiendo la fórmula fiscal del total con tax incluido.

## Conversión y parámetros

- `CONV`
  - Botón: `CONV`
  - Tecla: `y`
  - Acción: multiplica el valor actual por `RATE`.

- `OUT`
  - Botón: `OUT`
  - Tecla: `o`
  - Acción: entra en modo edición de `OUT`.

- `SPD`
  - Botón: `SPD`
  - Tecla: `b`
  - Acción: entra en modo edición de `SPD`.

- `PUB`
  - Botón: `PUB`
  - Tecla: `j`
  - Acción: calcula la tasa publicada a partir de `OUT` y `SPD`.

- `BASE/PUB`
  - Botón: `BASE/PUB`
  - Tecla: `z`
  - Acción: divide el valor base actual entre `PUB`.
  - Ejemplo en cinta:
    `BASE 5,000.00 / PUB 16.00 = 312.50`

- `RATE`
  - Botón: `RATE`
  - Tecla: `w`
  - Acción: entra en modo edición de `RATE`.

### Qué significa cada uno

- `RATE`
  - Es una tasa general de conversión.
  - Sirve para conversiones directas con `CONV`.
  - No depende de la lógica de publicación segura.

- `OUT`
  - Es el tipo de cambio al que tú realmente cambiarías ese dinero con tu usuario o cliente.
  - Es una tasa operativa de negocio.
  - No es lo mismo que `RATE`: `RATE` es una tasa general; `OUT` es tu referencia real de salida para publicar o cambiar.
  - Visto en operación real: es el tipo al que el operador estima que luego podrá convertir la moneda del cliente a moneda local.

- `SPD`
  - Significa `spread` o margen de seguridad.
  - No es otro tipo de cambio distinto.
  - Es una reserva o colchón de protección que descuentas respecto de `OUT` para cubrir riesgo, volatilidad o seguridad comercial.
  - En este caso también representa el costo de cambiarle el dinero al cliente dentro de la tienda y evitarle el viaje a la casa de cambio.

- `PUB`
  - Es el tipo seguro publicado.
  - En la lógica actual se calcula como `OUT - SPD`.
  - La idea es que `PUB` sea un tipo más conservador y seguro para mostrar o publicar al usuario.

- `BASE/PUB`
  - Es un conversor rápido de tu moneda base a la otra moneda usando el tipo seguro `PUB`.
  - En vez de pensar “convertir a dólares”, aquí se piensa “convertir base al tipo publicado seguro”.
  - Sirve para tomar un precio legal en moneda base y convertirlo a la moneda del cliente usando el tipo que sí vas a publicar.

### Flujo recomendado

1. El operador parte de un precio base legal, normalmente en MXN o en la moneda local.
2. Define `OUT` con el tipo al que estimas que después podrás cambiar la moneda del cliente por moneda local.
3. Define `SPD` con el margen de protección o costo de servicio que quieres reservar.
4. Pulsa `PUB` para obtener el tipo que sí vas a publicar al cliente para cobrarle.
5. Usa `BASE/PUB` para convertir rápidamente el precio base legal a la moneda del cliente usando ese tipo publicado.
6. Usa `CONV` con `RATE` cuando solo necesites una conversión general, sin lógica de publicación segura.

### Ejemplo práctico

- `OUT = 15.80`
- `SPD = 0.20`
- `PUB = 15.60`
- `BASE 5,000.00 / PUB 15.60 = 320.51`

En este ejemplo:

- `15.80` es el tipo al que el operador estima que podrá convertir luego esa moneda a moneda local.
- `0.20` es la parte que reservas como margen de seguridad.
- `15.60` es el tipo publicado seguro resultante en la lógica actual.
- `320.51` es la conversión rápida del monto base usando ese tipo publicado.

Interpretación completa:

- El precio legal sigue estando en moneda base.
- El cliente trae dólares u otra moneda extranjera.
- El operador necesita cobrarle en esa moneda sin quedar expuesto a pérdida cuando luego vaya a cambiarla.
- `PUB` es el tipo que se publica al cliente.
- `BASE/PUB` resuelve cuánto debe pagar el cliente en su moneda usando ese tipo publicado.

### Editar `RATE`, `OUT` o `SPD`

Flujo:

1. Pulsa el botón del parámetro.
2. Escribe el valor.
3. Pulsa `=` para guardar.

Mientras editas:

- `=` confirma
- la misma tecla cancela:
  - `w` cancela `RATE`
  - `o` cancela `OUT`
  - `b` cancela `SPD`
- `e` reinicia el buffer a `0`
- `a` hace borrado general

## Funciones comerciales

Estas funciones trabajan con tres valores:

- `COST`
- `SELL`
- `MAR`

Botones:

- `COST`
  - Botón: `COST`
  - Tecla: `k`

- `SELL`
  - Botón: `SELL`
  - Tecla: `l`

- `MAR`
  - Botón: `MAR`
  - Tecla: `h`

### Qué significa cada una

- `COST`
  - costo base del producto o servicio.

- `SELL`
  - precio final de venta.

- `MAR`
  - margen porcentual sobre `SELL`.
  - No es margen sobre `COST`.

### Ecuaciones reales del motor

- `SELL = COST / (1 - MAR/100)`
- `COST = SELL * (1 - MAR/100)`
- `MAR = ((SELL - COST) / SELL) * 100`

### Aclaración importante sobre `MAR`

En esta calculadora, `MAR` está definido sobre `SELL`, no sobre `COST`.

Eso significa que:

- utilidad = `SELL - COST`
- margen = `utilidad / SELL`

No significa:

- `utilidad / COST`

Ese segundo caso sería un markup sobre costo, que es otro concepto.

Razón comercial y de convención:

- en muchos contextos de pricing, `margin` se entiende como la parte del precio de venta que queda como utilidad
- eso permite responder preguntas como:
  - “¿qué porcentaje de mi venta estoy reteniendo?”
- si lo calcularas sobre `COST`, ya no estarías hablando del mismo concepto
- eso se parece más a un `markup` o recargo sobre costo

Ejemplo clave:

- si `COST = 80`
- y `SELL = 100`
- la utilidad es `20`
- `MAR = 20 / 100 = 20%`

Si lo midieras sobre costo, sería:

- `20 / 80 = 25%`

Pero ese `25%` no es el `MAR` que usa este motor.

### Cómo funcionan

Si hay un valor visible disponible, el botón guarda ese valor en el campo correspondiente.

Si ya existen suficientes datos previos, el botón calcula el valor faltante:

- `COST` puede calcular costo usando `SELL` y `MAR`
- `SELL` puede calcular venta usando `COST` y `MAR`
- `MAR` puede calcular margen usando `COST` y `SELL`

### Ejemplos de uso

- Captura `100`, pulsa `COST` para guardar costo.
- Captura `20`, pulsa `MAR` para guardar margen.
- Pulsa `SELL` para calcular el precio de venta.

Resultado esperado:

- `SELL = 125.00`

porque:

- `SELL = 100 / (1 - 0.20) = 125`

Otro ejemplo:

- guarda `SELL = 100`
- guarda `MAR = 20`
- pulsa `COST`

Resultado esperado:

- `COST = 80.00`

porque:

- `COST = 100 * (1 - 0.20) = 80`

Y si guardas:

- `COST = 80`
- `SELL = 100`
- luego pulsas `MAR`

Resultado esperado:

- `MAR = 20.00%`

## Errores y límites

- `MAR` debe ser menor a `100`.
- `SELL` no puede ser `0` para calcular `MAR`.
- No puedes aplicar `%` sin un operando válido.
- No puedes dividir entre cero.
- En edición de `TAX`, `RATE`, `OUT` o `SPD`, un segundo punto decimal no es válido.
- El botón visible `C` borra la entrada actual.
- La tecla física `c` sigue asociada al modo decimal `4`.

## Flujo completo de ejemplo

1. Parte de un precio base legal, por ejemplo `5000` en moneda local.
2. Edita `OUT`, por ejemplo `15.80`.
3. Edita `SPD`, por ejemplo `0.20`.
4. Pulsa `PUB` para obtener el tipo publicado seguro: `15.60`.
5. Pulsa `BASE/PUB` para convertir el precio base a la moneda del cliente.
6. Si quieres reservar ese cobro, usa `M+` para guardarlo en memoria.
7. Si además necesitas tax sobre una cantidad base, aplica `TAX+`. Si el importe ya incluye tax, usa `TAX-`.
8. Usa `Sub` para mandar la operación cerrada al gran total.
9. Usa `GT` cuando quieras imprimir el acumulado final y arrancar un nuevo ciclo.

## Cinta y log

Panel inferior:

- `Cinta`
  - registro contable y operativo visible

- `Log`
  - registro más técnico de acciones internas

- `Nueva cinta`
  - deja lista una cinta nueva para otro set de cuentas
  - limpia el historial visible de cinta y log
  - no borra memoria ni parámetros configurados

- `Exportar sesión`
  - descarga un archivo `.json` con el estado actual
  - incluye cinta, log, memoria, parámetros y captura operativa

- `Importar sesión`
  - reemplaza la sesión actual con el contenido de un archivo `.json`
  - sirve para retomar una sesión guardada previamente

La cinta ahora diferencia visualmente:

- operaciones resolutivas
- subtotal
- gran total
- fiscal
- conversión
- parámetros
- memoria
- comercial
- control

## Gestos y ayudas

- Doble tap sobre el display en iPhone:
  - copia el valor visible al portapapeles.

- Botón `▼` en la parte superior:
  - muestra u oculta métricas adicionales.

## Atajos de teclado

### Cálculo

- `0-9`
- `.`
- `+`
- `-`
- `*`
- `/`
- `Enter` o `=`

### Control

- `a`: `AC`
- `Escape`: `AC`
- `e`: borrado de entrada
- `Backspace`: borrado de entrada

### Precisión

- `f`: modo `F`
- `d`: modo `2`
- `t`: modo `3`
- `c`: modo `4`

### Impuesto y porcentaje

- `p` o `%`: porcentaje
- `i`: `TAX+`
- `u`: `TAX-`
- `r`: `TAX`

### Conversión

- `y`: `CONV`
- `w`: `RATE`
- `o`: `OUT`
- `b`: `SPD`
- `j`: `PUB`
- `z`: `BASE/PUB`

### Memoria

- `n`: `M+`
- `v`: `M-`
- `m`: `MR`
- `x`: `MC`

### Comercial

- `k`: `COST`
- `l`: `SELL`
- `h`: `MAR`

### Acumulación

- `s`: `Sub`
- `g`: `GT`

## Recomendaciones de uso

- Usa `Sub` para cerrar una operación parcial.
- Usa `GT` cuando quieras cerrar y reiniciar el ciclo de captura.
- Si trabajas con cambio, configura primero `OUT`, `SPD` y luego `PUB`.
- Si trabajas con tax, confirma `TAX` antes de aplicar `TAX+` o `TAX-`.
- Si el display muestra algo importante, puedes guardarlo en memoria antes de limpiar.
