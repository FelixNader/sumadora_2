# Sumadora HR-100TM Calculation Engine

Replica web de una calculadora contable de escritorio inspirada en la `SUMADORA HR-100TM`. El proyecto no intenta verse como una "demo de botones": su foco es un motor de calculo con reglas operativas, financieras y de persistencia de sesion, expuesto mediante una interfaz React.

## Que hace

- Operaciones aritmeticas con precedencia real entre `+`, `-`, `x` y `/`
- Flujo de sumadora para la tecla combinada `+ =`: registra linea, totaliza la secuencia y permite seguir acumulando desde el total impreso
- Selector decimal `F`, `3`, `2`, `0` y `ADD2`
- Modos visibles `NORMAL` y `CONVERSION`
- Memoria independiente, `grand total`, subtotales y contadores `OPS` y `SUB`
- Impuestos, conversion de moneda y calculos `COST / SELL / MGN`
- Cinta de papel siempre activa
- Persistencia local con exportacion e importacion de snapshots JSON
- Persistencia automatica entre sesiones solo para `M`, `RATE` y `TAX`
- Copia del valor mostrado mediante doble clic sobre el display

## Arquitectura

La implementacion actual sigue una **Clean Architecture ligera**:

- `domain`: reglas puras de la calculadora
- `application`: coordinacion de casos de uso y persistencia
- `infrastructure`: detalles concretos del navegador
- `ui`: adaptadores React para botones, teclado y render

No es una arquitectura corporativa sobredimensionada. El sistema sigue siendo pequeno, pero ahora la separacion entre dominio, aplicacion e infraestructura existe en el codigo y no solo en los diagramas.

Las decisiones principales quedaron documentadas en [docs/adr/README.md](./docs/adr/README.md).

La decision mas reciente sobre el flujo contable de `+ =` quedo registrada en [ADR 0007](./docs/adr/0007-combined-plus-equals-belongs-to-the-domain.md): esa tecla ya no se entiende como un parche de interfaz, sino como comportamiento propio del dominio.

La persistencia local automatica tambien quedo acotada por producto en [ADR 0008](./docs/adr/0008-persist-only-configuration-across-sessions.md): `M`, `RATE` y `TAX` sobreviven entre sesiones, pero la cinta, `GT`, `OPS`, `SUB` y el estado operativo se reinician al abrir la app.

### Mapa de bounded contexts

```mermaid
flowchart LR
    Core["BC1 Core Calculation"]
    Accounting["BC2 Accounting and Tape"]
    Memory["BC3 Independent Memory"]
    Tax["BC4 Tax Calculation"]
    FX["BC5 Currency Conversion"]
    Business["BC6 Business Margin"]
    Persistence["BC7 Snapshot Persistence"]

    Core --> Accounting
    Core --> Memory
    Core --> Tax
    Core --> FX
    Core --> Business
    Core --> Persistence
```

La copia al portapapeles no aparece en este grafo porque no es un bounded context de negocio. Es una capacidad de aplicacion e infraestructura propia del entorno web/PWA.

### Vista de Clean Architecture

```mermaid
flowchart LR
    subgraph UI["UI / React"]
        Screen["CalculatorUI"]
        Keyboard["translateCalculatorKeyboardEvent"]
        Display["Display double click"]
        SnapshotButtons["Import / Export buttons"]
    end

    subgraph Application["Application"]
        Dispatch["dispatchCalculatorAction"]
        Copy["copyDisplayValue"]
        Transfer["transferCalculatorSnapshot"]
        Service["CalculatorApplicationService"]
        ClipboardPort["ClipboardGateway"]
        SnapshotRepoPort["CalculatorSnapshotRepository"]
        SnapshotFilePort["CalculatorSnapshotFileGateway"]
    end

    subgraph Domain["Domain"]
        Calc["Calculator aggregate"]
        Rules["Domain services and policies"]
    end

    subgraph Infrastructure["Infrastructure"]
        ClipboardAdapter["BrowserClipboardGateway"]
        LocalRepo["LocalStorageCalculatorSnapshotRepository"]
        FileAdapter["BrowserCalculatorSnapshotFileGateway"]
    end

    Screen --> Service
    Keyboard --> Dispatch
    Display --> Copy
    SnapshotButtons --> Transfer
    Service --> Dispatch
    Service --> Copy
    Service --> Transfer
    Dispatch --> Calc
    Copy --> Calc
    Transfer --> Calc
    Calc --> Rules
    Copy --> ClipboardPort
    Transfer --> SnapshotRepoPort
    Transfer --> SnapshotFilePort
    ClipboardAdapter --> ClipboardPort
    LocalRepo --> SnapshotRepoPort
    FileAdapter --> SnapshotFilePort
```

