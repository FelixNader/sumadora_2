# Casio HR-100TM Calculation Engine

Replica web de una calculadora contable de escritorio inspirada en la `CASIO HR-100TM`. El proyecto no intenta verse como una "demo de botones": su foco es un motor de calculo con reglas operativas, financieras y de persistencia de sesion, expuesto mediante una interfaz React.

## Que hace

- Operaciones aritmeticas con precedencia real entre `+`, `-`, `x` y `/`
- Selector decimal `F`, `3`, `2`, `0` y `ADD2`
- Modos `OFF`, `ON`, `PRINT`, `ITEM` y `CONVERSION`
- Memoria independiente, `grand total`, subtotales y conteo de items
- Impuestos, conversion de moneda y calculos `COST / SELL / MGN`
- Cinta de papel simulada
- Persistencia local con exportacion e importacion de snapshots JSON

## Arquitectura

La implementacion actual sigue una **Clean Architecture ligera**:

- `domain`: reglas puras de la calculadora
- `application`: coordinacion de casos de uso y persistencia
- `infrastructure`: detalles concretos del navegador
- `ui`: adaptadores React para botones, teclado y render

No es una arquitectura corporativa sobredimensionada. El sistema sigue siendo pequeno, pero ahora la separacion entre dominio, aplicacion e infraestructura existe en el codigo y no solo en los diagramas.

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

### Vista de Clean Architecture

```mermaid
flowchart LR
    subgraph Domain["Domain"]
        Calc["Calculator"]
    end

    subgraph Application["Application"]
        Service["CalculatorApplicationService"]
        Port["CalculatorSnapshotRepository"]
    end

    subgraph Infrastructure["Infrastructure"]
        LocalRepo["LocalStorageCalculatorSnapshotRepository"]
    end

    subgraph UI["UI"]
        Screen["CalculatorUI"]
        App["App"]
    end

    App --> Screen
    Screen --> Service
    Service --> Calc
    Service --> Port
    LocalRepo --> Port
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
      CalculatorSnapshotRepository.ts
    services/
      CalculatorApplicationService.ts
      CalculatorApplicationService.test.ts
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
        expressionEvaluator.ts
        expressionEvaluator.test.ts
  infrastructure/
    persistence/
      LocalStorageCalculatorSnapshotRepository.ts
  ui/
    components/
      CalculatorUI.tsx
      CalculatorUI.css
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
- `policies/tapePolicy.ts`: reglas de impresion y recorte de cinta
- `services/accountingService.ts`: subtotal, conteo de items y grand total
- `services/businessMath.ts`: resolucion de `COST / SELL / MGN`
- `services/expressionEvaluator.ts`: evaluacion y precedencia de expresiones

Esta capa no depende de React ni de APIs del navegador.

### Application

`src/application/services/CalculatorApplicationService.ts`

Coordina la sesion de calculo:

- hidrata el dominio desde un repositorio
- traduce acciones de UI a metodos del dominio
- persiste snapshots cuando cambia el estado

Aqui estan los casos de uso ligeros del sistema. No es una capa enorme, pero ya evita que la UI coordine directamente al dominio y la persistencia al mismo tiempo.

### Infrastructure

`src/infrastructure/persistence/LocalStorageCalculatorSnapshotRepository.ts`

Implementa el puerto de persistencia usando `localStorage`. Si mañana el almacenamiento cambia, el dominio no necesita enterarse.

### UI

`src/ui/components/CalculatorUI.tsx`

Renderiza la replica visual, captura eventos de botones y teclado, y delega la logica al servicio de aplicacion.

## Scripts

```bash
npm start
npm test -- --watchAll=false
npm run build
```

## Verificacion actual

- Tests de dominio para `ADD2`, conversion, items, impuestos, negocio y precedencia
- Tests de aplicacion para hidratacion y persistencia
- Tests de UI para render y operacion basica
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
