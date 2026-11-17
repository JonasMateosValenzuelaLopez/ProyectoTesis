# Manual técnico

## 1. Requisitos
| Componente | Versión |
|---|---|
| Docker Desktop | Con Docker Compose v2 (para levantar todo con Docker) |
| Node.js | 22.13 o superior, o 24.3 o superior (sin Docker) |
| MariaDB | 10.10 o superior, por ejemplo la de Laragon (sin Docker) |
| Expo Go | Compatible con Expo SDK 58 |

## 2. Instalación
```bash
git clone https://github.com/JonasMateosValenzuelaLopez/ProyectoTesis.git
cd ProyectoTesis/FASE-2/Evidencias-Proyecto/Sistema
```

El sistema se puede levantar completo con Docker (sección 5) o instalando cada parte en el equipo, como se describe a continuación.

**Base de datos.** MariaDB debe trabajar en UTC, porque las fechas con hora se guardan en UTC y los `DEFAULT current_timestamp()` usan la zona de la sesión. En Laragon se agrega `default-time-zone='+00:00'` bajo `[mysqld]` en `my.ini` (menú MySQL → my.ini) y se reinicia MariaDB. Al arrancar, la API comprueba la zona de la sesión y se detiene si no es UTC. Con MariaDB encendido, ejecutar `bd/entrecasas_db.sql` en HeidiSQL (Archivo → Ejecutar archivo SQL, UTF-8). El script borra y recrea `entrecasas_db`, y deja las 40 tablas con los roles y módulos.

**Backend.**
```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

**Panel web.**
```bash
cd frontend/web-admin
npm install
npm run dev
```

**App móvil.**
```bash
cd frontend/mobile-residentes
npm install
npx expo start -c
```

## 3. Configuración del backend
| Variable | Obligatoria | Descripción |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME` | Sí | Conexión a MariaDB |
| `DB_PASSWORD` | No | Puede ir vacía en local |
| `JWT_SECRET` | Sí | Clave de los tokens; 32 caracteres o más fuera de desarrollo |
| `JWT_EXPIRES_IN` | No | Duración del token |
| `FRONTEND_URL` | Sí | URL usada en los enlaces de correo |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma |
| `NODE_ENV` | No | Usar `development` en local y `production` en la nube |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | En producción | Envío de correos |
| `MAIL_FROM` | Con SMTP | Remitente verificado |
| `TRUST_PROXY` | Detrás de un proxy | Número de proxies delante de la API |

**Uso de la API.** Las rutas de una comunidad requieren el token en `Authorization: Bearer` y la comunidad en el header `X-Red-Id`. Todo error responde con esta forma:

```json
{ "statusCode": 400, "codigo": "VALIDACION", "mensaje": "Revisa los datos ingresados", "campos": { "correo": "El correo no es válido" }, "idSolicitud": "…" }
```

| `codigo` | Estado HTTP | Cuándo ocurre |
|---|---|---|
| `VALIDACION` | 400 | Un campo no cumple su formato; `campos` trae un mensaje por campo |
| `SESION_EXPIRADA`, `CONTRASENA_CAMBIADA` | 401 | Hay que volver a iniciar sesión |
| `CUENTA_BLOQUEADA`, `COMUNIDAD_SUSPENDIDA`, `SIN_PERMISO`, `MODULO_INACTIVO` | 403 | La acción no está permitida |
| `NO_ENCONTRADO` | 404 | El registro no existe o es de otra comunidad |
| `CONFLICTO` | 409 | El dato ya existe o cambió mientras se editaba |
| `DEMASIADAS_SOLICITUDES` | 429 | Límite de peticiones; el header `Retry-After` indica cuántos segundos esperar |
| `SOLICITUD_INVALIDA` | Otros 4xx | La petición no se puede procesar |
| `ERROR_INTERNO` | 5xx | Error del servidor; `idSolicitud` permite encontrarlo en el log |

## 4. Despliegue (planificado)
Estos pasos aún no se han ejecutado.