### Flujo por capacidad

```mermaid
flowchart TB
    subgraph Typing["1. Typing y teclado fisico"]
        K1["Evento DOM keydown"] --> K2["translateCalculatorKeyboardEvent"]
        K2 --> K3["dispatchCalculatorAction"]
        K3 --> K4["Calculator"]
    end

    subgraph Copy["2. Copia del display"]
        C1["Doble clic en display"] --> C2["copyDisplayValue"]
        C2 --> C3["ClipboardGateway"]
        C3 --> C4["BrowserClipboardGateway"]
        C4 --> C5["Clipboard API"]
    end

    subgraph Snapshot["3. Persistencia y backup local"]
        S1["Apertura o cambio de estado"] --> S2["hydrate/persist session use cases"]
        S2 --> S3["CalculatorSnapshotRepository"]
        S3 --> S4["localStorage"]
        S5["Click importar / exportar"] --> S6["transferCalculatorSnapshot"]
        S6 --> S3
        S6 --> S7["CalculatorSnapshotFileGateway"]
        S7 --> S8["Browser File APIs"]
    end
```

### Que logica usa que detalle y por que

```mermaid
flowchart TB
    Domain["Domain logic uses no browser detail because calculation rules must stay pure"]
    Application["Application logic uses ports because it coordinates use cases without binding to the browser"]
    UI["UI uses React and DOM events because rendering and interaction belong to delivery"]
    Infrastructure["Infrastructure uses browser APIs because storage, files and clipboard are environment details"]

    UI --> Application
    Application --> Domain
    Infrastructure --> Application
```

### Regla de dependencia

```mermaid
flowchart TB
    Details["Framework and Browser Details"]
    Adapters["UI and Infrastructure Adapters"]
    Application["Application Coordination"]
    Domain["Domain Rules"]

    Details --> Adapters
    Adapters --> Application
    Application --> Domain
```

## Estructura del codigo

```text
src/
  application/
    ports/
      ClipboardGateway.ts
      CalculatorSnapshotFileGateway.ts
      CalculatorSnapshotRepository.ts
    services/
      CalculatorApplicationService.ts
      CalculatorApplicationService.test.ts
    usecases/
      configureCalculatorMode.ts
      copyDisplayValue.ts
      buildPersistedSessionSnapshot.ts
      dispatchCalculatorAction.ts
      hydrateCalculatorState.ts
      persistCalculatorState.ts
      transferCalculatorSnapshot.ts
  domain/
    calculator/
      Calculator.ts
      Calculator.test.ts
      state.ts
      types.ts
      policies/
        numericPolicy.ts
        tapePolicy.ts
      services/
        accountingService.ts
        accountingService.test.ts
        businessMath.ts
        currencyConversionService.ts
        currencyConversionService.test.ts
        expressionEvaluator.ts
        expressionEvaluator.test.ts
        sessionStateService.ts
        sessionStateService.test.ts
        taxService.ts
        taxService.test.ts
  infrastructure/
    clipboard/
      BrowserClipboardGateway.ts
    files/
      BrowserCalculatorSnapshotFileGateway.ts
    persistence/
      LocalStorageCalculatorSnapshotRepository.ts
  ui/
    components/
      CalculatorUI.tsx
      CalculatorUI.css
      CalculatorUI.clipboard.test.tsx
      CalculatorUI.keyboard.test.tsx
    keyboard/
      translateCalculatorKeyboardEvent.ts
      translateCalculatorKeyboardEvent.test.ts
  App.tsx
  App.test.tsx
  index.tsx
```

## Responsabilidades reales por capa

### Domain

`src/domain/calculator/`

Aqui vive la logica importante:

