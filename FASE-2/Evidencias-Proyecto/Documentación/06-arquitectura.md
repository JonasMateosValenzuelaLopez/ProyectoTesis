# Arquitectura

![Arquitectura de EntreCasas](arquitectura.png)

EntreCasas usa una arquitectura en capas, con un backend modular único que expone una API RESTful.

| Capa | Componente | Tecnología | Responsabilidad |
|---|---|---|---|
| Presentación | Panel web | React, MUI, Vite | Administración, tesorería, directiva y conserjería |
| Presentación | App móvil | React Native, Expo | Uso diario de los residentes |
| Servicios | API RESTful | NestJS, TypeORM | Autenticación, permisos y reglas de negocio |
| Datos | Base de datos | MariaDB | Persistencia e integridad transaccional |
| Externo | Correo | SMTP | Códigos de acceso y enlaces de contraseña |

## Módulos del backend
- Implementados: `auth`, `solicitudes-acceso`, `mail`, `bitacora`.
- Roles: `roles` valida al iniciar que los cargos coincidan con la base de datos.
- Plantillas por implementar: `usuarios`, `unidades`, `redes-vecinales`.

## Decisiones
- **Multi-comunidad:** cada petición indica su comunidad con el header `X-Red-Id`. El JWT solo lleva el usuario, y los cargos se consultan en cada petición para que los cambios apliquen al instante.
- **Autorización por cargo:** `JwtAuthGuard` y `RolesGuard` protegen las rutas según cargo y módulo activo.
- **Borrado lógico:** los registros no se eliminan físicamente.
- **Sin pasarela de pago:** los pagos se registran manualmente.

## Estado de la integración
La API y la base de datos ya están conectadas. El panel web y la app móvil aún usan datos de prueba y se conectan a la API en el Sprint 3.
