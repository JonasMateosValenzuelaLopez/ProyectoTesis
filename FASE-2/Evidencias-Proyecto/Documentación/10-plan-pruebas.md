# Plan de pruebas

## Alcance y estado
| Tipo | Herramienta | Alcance | Estado |
|---|---|---|---|
| Unitarias | Jest | Servicios, controladores, guards, filtros, DTO y validadores | 256 pruebas en 17 archivos, todas aprobadas |
| Integración | Jest y Supertest | Login, solicitudes y flujos con BD temporal | Planificadas para el Sprint 3 |
| Sistema | Manual | Flujos completos en web y móvil | Planificadas para el Sprint 5 |
| Rendimiento | Por definir | RNF-01 con 50 usuarios concurrentes | Planificadas para el Sprint 5 |
| Seguridad | Pruebas manuales y `npm audit` | Permisos, aislamiento entre comunidades y entradas maliciosas | Planificadas para el Sprint 5 |

## Resultados actuales
Medición del 1 de noviembre de 2026 con `npm run test:cov`:

| Métrica | Cobertura |
|---|---|
| Sentencias | 76,94 % |
| Ramas | 78,27 % |
| Funciones | 60,67 % |
| Líneas | 78,37 % |

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
