# Requisitos no funcionales

"Implementado" significa que el código ya lo aplica. "Objetivo" indica una meta que todavía no se ha medido.

## Rendimiento
| ID | Requisito | Estado |
|---|---|---|
| RNF-01 | El 95 % de las respuestas de la API toma menos de 2 segundos con 50 usuarios concurrentes | Objetivo |
| RNF-02 | El panel web carga en menos de 3 segundos en una conexión de 10 Mbps | Objetivo |

## Seguridad
| ID | Requisito | Estado |
|---|---|---|
| RNF-03 | Las contraseñas se guardan con hash bcrypt | Implementado |
| RNF-04 | La sesión usa JWT y se revalida contra la BD en cada petición | Implementado |
| RNF-05 | Los códigos por correo duran 10 minutos y admiten 5 intentos | Implementado |
| RNF-06 | Se limitan las peticiones a 120 por minuto, y el login a 5 por minuto | Implementado |
| RNF-07 | Toda entrada se valida con DTO y las consultas usan parámetros | Implementado |
| RNF-08 | Cada consulta se filtra por la comunidad del contexto | Implementado en los módulos actuales |
| RNF-09 | Las respuestas no revelan si una cuenta existe | Implementado |
| RNF-10 | El sistema se expone solo por HTTPS en producción | Objetivo |

## Disponibilidad
| ID | Requisito | Estado |
|---|---|---|
| RNF-11 | Disponibilidad mensual de 99 % en producción | Objetivo |
| RNF-12 | Respaldo diario de la base de datos en producción | Objetivo |

## Usabilidad
| ID | Requisito | Estado |
|---|---|---|
| RNF-13 | Un residente completa una reserva en menos de 2 minutos | Objetivo |
| RNF-14 | El panel web funciona desde 360 px de ancho | Objetivo |
| RNF-15 | Los mensajes de error se muestran en español | Implementado en la API |

## Mantenibilidad y trazabilidad
| ID | Requisito | Estado |
|---|---|---|
| RNF-16 | Cobertura de pruebas unitarias del backend de al menos 70 % de sentencias | Implementado: 89,17 % |
| RNF-17 | Toda acción que cambie datos queda en la bitácora | Implementado en los módulos actuales |
| RNF-18 | Las tablas registran fechas de creación, actualización y eliminación | Implementado |
