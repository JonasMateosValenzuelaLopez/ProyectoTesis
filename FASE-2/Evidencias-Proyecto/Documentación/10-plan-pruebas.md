# Plan de pruebas

## 1. Objetivo
Verificar que la API de EntreCasas cumple sus reglas de negocio, que protege los datos de cada comunidad y que responde dentro de los tiempos definidos en los requisitos no funcionales ([09-requisitos-no-funcionales.md](09-requisitos-no-funcionales.md)), antes de cada integración a `main` y antes de la entrega.

## 2. Alcance
| Incluido | Excluido |
|---|---|
| API REST (NestJS) y su integración con MariaDB | Pruebas automatizadas de interfaz del panel web y de la app móvil (se prueban de forma manual, ver tipo «Sistema») |
| Autenticación, autorización por cargo y por comunidad, validación de entradas | Pruebas de carga sobre la infraestructura de producción (ya desplegada; las pruebas de rendimiento se ejecutaron en local) |
| Rendimiento de la API con 50 usuarios concurrentes (RNF-01) | Envío real de correos (en pruebas el SMTP está apagado y los correos quedan en el registro) |

## 3. Tipos de prueba
| Tipo | Herramienta | Qué valida | Dónde está | Cómo se ejecuta |
|---|---|---|---|---|
| Unitarias | Jest con mocks nativos | Servicios, controladores (guards, cargos y límites), guards, filtros, DTO y validadores, cada uno aislado | `backend/src/**/*.spec.ts` (114 archivos) | `npm test` |
| Integración | Jest + Supertest + MariaDB real | La API completa (`AppModule`) con la misma configuración de producción, contra una base de datos creada desde `bd/entrecasas_db.sql` | `backend/test/integracion.e2e-spec.ts` | `npm run test:e2e` |
| Seguridad | Jest + Supertest + MariaDB real | Autenticación, tokens alterados o vencidos, cargos, aislamiento entre comunidades, inyección SQL, asignación masiva, límite de peticiones, anti-enumeración y que no se filtren hashes ni detalles internos | `backend/test/seguridad.e2e-spec.ts` | `npm run test:e2e` |
| Rendimiento | Jest + Supertest + `perf_hooks` | Percentil 95 de los tiempos de respuesta con 50 usuarios concurrentes (RNF-01), escrituras concurrentes sin pérdidas y estrés de inicio de sesión | `backend/test/rendimiento.e2e-spec.ts` | `npm run test:e2e` |
| Sistema | Manual | Flujos completos en el panel web y la app móvil con cada cargo | Lista de verificación de la sección 6.5 | Manual, por sprint |

### Ambiente de las pruebas de integración, seguridad y rendimiento
- Cada suite crea desde cero la base de datos **`entrecasas_test`** a partir de `bd/entrecasas_db.sql`. Nunca usa `entrecasas_db`: si se configura ese nombre, las pruebas se detienen antes de conectarse (`test/utilidades/entorno.ts`).
- La API se levanta con `AppModule` y `configurarApp` (`src/config/configurar-app.ts`), la misma función que usa `main.ts`: validación estricta, filtro de errores, límites de peticiones y CORS.
- El escenario de datos (`test/utilidades/escenario.ts`) se crea **usando la propia API**: una cuenta del equipo EntreCasas crea dos comunidades con su responsable; una persona sin cuenta envía una solicitud de acceso aceptando el aviso de privacidad y la Presidencia la aprueba.
- Cada petición se envía con una IP distinta en `X-Forwarded-For` (con `TRUST_PROXY=1`), para simular usuarios distintos frente al límite de peticiones por IP. Las pruebas del límite usan una IP fija.

## 4. Casos de prueba