1. Crear una base MariaDB administrada, con proveedor por definir, configurada con `time_zone = '+00:00'`, y ejecutar `bd/entrecasas_db.sql`.
2. Publicar la API en Render con `npm run build` y `npm run start:prod`.
3. Configurar `NODE_ENV=production`, las variables anteriores, SMTP y `TRUST_PROXY=1`.
4. Publicar `frontend/web-admin` en Vercel con `npm run build`.
5. Poner el dominio del panel en `CORS_ORIGINS` y `FRONTEND_URL`.

## 5. Docker
`Sistema/docker-compose.yml` levanta los cuatro servicios del sistema:

| Servicio | Imagen | Puerto en el equipo | Descripción |
|---|---|---|---|
| `db-entrecasas` | `mariadb:11.4` | 3307 | Base de datos; se crea con `bd/entrecasas_db.sql` |
| `api-entrecasas` | `backend/Dockerfile` (`node:24-alpine`) | 3000 | API NestJS en modo desarrollo |
| `web-admin` | `frontend/web-admin/Dockerfile` (`node:24-alpine`) | 5173 | Panel web con Vite |
| `mobile-residentes` | `frontend/mobile-residentes/Dockerfile` (`node:24-slim`) | 8081 | Servidor de Expo para la app móvil |

**Preparación.** Desde `Sistema`, crear tres archivos `.env` a partir de sus ejemplos:

1. `backend/.env` desde `backend/.env.example`, completando `JWT_SECRET`. Las variables `DB_*` no hace falta cambiarlas: el compose las reemplaza para conectarse al contenedor de MariaDB.
2. `frontend/mobile-residentes/.env` desde su `.env.example`, con `EXPO_PUBLIC_API_URL=http://<IP del equipo>:3000`.
3. `.env` desde `.env.example`, con `EXPO_HOST=<IP del equipo>`, para que Expo Go encuentre el servidor desde el celular.

La IP del equipo es la que alcanza el celular, por ejemplo la de Tailscale. Sin `EXPO_HOST` el compose se detiene con un aviso.

**Ejecución.**
```bash
docker compose up --build
```

El compose espera a que MariaDB responda (`healthcheck`) antes de iniciar la API. El código de cada parte se monta como volumen, así que los cambios se recargan sin reconstruir la imagen. Para ver el código QR de Expo se usa `docker compose logs -f mobile-residentes` o `docker attach` sobre ese contenedor.

**Base de datos.** El script `bd/entrecasas_db.sql` solo se ejecuta cuando el volumen `mariadb_data` está vacío, es decir, la primera vez. Para recrear la base después de cambiar el script se usa `docker compose down -v` y luego `docker compose up`, lo que borra todos los datos. El contenedor de MariaDB trabaja en UTC por defecto, que es lo que exige la API. Desde el equipo se puede conectar HeidiSQL a `127.0.0.1:3307` con el usuario `root` y la contraseña `root`.

**Pruebas contra el contenedor.** Las pruebas de integración se ejecutan desde el equipo, no dentro del contenedor. Para usar la MariaDB de Docker basta con poner `DB_PORT=3307` y `DB_PASSWORD=root` en `backend/.env`; el compose sigue usando sus propios valores.

## 6. Problemas frecuentes
| Problema | Causa | Solución |
|---|---|---|
| La API no arranca | Falta una variable obligatoria | Revisar `.env` |
| Error de colación al crear la BD | MariaDB antiguo, como el de XAMPP | Usar MariaDB 10.10 o superior |
| La API no arranca: «La sesión de MariaDB no está en UTC» | MariaDB usa la hora local | Agregar `default-time-zone='+00:00'` en `my.ini` y reiniciar MariaDB |
| No llegan correos | `SMTP_HOST` vacío | En desarrollo se imprimen en la consola |
| `Must use import to load ES Module` | Se ejecutó Jest directamente | Usar `npm test` |
| Respuesta 429 | Límite de peticiones alcanzado | Esperar el tiempo indicado |
| Con Docker, la base no refleja los cambios de `bd/entrecasas_db.sql` | El script solo corre con el volumen vacío | `docker compose down -v` y volver a levantar |
| Con Docker, Expo Go no se conecta | `EXPO_HOST` o `EXPO_PUBLIC_API_URL` no usan la IP que alcanza el celular | Corregir la IP en `Sistema/.env` y en `frontend/mobile-residentes/.env` |
