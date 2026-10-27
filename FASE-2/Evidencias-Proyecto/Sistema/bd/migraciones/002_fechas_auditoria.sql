-- --------------------------------------------------------
-- Migración 002: fechas de auditoría en todas las tablas.
--   fecha_creacion      -> cuándo se creó la fila (automática)
--   fecha_actualizacion -> último cambio (automática, ON UPDATE)
--   fecha_eliminacion   -> borrado lógico: NULL = vigente; con fecha = eliminada.
--                          Las filas no se borran físicamente.
-- Requiere la migración 001. Compatible con MariaDB 10.11+.
-- Se puede ejecutar más de una vez (usa IF NOT EXISTS).
--
-- Excepción: membresias_roles no lleva fecha_eliminacion. Es la tabla
-- intermedia de una relación ManyToMany y TypeORM no filtra filas con borrado
-- lógico en ellas: un rol "eliminado" seguiría otorgando permisos. Quitar un
-- rol borra la fila; la membresía completa sí tiene borrado lógico.
-- --------------------------------------------------------
USE `entrecasas_db`;

-- Tablas que ya tenían fecha_creacion (nullable): se normaliza a NOT NULL.
UPDATE `muro_publicaciones` SET `fecha_creacion` = current_timestamp() WHERE `fecha_creacion` IS NULL;
ALTER TABLE `muro_publicaciones`
  MODIFY `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp();

UPDATE `tokens_password` SET `fecha_creacion` = current_timestamp() WHERE `fecha_creacion` IS NULL;
ALTER TABLE `tokens_password`
  MODIFY `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp();

ALTER TABLE `categorias_marketplace`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `espacios_comunes`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `gastos_comunes`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `marketplace_publicaciones`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `membresias_red`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `membresias_roles`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();

ALTER TABLE `muro_publicaciones`
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `pagos`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `redes_vecinales`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `registro_accesos`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `reservas`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `roles`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `solicitudes_acceso`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `tokens_password`
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `unidades`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;

ALTER TABLE `visitantes`
  ADD COLUMN IF NOT EXISTS `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  ADD COLUMN IF NOT EXISTS `fecha_eliminacion` datetime DEFAULT NULL;
