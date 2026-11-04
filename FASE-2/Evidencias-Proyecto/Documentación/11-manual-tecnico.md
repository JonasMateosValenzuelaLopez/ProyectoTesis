# Manual técnico

## 1. Requisitos
| Componente | Versión |
|---|---|
| Node.js | 22.13 o superior, o 24.3 o superior |
| MariaDB | 10.10 o superior (Laragon la incluye) |
| Expo Go | Compatible con Expo SDK 58 |

## 2. Instalación
```bash
git clone https://github.com/JonasMateosValenzuelaLopez/ProyectoTesis.git
cd ProyectoTesis/FASE-2/Evidencias-Proyecto/Sistema
```

**Base de datos.** MariaDB debe trabajar en UTC, porque las fechas con hora se guardan en UTC y los `DEFAULT current_timestamp()` usan la zona de la sesión. En Laragon se agrega `default-time-zone='+00:00'` bajo `[mysqld]` en `my.ini` (menú MySQL → my.ini) y se reinicia MariaDB. Al arrancar, la API comprueba la zona de la sesión y se detiene si no es UTC. Con MariaDB encendido, ejecutar `bd/entrecasas_db.sql` en HeidiSQL (Archivo → Ejecutar archivo SQL, UTF-8). El script borra y recrea `entrecasas_db`, y deja las 39 tablas con los roles y módulos.

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

## 4. Despliegue (planificado)
Estos pasos aún no se han ejecutado.

1. Crear una base MariaDB administrada, con proveedor por definir, configurada con `time_zone = '+00:00'`, y ejecutar `bd/entrecasas_db.sql`.
2. Publicar la API en Render con `npm run build` y `npm run start:prod`.
3. Configurar `NODE_ENV=production`, las variables anteriores, SMTP y `TRUST_PROXY=1`.
4. Publicar `frontend/web-admin` en Vercel con `npm run build`.
5. Poner el dominio del panel en `CORS_ORIGINS` y `FRONTEND_URL`.

## 5. Docker (pendiente)
El repositorio incluye `backend/Dockerfile` y `docker-compose.yml`, pero aún no se usan. Se implementan al cierre del proyecto con estos ajustes:

1. Cambiar la imagen a `node:24-alpine`.
2. Agregar `JWT_SECRET` y `FRONTEND_URL` al compose.
3. Montar `bd/entrecasas_db.sql` en `/docker-entrypoint-initdb.d`.
4. Agregar un `healthcheck` a MariaDB.
5. Iniciar MariaDB en UTC con `command: --default-time-zone=+00:00`.

Una vez ajustado, el sistema se levantará con `docker compose up --build`.

## 6. Problemas frecuentes
| Problema | Causa | Solución |
|---|---|---|
| La API no arranca | Falta una variable obligatoria | Revisar `.env` |
| Error de colación al crear la BD | MariaDB antiguo, como el de XAMPP | Usar MariaDB 10.10 o superior |
| La API no arranca: «La sesión de MariaDB no está en UTC» | MariaDB usa la hora local | Agregar `default-time-zone='+00:00'` en `my.ini` y reiniciar MariaDB |
| No llegan correos | `SMTP_HOST` vacío | En desarrollo se imprimen en la consola |
| `Must use import to load ES Module` | Se ejecutó Jest directamente | Usar `npm test` |
| Respuesta 429 | Límite de peticiones alcanzado | Esperar el tiempo indicado |
