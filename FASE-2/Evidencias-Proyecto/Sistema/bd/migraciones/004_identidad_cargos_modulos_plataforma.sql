USE `entrecasas_db`;

DELETE FROM `membresias_roles` WHERE `id_rol` = 7;
DELETE FROM `roles` WHERE `id_rol` = 7;
UPDATE `roles` SET `nombre_rol` = 'Administrador' WHERE `id_rol` = 1;
UPDATE `roles` SET `nombre_rol` = 'Tesorero' WHERE `id_rol` = 2;
UPDATE `roles` SET `nombre_rol` = 'Secretario' WHERE `id_rol` = 3;
UPDATE `roles` SET `nombre_rol` = 'Presidente' WHERE `id_rol` = 4;
UPDATE `roles` SET `nombre_rol` = 'Conserje' WHERE `id_rol` = 5;
UPDATE `roles` SET `nombre_rol` = 'Residente' WHERE `id_rol` = 6;
ALTER TABLE `roles` ADD UNIQUE KEY `uq_rol_nombre` (`nombre_rol`);

ALTER TABLE `usuarios`
  DROP INDEX `rut`,
  CHANGE `rut` `identificador` varchar(20) NOT NULL,
  ADD COLUMN `pais` char(2) NOT NULL DEFAULT 'CL' AFTER `identificador`,
  MODIFY `password_hash` varchar(255) DEFAULT NULL,
  ADD COLUMN `es_plataforma` tinyint(1) NOT NULL DEFAULT 0 AFTER `password_actualizada_en`,
  ADD COLUMN `bloqueado` tinyint(1) NOT NULL DEFAULT 0 AFTER `es_plataforma`,
  ADD COLUMN `motivo_bloqueo` varchar(255) DEFAULT NULL AFTER `bloqueado`,
  ADD UNIQUE KEY `uq_usuario_identificador` (`pais`, `identificador`);
UPDATE `usuarios` SET `bloqueado` = 1 WHERE `estado` = 0;
ALTER TABLE `usuarios` DROP COLUMN `estado`;

