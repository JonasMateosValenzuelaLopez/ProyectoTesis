USE `entrecasas_db`;

UPDATE `usuarios` SET `estado` = 1 WHERE `estado` IS NULL;
ALTER TABLE `usuarios`
  MODIFY `estado` tinyint(1) NOT NULL DEFAULT 1;

UPDATE `membresias_red` SET `fecha_ingreso` = `fecha_creacion` WHERE `fecha_ingreso` IS NULL;
ALTER TABLE `membresias_red`
  MODIFY `fecha_ingreso` datetime NOT NULL DEFAULT current_timestamp();

UPDATE `redes_vecinales` SET `fecha_registro` = `fecha_creacion` WHERE `fecha_registro` IS NULL;
ALTER TABLE `redes_vecinales`
  MODIFY `fecha_registro` datetime NOT NULL DEFAULT current_timestamp();

UPDATE `solicitudes_acceso` SET `fecha_solicitud` = `fecha_creacion` WHERE `fecha_solicitud` IS NULL;
ALTER TABLE `solicitudes_acceso`
  MODIFY `fecha_solicitud` datetime NOT NULL DEFAULT current_timestamp();

ALTER TABLE `unidades`
  ADD UNIQUE KEY IF NOT EXISTS `uq_unidad_red_numero` (`id_red`, `numero_identificador`);