### 4.1 Unitarias (resumen por área)
| ID | Caso | Resultado esperado | Archivo de ejemplo |
|---|---|---|---|
| CP-U01 | Login con credenciales válidas | Token y comunidades activas | `auth/auth.service.spec.ts` |
| CP-U02 | Código por correo vencido o con 5 intentos usados | Rechazado sin revelar el motivo | `auth/auth.service.spec.ts` |
| CP-U03 | Aprobar una solicitud de otra comunidad | 404 | `solicitudes-acceso/solicitudes-acceso.service.spec.ts` |
| CP-U04 | Rechazar una solicitud cuyo correo es de otra persona | No se envía el correo, `correoAjeno: true` | `solicitudes-acceso/solicitudes-acceso.service.spec.ts` |
| CP-U05 | Egreso con monto igual o mayor al umbral | Queda por visar de la Presidencia | `finanzas/egresos.service.spec.ts` |
| CP-U06 | Visar un egreso registrado por la misma persona | 403 | `finanzas/egresos.service.spec.ts` |
| CP-U07 | Comunicado de la Administración sin aprobar | No aparece a los residentes | `muro/*.spec.ts` |
| CP-U08 | Ruta con cargo insuficiente o comunidad suspendida | 403 con su código | `auth/guards/roles.guard.spec.ts` |
| CP-U09 | Activar o desactivar un módulo sin cambio de estado | No escribe ni registra en la bitácora | `redes-vecinales/cambiar-modulo.spec.ts` |
| CP-U10 | Búsqueda de personas con `%` o `_` | Se escapan los comodines de LIKE | `plataforma/personas-plataforma.service.spec.ts` |
| CP-U11 | `TRUST_PROXY` con un valor inválido | La API no arranca | `config/configurar-app.spec.ts` |

### 4.2 Integración (`test/integracion.e2e-spec.ts`)
| ID | Caso | Resultado esperado |
|---|---|---|
| CP-I01 | El equipo EntreCasas lista las comunidades creadas | Las dos comunidades con su responsable (Presidencia) |
| CP-I02 | Alta de una villa de 1 manzana con 5 casas | La API generó las unidades 1 a 5 |
| CP-I03 | Iniciar sesión con la cuenta aprobada | Cargo Residente y la vivienda 3 como Propietario |
| CP-I04 | Solicitud aprobada | Guarda `privacidadAceptadaEn`, `versionPrivacidad` y `correoAjeno: false` |
| CP-I05 | Solicitud sin aceptar el aviso de privacidad | 400 con el mensaje del campo `aceptaPrivacidad` |
| CP-I06 | La administración apaga el módulo muro | El residente recibe 403 en `/muro`; antes recibía 200 |
| CP-I07 | La administración intenta cambiar `administrador_externo` | 403 «Este módulo solo lo cambia el equipo EntreCasas» |
| CP-I08 | Segunda reserva del mismo bloque y día | 201 la primera, 409 la segunda |
| CP-I09 | Plataforma bloquea una cuenta | Login 403 `CUENTA_BLOQUEADA`, el token ya emitido deja de servir; al desbloquear vuelve a entrar |
| CP-I10 | Buscar a una persona por su RUT escrito con puntos | La encuentra con su comunidad y cargo |

