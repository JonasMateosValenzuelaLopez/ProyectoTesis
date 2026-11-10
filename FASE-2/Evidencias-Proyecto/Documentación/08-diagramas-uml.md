# Diagramas UML

## Casos de uso
```mermaid
flowchart LR
    R([Residente]) --> CU1[Solicitar acceso]
    R --> CU2[Iniciar sesión]
    R --> CU3[Avisar transferencia]
    R --> CU4[Publicar en muro y marketplace]
    R --> CU5[Reservar espacio]
    R --> CU6[Invitar visita con QR]
    R --> CU16[Solicitar exención]
    A([Administrador]) --> CU2
    A --> CU7[Resolver solicitudes]
    A --> CU8[Gestionar unidades y residentes]
    A --> CU17[Asignar cargos]
    A --> CU18[Moderar el muro]
    T([Tesorero]) --> CU9[Crear cobros]
    T --> CU10[Marcar pagos]
    T --> CU11[Controlar morosidad]
    T --> CU19[Registrar egresos]
    S([Secretario]) --> CU12[Registrar actas y votaciones]
    P([Presidente]) --> CU13[Revisar bitácora]
    P --> CU14[Visar egresos]
    P --> CU20[Aprobar comunicados y exenciones]
    C([Conserje]) --> CU15[Validar visitas]
    E([Equipo EntreCasas]) --> CU21[Crear comunidades]
    E --> CU22[Activar módulos y suspender comunidades]
```

## Clases
```mermaid
classDiagram
    class Usuario {
        +int idUsuario
        +string identificador
        +string pais
        +string correo
        +string primerApellido
        +string segundoApellido
        +boolean bloqueado
        +boolean esPlataforma
    }
    class RedVecinal {
        +int idRed
        +string nombre
        +string estado
    }
    class Unidad {
        +int idUnidad
        +string numeroIdentificador
    }
    class Rol {
        +int idRol
        +string nombre
    }
    class Membresia {
        +boolean activo
        +date desde
        +date hasta
    }
    class Residencia {
        +string tipo
        +date desde
        +date hasta
    }
    Usuario "1" --> "*" Membresia
    Membresia "*" --> "1" Rol
    Membresia "*" --> "1" RedVecinal
    Usuario "1" --> "*" Residencia
    Residencia "*" --> "1" Unidad
    RedVecinal "1" --> "*" Unidad
```

## Secuencia: inicio de sesión
```mermaid
sequenceDiagram
    actor U as Usuario
    participant F as Frontend
    participant A as API NestJS
    participant B as MariaDB
    U->>F: Ingresa credenciales
    F->>A: POST /auth/login
    A->>B: Busca usuario y comunidades
    B-->>A: Datos del usuario
    alt Credenciales válidas
        A-->>F: Token y comunidades
        F-->>U: Muestra el inicio
    else Credenciales inválidas
        A-->>F: 401
        F-->>U: Muestra mensaje de error
    end
```

## Secuencia: aprobación de solicitud
```mermaid
sequenceDiagram
    actor A as Administrador
    participant API as API NestJS
    participant B as MariaDB
    participant M as Correo
    A->>API: PATCH /solicitudes-acceso/:id/aprobar
    API->>API: Valida token, cargo y comunidad
    API->>B: Transacción: cuenta, cargo, residencia y bitácora
    B-->>API: Confirmación
    API->>M: Envía enlace de activación
    API-->>A: Resultado y correoEnviado
```

## Secuencia: egreso con visado
```mermaid
sequenceDiagram
    actor T as Tesorero
    actor P as Presidente
    participant API as API NestJS
    participant B as MariaDB
    T->>API: POST /finanzas/egresos
    API->>B: Lee el umbral de visado de la comunidad
    alt Monto igual o mayor al umbral
        API->>B: Guarda el egreso por visar y la bitácora
    else Monto menor al umbral
        API->>B: Guarda el egreso sin visado y la bitácora
    end
    API-->>T: Egreso creado
    P->>API: POST /finanzas/egresos/:id/visado
    API->>B: Transacción: aprueba o rechaza y registra en bitácora
    API-->>P: Egreso visado
```

## Componentes
```mermaid
flowchart TB
    subgraph Clientes
        W[Panel web]
        M[App móvil]
    end
    subgraph API NestJS
        AU[auth]
        SO[solicitudes-acceso]
        PL[plataforma]
        UN[unidades y residentes]
        CM[comunidad y hogar]
        FI[finanzas]
        MU[muro]
        US[usuarios: cuentas y membresías]
        BI[bitacora]
        MA[mail]
        CO[common: guards, filtros y validadores]
    end
    W --> AU
    W --> SO
    W --> PL
    W --> UN
    W --> FI
    W --> MU
    W --> BI
    M --> AU
    M --> SO
    M --> CM
    M --> FI
    M --> MU
    SO --> US
    PL --> US
    UN --> US
    SO --> BI
    PL --> BI
    UN --> BI
    CM --> BI
    FI --> BI
    MU --> BI
    SO --> MA
    AU --> MA
    FI --> MA
    MU --> MA
    AU --> DB[(MariaDB)]
    US --> DB
    FI --> DB
    MU --> DB
    BI --> DB
```
