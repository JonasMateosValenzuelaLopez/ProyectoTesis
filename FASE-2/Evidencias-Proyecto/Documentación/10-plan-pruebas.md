# Plan de pruebas

## Alcance y estado
| Tipo | Herramienta | Alcance | Estado |
|---|---|---|---|
| Unitarias | Jest | Servicios, controladores, guards, filtros, DTO y validadores | 961 pruebas en 73 archivos, todas aprobadas |
| Integración | Peticiones HTTP a la API con una BD real | Cada endpoint de los módulos implementados, con datos de prueba que se borran al terminar | Realizadas de forma manual por módulo; falta automatizarlas con Jest y Supertest |
| Sistema | Manual | Flujos completos en web y móvil | Planificadas para el Sprint 5 |
| Rendimiento | Por definir | RNF-01 con 50 usuarios concurrentes | Planificadas para el Sprint 5 |
| Seguridad | Pruebas manuales y `npm audit` | Permisos, aislamiento entre comunidades y entradas maliciosas | Planificadas para el Sprint 5 |

## Resultados actuales
Medición del 5 de noviembre de 2026 con `npm run test:cov`:

| Métrica | Cobertura |
|---|---|
| Sentencias | 88,21 % |
| Ramas | 82,88 % |
| Funciones | 75,59 % |
| Líneas | 88,69 % |

## Casos principales
| ID | Caso | Resultado esperado | Tipo |
|---|---|---|---|
| CP-01 | Login con credenciales válidas | Token y comunidades | Unitaria |
| CP-02 | Login con credenciales inválidas | 401 sin revelar si la cuenta existe | Unitaria |
| CP-03 | Sexto intento de login en un minuto | 429 | Integración |
| CP-04 | Código vencido o con 5 intentos usados | Rechazado | Unitaria |
| CP-05 | Solicitud de acceso con unidad inválida | Error de validación | Unitaria |
| CP-06 | Aprobar solicitud de otra comunidad | 404 | Unitaria |
| CP-07 | Aprobar solicitud pendiente | Cuenta, cargo, residencia y bitácora creados | Unitaria |
| CP-08 | Ruta sin token | 401 | Integración |
| CP-09 | Ruta con cargo insuficiente | 403 | Unitaria |
| CP-10 | Campo inesperado en el body | 400 | Integración |
| CP-11 | Marcar un cobro como pagado | Queda quién marcó y cuándo | Integración |
| CP-12 | Reservar un bloque ocupado | Rechazado sin crear reserva | Integración |
| CP-13 | Petición con `X-Red-Id` de una comunidad ajena | 403 | Unitaria e integración |
| CP-14 | Petición a una comunidad suspendida | 403 con código `COMUNIDAD_SUSPENDIDA` | Unitaria |
| CP-15 | Egreso con monto igual o mayor al umbral | Queda por visar del Presidente | Unitaria e integración |
| CP-16 | Comunicado de la Administración sin aprobar | No aparece en el muro de los residentes | Unitaria e integración |
| CP-17 | Crear en lote unidades que ya existen | Se omiten y se informan | Unitaria e integración |
| CP-18 | Tesorero consulta la bitácora de la comunidad | 403 | Unitaria e integración |
| CP-19 | Body con un JSON mal formado | 400 con el mensaje «El cuerpo de la solicitud no es un JSON válido» | Integración |

## Criterios de aceptación
- El 100 % de las pruebas unitarias e integración pasa antes de integrar a `main`.
- La cobertura de sentencias del backend se mantiene en 70 % o más.
- No quedan errores críticos abiertos antes de la entrega.

## Cómo ejecutar
Desde `FASE-2/Evidencias-Proyecto/Sistema/backend`:

```bash
npm test
npm run test:cov
```
