# Definition of Done

Una historia de usuario está terminada cuando cumple todo lo siguiente:

- [ ] Cumple sus criterios de aceptación del Product Backlog.
- [ ] El otro integrante revisó el código.
- [ ] El backend compila con `npm run build` y pasa `npm run lint`.
- [ ] Tiene pruebas unitarias y `npm test` pasa completo.
- [ ] Los endpoints validan sus entradas con DTO y aplican guards de autenticación y cargo.
- [ ] Las consultas filtran por la comunidad del contexto.
- [ ] Las acciones que cambian datos quedan en la bitácora.
- [ ] La vista consume la API real, no datos de prueba.
- [ ] Los cambios de esquema están en `bd/entrecasas_db.sql`.
- [ ] La documentación afectada está actualizada.
- [ ] El cambio está integrado en `main`.