UPDATE `redes_vecinales` SET `fecha_creacion` = `fecha_registro`;
ALTER TABLE `redes_vecinales`
  DROP COLUMN `fecha_registro`,
  ADD COLUMN `estado` enum('Activa','Suspendida') NOT NULL DEFAULT 'Activa' AFTER `direccion`,
  ADD COLUMN `motivo_suspension` varchar(255) DEFAULT NULL AFTER `estado`,
  ADD COLUMN `creada_por` int(11) DEFAULT NULL AFTER `motivo_suspension`,
  ADD COLUMN `ultima_actividad` datetime DEFAULT NULL AFTER `creada_por`,
  ADD COLUMN `banco` varchar(60) DEFAULT NULL AFTER `ultima_actividad`,
  ADD COLUMN `tipo_cuenta` varchar(30) DEFAULT NULL AFTER `banco`,
  ADD COLUMN `numero_cuenta` varchar(30) DEFAULT NULL AFTER `tipo_cuenta`,
  ADD COLUMN `titular_cuenta` varchar(100) DEFAULT NULL AFTER `numero_cuenta`,
  ADD COLUMN `identificador_titular` varchar(20) DEFAULT NULL AFTER `titular_cuenta`,
  ADD COLUMN `correo_transferencias` varchar(100) DEFAULT NULL AFTER `identificador_titular`,
  ADD KEY `creada_por` (`creada_por`),
  ADD CONSTRAINT `fk_red_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL;

CREATE TABLE `membresias` (
  `id_membresia` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_red` int(11) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `desde` date NOT NULL DEFAULT curdate(),
  `hasta` date DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_membresia`),
  UNIQUE KEY `uq_membresia_usuario_red_rol` (`id_usuario`,`id_red`,`id_rol`),
  KEY `idx_membresia_red_rol` (`id_red`,`id_rol`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `fk_membresia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`),
  CONSTRAINT `chk_membresia_periodo` CHECK (`hasta` IS NULL OR `hasta` >= `desde`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `residencias` (
  `id_residencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `tipo` enum('Propietario','Arrendatario') NOT NULL,
  `desde` date NOT NULL DEFAULT curdate(),
  `hasta` date DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_residencia`),
  KEY `idx_residencia_usuario` (`id_usuario`),
  KEY `idx_residencia_unidad` (`id_unidad`),
  CONSTRAINT `fk_residencia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_residencia_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `chk_residencia_periodo` CHECK (`hasta` IS NULL OR `hasta` >= `desde`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `membresias` (`id_usuario`, `id_red`, `id_rol`, `activo`, `desde`, `fecha_creacion`, `fecha_eliminacion`)
SELECT m.`id_usuario`, m.`id_red`, mr.`id_rol`, m.`estado`, DATE(m.`fecha_ingreso`), m.`fecha_creacion`, m.`fecha_eliminacion`
FROM `membresias_red` m
JOIN `membresias_roles` mr ON mr.`id_membresia` = m.`id_membresia`;

INSERT INTO `residencias` (`id_usuario`, `id_unidad`, `tipo`, `desde`, `fecha_creacion`, `fecha_eliminacion`)
SELECT `id_usuario`, `id_unidad`, 'Propietario', DATE(`fecha_ingreso`), `fecha_creacion`, `fecha_eliminacion`
FROM `membresias_red`
WHERE `id_unidad` IS NOT NULL;

DROP TABLE `membresias_roles`;
DROP TABLE `membresias_red`;

CREATE TABLE `modulos` (
  `codigo` varchar(30) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`) VALUES
  ('muro', 'Muro, comunicados y normas', 'Comunicados y normas oficiales (con aprobación del Presidente) y publicaciones de vecinos.'),
  ('marketplace', 'Marketplace vecinal', 'Compra, venta y servicios entre vecinos. Se modera igual que el muro.'),
  ('votaciones', 'Votaciones, encuestas y actas', 'Votaciones con quórum, encuestas y libro de actas de la Secretaría.'),
  ('reservas', 'Reservas de espacios', 'Reserva de espacios comunes desde la app, con entrega en conserjería si existe.'),
  ('cobros', 'Cobros y gastos comunes', 'Cobros, morosidad, exenciones y reportes. Los pagos se hacen por transferencia y se marcan a mano.'),
  ('invitaciones_qr', 'Invitaciones QR', 'El residente invita visitas con un código QR que se valida en la entrada.'),
  ('conserjeria', 'Conserjería y garita', 'Panel de garita: accesos en vivo, validación de QR, espacios del día y búsqueda rápida.'),
  ('administrador_externo', 'Administrador externo', 'La comunidad tiene un administrador contratado. Si se apaga, el Presidente asume la administración.');

CREATE TABLE `red_modulos` (
  `id_red` int(11) NOT NULL,
  `codigo_modulo` varchar(30) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `actualizado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_red`,`codigo_modulo`),
  KEY `codigo_modulo` (`codigo_modulo`),
  KEY `actualizado_por` (`actualizado_por`),
  CONSTRAINT `fk_red_modulo_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_red_modulo_modulo` FOREIGN KEY (`codigo_modulo`) REFERENCES `modulos` (`codigo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_red_modulo_actualizado_por` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `red_modulos` (`id_red`, `codigo_modulo`, `activo`)
SELECT r.`id_red`, m.`codigo`,
  CASE
    WHEN r.`tipo` = 'Edificio' THEN 1
    WHEN r.`tipo` = 'Condominio' THEN m.`codigo` <> 'conserjeria'
    ELSE m.`codigo` IN ('muro', 'marketplace', 'votaciones', 'reservas', 'cobros')
  END
FROM `redes_vecinales` r
CROSS JOIN `modulos` m;

CREATE TABLE `codigos_otp` (
  `id_codigo` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `codigo_hash` char(64) NOT NULL,
  `expira` datetime NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT 0,
  `intentos` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_codigo`),
  KEY `idx_codigo_usuario` (`id_usuario`,`usado`),
  CONSTRAINT `fk_codigo_otp_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `bitacora_auditoria` (
  `id_bitacora` int(11) NOT NULL AUTO_INCREMENT,
  `ambito` enum('Comunidad','Plataforma') NOT NULL DEFAULT 'Comunidad',
  `id_red` int(11) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(60) NOT NULL,
  `entidad` varchar(60) NOT NULL,
  `id_entidad` int(11) DEFAULT NULL,
  `detalle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detalle`)),
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_bitacora`),
  KEY `idx_bitacora_red_fecha` (`id_red`,`fecha_creacion`),
  KEY `idx_bitacora_usuario` (`id_usuario`),
  CONSTRAINT `fk_bitacora_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`),
  CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_bitacora_ambito` CHECK (`ambito` = 'Plataforma' OR `id_red` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `solicitudes_acceso`
  DROP INDEX `idx_solicitud_rut`,
  CHANGE `rut` `identificador` varchar(20) NOT NULL,
  ADD COLUMN `pais` char(2) NOT NULL DEFAULT 'CL' AFTER `identificador`,
  ADD COLUMN `tipo_residencia` enum('Propietario','Arrendatario') NOT NULL DEFAULT 'Propietario' AFTER `numero_unidad`,
  ADD KEY `idx_solicitud_identificador` (`pais`,`identificador`);