### 4.3 Seguridad (`test/seguridad.e2e-spec.ts`)
| ID | Caso | Resultado esperado | Riesgo que cubre |
|---|---|---|---|
| CP-S01 | Rutas protegidas sin token (`/auth/perfil`, `/plataforma/comunidades`, `/unidades`) | 401 | Acceso sin autenticación |
| CP-S02 | Token con la firma alterada | 401 | Falsificación de tokens |
| CP-S03 | Token firmado con otra clave | 401 | Falsificación de tokens |
| CP-S04 | Token vencido | 401 | Reutilización de sesiones |
| CP-S05 | Login con cuenta inexistente y con contraseña incorrecta | Mismo estado, código y mensaje | Enumeración de cuentas (RNF-09) |
| CP-S06 | Seis intentos de login en un minuto desde la misma IP | 401 ×5 y 429 el sexto | Fuerza bruta (RNF-06) |
| CP-S07 | Revisión de `usuarios.password_hash` en la BD | Todos con formato bcrypt `$2…$10$`, ninguno en texto plano | Robo de contraseñas (RNF-03) |
| CP-S08 | Respuestas de login y de Personas | No contienen `password` ni hashes bcrypt | Exposición de datos sensibles |
| CP-S09 | Residente llama una ruta de la administración | 403 | Escalamiento de privilegios |
| CP-S10 | Cuenta de una comunidad llama una ruta de Plataforma | 403 | Escalamiento de privilegios |
| CP-S11 | `X-Red-Id` de una comunidad a la que no pertenece | 403 | Acceso entre comunidades (RNF-08) |
| CP-S12 | Ruta de comunidad sin `X-Red-Id` | 400 | Contexto de comunidad obligatorio |
| CP-S13 | Editar una unidad de otra comunidad | Rechazado y la unidad no aparece en la otra comunidad | Acceso entre comunidades (RNF-08) |
| CP-S14 | El equipo EntreCasas intenta bloquear su propia cuenta | 409 | Bloqueo accidental de la administración |
| CP-S15 | Identificadores con inyección SQL (`' OR '1'='1`, `; DROP TABLE`…) | 400 y la tabla sigue existiendo | Inyección SQL (RNF-07) |
| CP-S16 | Búsqueda con `' OR 1=1 --`, `%%` o `_%` | 200 sin resultados: se tratan como texto | Inyección SQL y comodines de LIKE |
| CP-S17 | Solicitud con `idRol` y `esPlataforma` agregados | 400 «Este campo no está permitido» | Asignación masiva |
| CP-S18 | JSON mal formado | 400 «El cuerpo de la solicitud no es un JSON válido» | Entradas malformadas |
| CP-S19 | Id de ruta `1 OR 1=1` | 400 | Inyección en parámetros |
| CP-S20 | Error 404 de un recurso inexistente | Formato común `{ statusCode, codigo, mensaje, idSolicitud }`, sin SQL ni stack | Filtración de detalles internos |

### 4.4 Rendimiento (`test/rendimiento.e2e-spec.ts`)
| ID | Escenario | Criterio |
|---|---|---|
| CP-R01 | 50 usuarios concurrentes hacen 10 lecturas cada uno (500 peticiones: perfil, muro, espacios, unidades, solicitudes y módulos) | 0 errores y p95 < 2 s (RNF-01) |
| CP-R02 | 50 usuarios inician sesión repartidos en 10 segundos y navegan 3 pantallas | 0 errores y p95 < 2 s (RNF-01) |
| CP-R03 | Estrés: 50 inicios de sesión en el mismo instante, cada uno seguido de 3 pantallas | 0 errores (se registra el tiempo como límite conocido) |
| CP-R04 | 50 publicaciones simultáneas en el muro | 0 errores, p95 < 2 s y exactamente 50 filas nuevas en la BD (sin pérdidas) |

## 5. Criterios
### Entrada
- El código compila (`npx tsc --noEmit`) y pasa el lint (`npm run lint`).
- MariaDB 10.10 o superior disponible localmente para las pruebas con BD.

### Aceptación y salida
- El 100 % de las pruebas unitarias, de integración, de seguridad y de rendimiento pasa antes de integrar a `main`.
- La cobertura de sentencias del backend se mantiene en 70 % o más (objetivo específico 3 de la Guía 1.5).
- El p95 de la API es menor a 2 segundos con 50 usuarios concurrentes (RNF-01).
- No quedan errores críticos ni de seguridad abiertos antes de la entrega.

### Suspensión
- Si falla una prueba de seguridad, no se integra a `main` hasta corregirla.

## 6. Resultados
Ejecución del 16 de noviembre de 2026, en un notebook con Windows 10, Node 24 y MariaDB 12.3 (Laragon).

