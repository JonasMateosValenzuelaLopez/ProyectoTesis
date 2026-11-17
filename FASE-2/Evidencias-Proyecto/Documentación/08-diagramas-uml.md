# Diagramas UML

Este documento reúne los cuatro tipos de diagramas UML del sistema: casos de uso, clases, secuencia y componentes. Cada diagrama está escrito en Mermaid, para que GitHub lo muestre directamente, y también se exportó como imagen en la carpeta [diagramas](diagramas/).

| Diagrama | Imagen |
|---|---|
| Casos de uso | [uml-casos-de-uso.png](diagramas/uml-casos-de-uso.png) |
| Clases del dominio | [uml-clases.png](diagramas/uml-clases.png) |
| Secuencia: inicio de sesión | [uml-secuencia-inicio-sesion.png](diagramas/uml-secuencia-inicio-sesion.png) |
| Secuencia: aprobación de una solicitud de acceso | [uml-secuencia-aprobacion-solicitud.png](diagramas/uml-secuencia-aprobacion-solicitud.png) |
| Secuencia: egreso con visado de la Presidencia | [uml-secuencia-egreso-visado.png](diagramas/uml-secuencia-egreso-visado.png) |
| Secuencia: visita con invitación QR | [uml-secuencia-visita-qr.png](diagramas/uml-secuencia-visita-qr.png) |
| Componentes | [uml-componentes.png](diagramas/uml-componentes.png) |

## Casos de uso

Los actores son los seis cargos de una comunidad, el equipo EntreCasas (Plataforma) y la persona que todavía no tiene cuenta. La Presidencia hereda los casos de la Administración cuando la comunidad no contrata un administrador externo.

```mermaid
flowchart LR
    V["«actor»<br/>Persona sin cuenta"]
    R["«actor»<br/>Residente"]
    A["«actor»<br/>Administración"]
    T["«actor»<br/>Tesorería"]
    S["«actor»<br/>Secretaría"]
    P["«actor»<br/>Presidencia"]
    C["«actor»<br/>Conserjería"]
    E["«actor»<br/>Equipo EntreCasas"]

    subgraph Sistema EntreCasas
        CU01([Solicitar acceso a una comunidad])
        CU02([Iniciar sesión con contraseña o código])
        CU03([Gestionar mis datos y contraseña])
        CU04([Avisar una transferencia])
        CU05([Solicitar una exención])
        CU06([Publicar en el muro y el marketplace])
        CU07([Reservar un espacio común])
        CU08([Invitar una visita con QR])
        CU09([Votar y revisar actas])
        CU10([Resolver solicitudes de acceso])
        CU11([Gestionar unidades, residentes y cargos])
        CU12([Activar o desactivar módulos])
        CU13([Moderar el muro y el marketplace])
        CU14([Crear cobros y marcar pagos])
        CU15([Registrar egresos])
        CU16([Controlar la morosidad])
        CU17([Registrar actas y abrir votaciones])
        CU18([Visar egresos y aprobar comunicados])
        CU19([Revisar la bitácora])
        CU20([Validar visitas en la garita])
        CU21([Entregar y recibir espacios reservados])
        CU22([Crear comunidades con su responsable])
        CU23([Suspender comunidades y cambiar módulos])
        CU24([Bloquear cuentas y reenviar el acceso])
    end

    V --> CU01
    R --> CU02
    R --> CU03
    R --> CU04
    R --> CU05
    R --> CU06
    R --> CU07
    R --> CU08
    R --> CU09
    A --> CU10
    A --> CU11
    A --> CU12
    A --> CU13
    A --> CU14
    T --> CU14
    T --> CU15
    T --> CU16
    S --> CU17
    P --> CU18
    P --> CU19
    C --> CU20
    C --> CU21
    E --> CU22
    E --> CU23
    E --> CU24
    CU10 -.->|«include»| CU02
    CU15 -.->|«extend» monto sobre el umbral| CU18
```

## Clases del dominio

Las clases corresponden a las entidades de TypeORM del backend. Se muestran los atributos principales y las relaciones con su multiplicidad.

