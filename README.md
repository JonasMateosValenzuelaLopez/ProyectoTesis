# EntreCasas
Tu comunidad en tu bolsillo.
 
## Descripción
"EntreCasas" es una plataforma SaaS integral diseñada para modernizar la administración de condominios, villas, departamentos y fomentar la cohesion social entre sus residentes. El sistema resuelve la fragmentación de la comunicación vecinal (habitualmente dispersa en grupos informales de mensajería), la falta de transparencia en los cobros administrativos y la ineficiencia en el control de accesos y reserva de espacios comunes.

El ecosistema articula la gestión operativa, financiera y social mediante dos interfaces principales: 
1. Panel web administrativo: Diseñado para el comité de administración y conserjería, orientado a la gestión de condominios, unidades, residentes, cobro de gastos comunes fijos, control de morosidad y monitoreo de accesos.

2. Aplicación móvil para residentes: Diseñada para el uso diario de los vecinos, permitiendo la visualización de comunicados en el Muro Vecinal, participación en el Marketplace comunitario, gestión de perfil y reservas de recursos físicos.
 
## Tecnologías
- Frontend web: React.js, Material-UI (MUI), React Router DOM, Vite.
- Frontend móvil: React Native, Expo, Expo Router, Typescript/Javascript, Vector Icons. 
- Backend: ...
- Base de datos: Laragon (HeidiSQL).
- Infraestructura / herramientas: Docker (contenerización), Git/GitHub (control de versiones), Vercel/Render (despliegue en la nube).
 
## Ejecución local
1. Requisitos previos (versiones de Node, Java, Python, Docker, etc.).
    - Node.js: v18.0.0 o superior. 
    - npm o yarn.
    - Docker Desktop
    - Expo Go en móvil
2. git clone <https://github.com/JonasMateosValenzuelaLopez/ProyectoTesis>
3. Instalar dependencias.
    - Para el panel web administrativo:
        - cd web-admin
        - npm install
    - Para la aplicación móvil:
        - cd mobile-residentes
        - npm install
4. Copiar .env.example a .env y completar las variables.
    - cp .env.example .env
5. Comando para ejecutar y URL de acceso.
    - Ejecutar panel web administrativo:
        - cd web-admin
        - npm run dev
    - Ejecutar aplicación móvil:
        - cd mobile-residentes
        - npx expo start -c

## Integrantes y roles
|    Integrante    |                   Rol                  |
|------------------|----------------------------------------|
| Camila Retamal   | Desarrolladora backend y Base de datos |
| Jonas Valenzuela | Desarrollador frontend y Base de datos |
 
## Metodología
Se seleccionó la metodología Ágil Scrum. Esta elección permite estructurar el desarrollo incremental del software dividido en Sprints funcionales, facilitar la detección y resolución de bloqueos técnicos, y asegurar la entrega continua de Producto Mínimo Viable (PMV).

Estructura de Sprints:

- Sprint 0: Stack tecnológico, arquitectura y configuración Docker.
- Sprint 1: Identidad y Seguridad (CRUD Condominios, Unidades, Residentes y Roles).
- Sprint 2: Convivencia y Comunidad (Muro Vecinal y Marketplace).
- Sprint 3: Gestión de Recursos Físicos y Accesos (Reservas y Códigos QR).
- Sprint 4: Motor Financiero (Gastos comunes, pagos y comprobantes).

*FALTA UBICACION DE DOCUMENTACION*
 
## Arquitectura
La solución sigue un patrón de Arquitectura N-Capas / Microservicios orientados a API RESTful:

- Capa de Presentación: Compuesta por el Cliente Web SPA (React.js) y el Cliente Móvil (React Native + Expo).
- Capa de Servicios / Negocio: API RESTful en Node.js que procesa la lógica de autenticación, autorización basada en roles (RBAC), control de accesos y emisión de cobros.
- Capa de Datos: Motor relacional PostgreSQL encargado de garantizar la integridad transaccional (ACID) en cobros, reservas y relaciones jerárquicas de viviendas.