USE `entrecasas_db`;

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
