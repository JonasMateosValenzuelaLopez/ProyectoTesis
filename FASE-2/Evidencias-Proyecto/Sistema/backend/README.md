# EntreCasas: API

API RESTful de EntreCasas, construida con NestJS 12, TypeORM y MariaDB. Atiende al panel web (`frontend/web-admin`) y a la app móvil (`frontend/mobile-residentes`).

## Puesta en marcha
Requiere Node.js 22.13 o superior (o 24.3 o superior) y MariaDB 10.10 o superior configurado en UTC, con la base creada desde `../bd/entrecasas_db.sql`. Los pasos completos están en el [manual técnico](../../Documentación/11-manual-tecnico.md).

```bash
npm install
cp .env.example .env
npm run start:dev
```

La API queda en http://localhost:3000. Sin `SMTP_HOST`, los correos se imprimen en la consola.

## Comandos
| Comando | Uso |
|---|---|
| `npm run start:dev` | Desarrollo, con recarga al guardar |
| `npm run build` y `npm run start:prod` | Compilar y ejecutar en producción |
| `npm test` | Pruebas unitarias; Jest no se ejecuta directamente con `npx jest` |
| `npm run test:cov` | Cobertura de pruebas |
| `npm run lint` | Análisis estático con oxlint |
| `npm run format` | Formato con prettier |

## Estructura de `src`
| Carpeta | Contenido |
|---|---|
| `auth` | Login, códigos por correo, perfil, recuperación de contraseña, guards y decoradores de cargo y módulo |
| `solicitudes-acceso` | Solicitudes de vecinos y su resolución |
| `plataforma` | Panel del equipo EntreCasas: comunidades, módulos, alta y bitácora de plataforma |
| `unidades`, `residentes`, `usuarios` | Unidades, padrón, cargos, cuentas, membresías y residencias |
| `comunidad`, `hogar` | Guía de bienvenida, contactos y fichas de Mi hogar |
| `finanzas` | Cobros, pagos, avisos, morosidad, egresos, exenciones y reportes |
| `muro` | Muro Vecinal, comunicados, reportes y moderación |
| `bitacora` | Registro de auditoría y su consulta |
| `mail` | Envío de correos |
| `common` | Filtro de errores, pipes, validadores, enums y utilidades |
| `config`, `roles` | Configuración validada al arrancar y verificación de los cargos |

## Convenciones
- Las rutas de una comunidad reciben el token en `Authorization: Bearer` y la comunidad en `X-Red-Id`; los cargos se revisan en cada petición.
- Las respuestas usan camelCase y los errores tienen la forma `{ statusCode, codigo, mensaje, campos?, idSolicitud }`, descrita en el [manual técnico](../../Documentación/11-manual-tecnico.md).
- Toda entrada pasa por un DTO, y toda acción que cambia datos queda en la bitácora.
