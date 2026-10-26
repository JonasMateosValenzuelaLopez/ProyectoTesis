-- --------------------------------------------------------
-- Migración 003: restricciones que el backend ya asume.
--   * Columnas con DEFAULT pero nullable pasan a NOT NULL (las entidades las
--     tratan como siempre presentes).
--   * Una unidad no puede repetir su número dentro de la misma comunidad: la
--     solicitud de acceso busca la unidad por (id_red, numero_identificador) y
--     con duplicados la elección sería arbitraria.
-- Requiere la migración 002. Compatible con MariaDB 10.11+.
-- Se puede ejecutar más de una vez (UPDATE/MODIFY idempotentes, IF NOT EXISTS).
--
-- ANTES DE EJECUTAR, revisar que no haya unidades repetidas. La colación no
-- distingue mayúsculas ni tildes, así que "A-101" y "a-101" cuentan como la
-- misma. El índice incluye las filas con borrado lógico (igual que RUT y
-- correo en usuarios): para "recrear" una unidad eliminada hay que restaurarla.
--
--   SELECT id_red, numero_identificador, COUNT(*) AS repetidas
--   FROM unidades
--   GROUP BY id_red, numero_identificador
--   HAVING COUNT(*) > 1;
--
-- Si devuelve filas, renombrar o fusionar esas unidades antes de seguir.
-- --------------------------------------------------------
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