### 6.1 Resumen
| Tipo | Archivos | Pruebas | Resultado |
|---|---|---|---|
| Unitarias | 114 | 1863 | Todas aprobadas |
| Integración | 1 | 10 | Todas aprobadas |
| Seguridad | 1 | 26 | Todas aprobadas |
| Rendimiento | 1 | 4 | Todas aprobadas |

### 6.2 Cobertura de las pruebas unitarias (`npm run test:cov`)
| Métrica | Cobertura |
|---|---|
| Sentencias | 91,42 % |
| Ramas | 85,66 % |
| Funciones | 78,38 % |
| Líneas | 91,61 % |

### 6.3 Rendimiento
| Escenario | Peticiones | Errores | Promedio | p50 | p95 | Máximo |
|---|---|---|---|---|---|---|
| CP-R01 Lecturas, 50 usuarios concurrentes | 500 | 0 | 442 ms | 447 ms | **601 ms** | 653 ms |
| CP-R02 Sesiones repartidas en 10 s | 200 | 0 | 58 ms | 13 ms | **181 ms** | 349 ms |
| CP-R03 Estrés: 50 logins simultáneos (solo login) | 50 | 0 | 6780 ms | 6784 ms | 6875 ms | 6881 ms |
| CP-R04 Escrituras concurrentes en el muro | 50 | 0 | 574 ms | 594 ms | **616 ms** | 616 ms |

RNF-01 se cumple en los escenarios de uso (CP-R01, CP-R02 y CP-R04).

### 6.4 Hallazgos
| ID | Hallazgo | Impacto | Acción |
|---|---|---|---|
| H-01 | Con 50 inicios de sesión en el mismo instante (CP-R03) el login tarda cerca de 7 s, aunque ninguno falla. La causa es `bcryptjs`, que calcula el hash en JavaScript en el hilo principal: los logins simultáneos se atienden uno tras otro (~130 ms cada uno). | Bajo en el uso esperado: con los mismos 50 usuarios repartidos en 10 s el p95 es 181 ms (CP-R02). | Mejora planificada: usar `bcrypt` nativo o un pool de *worker threads* para calcular los hashes en paralelo, sin bajar el costo de 10 rondas. |
| H-02 | La extensión Console Ninja de VS Code puede cortar los procesos de Jest con `ECONNRESET` en la corrida con cobertura. | Solo afecta el ambiente de desarrollo; las pruebas pasan al repetirlas. | Desactivar la extensión al medir cobertura. |

### 6.5 Pruebas de sistema (manuales)
| Flujo | Cargo | Estado |
|---|---|---|
| Crear una comunidad con su responsable y activar módulos | Equipo EntreCasas | Por ejecutar |
| Solicitar acceso desde la app y aprobarlo en el panel | Persona sin cuenta y Administración | Por ejecutar |
| Iniciar sesión en el panel y en la app con contraseña | Todos | Por ejecutar |
| Bloquear, desbloquear y reenviar el acceso a una persona | Equipo EntreCasas | Por ejecutar |
| Crear un cobro, avisar la transferencia y marcar el pago | Tesorería y Residente | Por ejecutar |
| Reservar, entregar y recibir un espacio común | Residente y Conserjería | Por ejecutar |
| Invitar una visita con QR y validarla en la garita | Residente y Conserjería | Por ejecutar |

## 7. Cómo ejecutar
Desde `FASE-2/Evidencias-Proyecto/Sistema/backend`, con MariaDB encendido y el `.env` configurado:

```bash
npm test
npm run test:cov
npm run test:e2e
```

`npm run test:e2e` recrea desde cero la base `entrecasas_test` al inicio de cada suite (la base queda disponible al terminar, para revisarla); usa las credenciales `DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASSWORD` del `.env`. Para usar otro nombre de base, definir `DB_NAME_PRUEBAS`. Para correrlas contra la MariaDB de Docker, usar `DB_PORT=3307` y `DB_PASSWORD=root` (ver la sección 5 del manual técnico).