- `Calculator.ts`: entidad principal y flujo operacional
- `types.ts`: lenguaje del dominio
- `state.ts`: estado inicial y saneamiento de snapshots
- `policies/numericPolicy.ts`: redondeo, formato y validacion numerica
- `policies/tapePolicy.ts`: reglas de disponibilidad y recorte de cinta
- `services/accountingService.ts`: subtotal, contadores operativos y grand total
- `services/businessMath.ts`: resolucion de `COST / SELL / MGN`
- `services/currencyConversionService.ts`: conversion monetaria
- `services/expressionEvaluator.ts`: evaluacion y precedencia de expresiones
- `services/sessionStateService.ts`: limpieza, reinicio y transiciones de error
- `services/taxService.ts`: calculos fiscales

Esta capa no depende de React ni de APIs del navegador.

### Application

`src/application/`

Coordina la sesion de calculo:

- `services/CalculatorApplicationService.ts`: fachada de aplicacion
- `usecases/dispatchCalculatorAction.ts`: despacho de acciones de calculadora
- `usecases/copyDisplayValue.ts`: copia del display al portapapeles
- `usecases/buildPersistedSessionSnapshot.ts`: filtro de persistencia automatica para conservar solo configuracion reutilizable
- `usecases/hydrateCalculatorState.ts`: restauracion de estado
- `usecases/persistCalculatorState.ts`: persistencia de estado
- `usecases/configureCalculatorMode.ts`: cambio de modo y selector decimal
- `usecases/transferCalculatorSnapshot.ts`: importacion y exportacion de snapshots
- `ports/ClipboardGateway.ts`: puerto de portapapeles
- `ports/CalculatorSnapshotRepository.ts`: puerto de persistencia
- `ports/CalculatorSnapshotFileGateway.ts`: puerto de importacion/exportacion de archivo

Aqui estan los casos de uso ligeros del sistema. La UI ya no contiene la logica de archivo ni el mapeo principal de persistencia; solo invoca la capa de aplicacion.

El caso de copia del display sigue la misma regla: el doble clic nace en React, pero la operacion de copiado se expresa como `copyDisplayValue.ts` y depende de `ClipboardGateway`, no de `navigator.clipboard` directamente.

### Infrastructure

`src/infrastructure/`

- `persistence/LocalStorageCalculatorSnapshotRepository.ts`: persistencia en `localStorage`
- `clipboard/BrowserClipboardGateway.ts`: escritura al portapapeles del navegador
- `files/BrowserCalculatorSnapshotFileGateway.ts`: lectura y descarga de snapshots en el navegador

Si mañana cambia el almacenamiento o el mecanismo de archivos, el dominio no necesita enterarse.

Lo mismo aplica al portapapeles: si la app corre como web local o PWA en el dispositivo anfitrion, el detalle concreto sigue siendo la API del navegador disponible en ese entorno, no una preocupacion del dominio.

### UI

`src/ui/components/CalculatorUI.tsx`

Renderiza la replica visual, captura eventos de botones y teclado, y delega la logica al servicio de aplicacion.

La traduccion de teclado fisico vive en `src/ui/keyboard/translateCalculatorKeyboardEvent.ts`, con pruebas dedicadas para `typing`, numpad, separador decimal y teclas de control. El display tambien expone doble clic para copiar el valor mostrado como capacidad propia de la app web/PWA.

La ayuda visible de la interfaz ya no presenta `PRINT` como modo. La cinta se considera siempre activa y los modos visibles quedan reducidos a `NORMAL` y `CONVERSION`.

## Scripts

```bash
npm start
npm test -- --watchAll=false
npm run build
```

## Verificacion actual

- Tests de dominio para `ADD2`, conversion, contadores `OPS/SUB`, impuestos, negocio y precedencia
- Tests de aplicacion para hidratacion, persistencia y copiado del display
- Tests de UI para render, operacion basica, typing de teclado fisico y doble clic de copiado
- Build de produccion valido con `react-scripts build`

## Limites actuales

- El dominio ya no es un unico archivo, pero `Calculator` sigue siendo el principal orquestador del comportamiento
- Los casos de uso existen como servicio de aplicacion, no como un archivo por comando
- La persistencia actual es local al navegador, sin backend ni sincronizacion externa

Ese alcance es intencional. El proyecto busca una direccion de arquitectura profesional sin fingir complejidad que todavia no existe.

## Siguiente etapa razonable

- separar casos de uso por comando si el dominio sigue creciendo
- seguir fragmentando `Calculator` en agregados o servicios si aparecen nuevos flujos
- agregar pruebas de infraestructura y flujos de importacion/exportacion
- documentar decisiones arquitectonicas como ADRs pequenas