```mermaid
classDiagram
    direction LR
    class Usuario {
        +int idUsuario
        +string identificador
        +string pais
        +string nombre
        +string correo
        +boolean esPlataforma
        +boolean bloqueado
    }
    class RedVecinal {
        +int idRed
        +string nombre
        +TipoRedVecinal tipo
        +EstadoRedVecinal estado
        +int umbralVisado
    }
    class Modulo {
        +CodigoModulo codigo
        +string nombre
    }
    class RedModulo {
        +boolean activo
    }
    class Unidad {
        +int idUnidad
        +string numeroIdentificador
        +string torre
        +TipoUnidad tipo
    }
    class Rol {
        +int idRol
        +string nombreRol
    }
    class Membresia {
        +boolean activo
        +date desde
        +date hasta
    }
    class Residencia {
        +TipoResidencia tipo
        +int titular
        +date desde
        +date hasta
    }
    class SolicitudAcceso {
        +string numeroUnidad
        +EstadoSolicitud estado
        +datetime privacidadAceptadaEn
        +string versionPrivacidad
    }
    class Cobro {
        +string concepto
        +int montoPorUnidad
        +string periodo
        +date fechaVencimiento
    }
    class CobroUnidad {
        +int monto
        +EstadoCobroUnidad estado
        +datetime pagadoMarcadoEn
    }
    class Egreso {
        +int monto
        +boolean requiereVisado
        +EstadoVisado estadoVisado
    }
    class EspacioComun {
        +string nombre
        +int capacidad
    }
    class Reserva {
        +date fechaReserva
        +string horaInicio
        +EstadoReserva estadoReserva
    }
    class Votacion {
        +string titulo
        +TipoVotacion tipo
        +datetime cierre
    }
    class Voto {
        +int idOpcion
    }
    class MuroPublicacion {
        +TipoPublicacion tipo
        +string contenido
        +EstadoAprobacion estadoAprobacion
        +EstadoModeracion estadoModeracion
    }
    class Invitacion {
        +string codigo
        +datetime validaDesde
        +datetime validaHasta
    }
    class BitacoraAuditoria {
        +AmbitoBitacora ambito
        +string accion
        +json detalle
    }

    Usuario "1" --> "*" Membresia
    Membresia "*" --> "1" Rol
    Membresia "*" --> "1" RedVecinal
    Usuario "1" --> "*" Residencia
    Residencia "*" --> "1" Unidad
    RedVecinal "1" *-- "*" Unidad
    RedVecinal "1" --> "*" RedModulo
    RedModulo "*" --> "1" Modulo
    RedVecinal "1" --> "*" SolicitudAcceso
    SolicitudAcceso "*" --> "0..1" Unidad
    RedVecinal "1" --> "*" Cobro
    Cobro "1" *-- "*" CobroUnidad
    CobroUnidad "*" --> "1" Unidad
    RedVecinal "1" --> "*" Egreso
    RedVecinal "1" --> "*" EspacioComun
    EspacioComun "1" --> "*" Reserva
    Reserva "*" --> "1" Unidad
    RedVecinal "1" --> "*" Votacion
    Votacion "1" *-- "*" Voto
    Voto "*" --> "1" Unidad
    RedVecinal "1" --> "*" MuroPublicacion
    Usuario "1" --> "*" MuroPublicacion
    Unidad "1" --> "*" Invitacion
    RedVecinal "0..1" --> "*" BitacoraAuditoria
    Usuario "0..1" --> "*" BitacoraAuditoria
```

## Secuencia: inicio de sesión

```mermaid
sequenceDiagram
    actor U as Usuario
    participant F as Panel web o app
    participant A as API NestJS
    participant B as MariaDB
    U->>F: Ingresa RUT o correo y contraseña
    F->>A: POST /auth/login
    A->>A: Valida el DTO y el límite de 5 intentos por minuto
    A->>B: Busca la cuenta por identificador o correo
    B-->>A: Cuenta con su hash bcrypt
    A->>A: Compara la contraseña (hash falso si la cuenta no existe)
    alt Contraseña correcta y cuenta no bloqueada
        A->>B: Lee comunidades activas, cargos, módulos y viviendas
        B-->>A: Comunidades
        A-->>F: 200 con el token JWT y las comunidades
        F-->>U: Muestra el inicio de su comunidad
    else Cuenta bloqueada
        A-->>F: 403 CUENTA_BLOQUEADA
    else Credenciales inválidas
        A-->>F: 401 con el mismo mensaje exista o no la cuenta
        F-->>U: Muestra el mensaje de error
    end
```

