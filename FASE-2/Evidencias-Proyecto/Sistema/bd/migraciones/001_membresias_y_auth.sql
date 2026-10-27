USE `entrecasas_db`;

CREATE TABLE IF NOT EXISTS `membresias_red` (
  `id_membresia` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_red` int(11) NOT NULL,
  `id_unidad` int(11) DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_ingreso` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_membresia`),
  UNIQUE KEY `uq_membresia_usuario_red` (`id_usuario`,`id_red`),
  KEY `id_red` (`id_red`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `fk_membresia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `membresias_roles` (
  `id_membresia` int(11) NOT NULL,
  `id_rol` int(11) NOT NULL,
  PRIMARY KEY (`id_membresia`,`id_rol`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `fk_membresia_rol_membresia` FOREIGN KEY (`id_membresia`) REFERENCES `membresias_red` (`id_membresia`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_rol_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT IGNORE INTO `membresias_red` (`id_usuario`, `id_red`, `id_unidad`, `estado`)
SELECT u.`id_usuario`, un.`id_red`, u.`id_unidad`, 1
FROM `usuarios` u
JOIN `unidades` un ON un.`id_unidad` = u.`id_unidad`;

INSERT IGNORE INTO `membresias_roles` (`id_membresia`, `id_rol`)
SELECT m.`id_membresia`, u.`id_rol`
FROM `membresias_red` m
JOIN `usuarios` u ON u.`id_usuario` = m.`id_usuario`;

ALTER TABLE `usuarios`
  DROP FOREIGN KEY IF EXISTS `1`,
  DROP FOREIGN KEY IF EXISTS `2`;
ALTER TABLE `usuarios`
  DROP INDEX IF EXISTS `id_rol`,
  DROP INDEX IF EXISTS `id_unidad`,
  DROP COLUMN IF EXISTS `id_rol`,
  DROP COLUMN IF EXISTS `id_unidad`,
  ADD COLUMN IF NOT EXISTS `password_actualizada_en` datetime DEFAULT NULL AFTER `password_hash`;

CREATE TABLE IF NOT EXISTS `solicitudes_acceso` (
  `id_solicitud` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_unidad` int(11) DEFAULT NULL,
  `numero_unidad` varchar(20) NOT NULL,
  `rut` varchar(12) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido_paterno` varchar(50) NOT NULL,
  `apellido_materno` varchar(50) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `estado` enum('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  `motivo_rechazo` varchar(255) DEFAULT NULL,
  `fecha_solicitud` datetime DEFAULT current_timestamp(),
  `fecha_resolucion` datetime DEFAULT NULL,
  `id_usuario_resolutor` int(11) DEFAULT NULL,
  `id_usuario_creado` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_solicitud`),
  KEY `idx_solicitud_red_estado` (`id_red`,`estado`),
  KEY `idx_solicitud_rut` (`rut`),
  KEY `id_unidad` (`id_unidad`),
  KEY `id_usuario_resolutor` (`id_usuario_resolutor`),
  KEY `id_usuario_creado` (`id_usuario_creado`),
  CONSTRAINT `fk_solicitud_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_solicitud_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE SET NULL,
  CONSTRAINT `fk_solicitud_resolutor` FOREIGN KEY (`id_usuario_resolutor`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_solicitud_usuario_creado` FOREIGN KEY (`id_usuario_creado`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `tokens_password` (
  `id_token` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `tipo` enum('Recuperacion','Activacion') NOT NULL,
  `fecha_expiracion` datetime NOT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_token`),
  UNIQUE KEY `uq_token_hash` (`token_hash`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_token_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

UPDATE `pagos` SET `metodo_pago` = 'Transferencia' WHERE `metodo_pago` = 'MercadoPago';
ALTER TABLE `pagos`
  MODIFY `metodo_pago` enum('Transferencia','Efectivo') NOT NULL;