## Secuencia: aprobación de una solicitud de acceso

```mermaid
sequenceDiagram
    actor V as Persona sin cuenta
    actor A as Administración
    participant API as API NestJS
    participant B as MariaDB
    participant M as Servidor de correo
    V->>API: POST /solicitudes-acceso con aceptaPrivacidad
    API->>B: Guarda la solicitud con la fecha y versión del aviso
    API-->>V: Mensaje genérico de solicitud recibida
    A->>API: GET /solicitudes-acceso (X-Red-Id)
    API->>B: Lista solicitudes y revisa si el correo es de otra cuenta
    API-->>A: Solicitudes con correoAjeno
    A->>API: PATCH /solicitudes-acceso/:id/aprobar
    API->>API: Valida token, cargo, comunidad activa y módulo
    API->>B: Transacción: cuenta, membresía, residencia y bitácora
    B-->>API: Confirmación
    API->>M: Enlace de activación (después del commit)
    API-->>A: Solicitud aprobada y correoEnviado
```

## Secuencia: egreso con visado de la Presidencia

```mermaid
sequenceDiagram
    actor T as Tesorería
    actor P as Presidencia
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
    alt Quien visa registró el egreso
        API-->>P: 403, debe aprobarlo otra persona de la directiva
    else Otra persona de la directiva
        API->>B: Transacción con bloqueo: aprueba o rechaza y registra en la bitácora
        API-->>P: Egreso visado
    end
```

## Secuencia: visita con invitación QR

```mermaid
sequenceDiagram
    actor R as Residente
    actor C as Conserjería
    participant API as API NestJS
    participant B as MariaDB
    R->>API: POST /invitaciones
    API->>B: Guarda la invitación con su código y vigencia
    API-->>R: Código QR para compartir
    C->>API: POST /porteria/validacion con el código
    API->>B: Busca la invitación vigente de la comunidad
    alt Invitación vigente
        API-->>C: Datos de la visita y la unidad
        C->>API: POST /porteria/invitaciones/:id/ingreso
        API->>B: Registra el acceso y la bitácora
        API-->>C: Ingreso registrado
    else Vencida, usada o de otra comunidad
        API-->>C: Rechazo con el motivo
    end
```

## Componentes

Cada componente de la API es un módulo de NestJS. Los clientes solo hablan con la API por HTTP con JWT; los módulos comparten los guards, filtros y validadores de `common` y registran sus cambios en la bitácora.

```mermaid
flowchart TB
    subgraph Clientes
        W[Panel web<br/>React + Vite]
        M[App móvil<br/>Expo / React Native]
    end
    subgraph API["API REST NestJS"]
        AU[auth<br/>login, códigos, Mis datos]
        SO[solicitudes-acceso]
        PL[plataforma<br/>comunidades, personas, bitácora]
        CO[comunidad<br/>datos, guía, contactos, módulos]
        UN[unidades y residentes]
        US[usuarios y roles<br/>cuentas y membresías]
        FI[finanzas<br/>cobros, egresos, exenciones]
        MU[muro y marketplace]
        RE[reservas]
        VO[votaciones y actas]
        AC[accesos<br/>invitaciones, portería, retenciones]
        HO[hogar]
        BI[bitacora]
        MA[mail]
        CM[common<br/>guards, filtros, validadores]
    end
    DB[(MariaDB)]
    SMTP[[Servidor SMTP]]

    W -->|HTTPS + JWT| API
    M -->|HTTPS + JWT| API
    SO --> US
    PL --> US
    UN --> US
    AU --> US
    SO --> BI
    PL --> BI
    CO --> BI
    UN --> BI
    FI --> BI
    MU --> BI
    RE --> BI
    VO --> BI
    AC --> BI
    HO --> BI
    AU --> MA
    SO --> MA
    PL --> MA
    FI --> MA
    MA --> SMTP
    API --> CM
    US --> DB
    BI --> DB
    FI --> DB
    MU --> DB
    RE --> DB
    VO --> DB
    AC --> DB
    CO --> DB
```
