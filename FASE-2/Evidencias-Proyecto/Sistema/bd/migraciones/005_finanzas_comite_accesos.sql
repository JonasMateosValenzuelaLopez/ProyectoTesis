USE `entrecasas_db`;

DROP TABLE `pagos`;
DROP TABLE `gastos_comunes`;

CREATE TABLE `categorias_gasto` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `uq_categoria_red_nombre` (`id_red`,`nombre`),
  CONSTRAINT `fk_categoria_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `cobros` (
  `id_cobro` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `concepto` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `monto_por_unidad` decimal(12,2) NOT NULL,
  `periodo` date NOT NULL COMMENT 'Primer día del mes cobrado',
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `extraordinario` tinyint(1) NOT NULL DEFAULT 0,
  `creado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_cobro`),
  KEY `idx_cobro_red_periodo` (`id_red`,`periodo`),
  KEY `id_categoria` (`id_categoria`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `fk_cobro_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_cobro_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_gasto` (`id_categoria`),
  CONSTRAINT `fk_cobro_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_cobro_monto` CHECK (`monto_por_unidad` > 0),
  CONSTRAINT `chk_cobro_periodo` CHECK (dayofmonth(`periodo`) = 1),
  CONSTRAINT `chk_cobro_vencimiento` CHECK (`fecha_vencimiento` >= `fecha_emision`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `cobro_unidades` (
  `id_cobro_unidad` int(11) NOT NULL AUTO_INCREMENT,
  `id_cobro` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `estado` enum('Pendiente','Pagado','Exento') NOT NULL DEFAULT 'Pendiente',
  `pagado_marcado_en` datetime DEFAULT NULL,
  `pagado_marcado_por` int(11) DEFAULT NULL,
  `aviso_transferencia_en` datetime DEFAULT NULL COMMENT 'El residente avisó "Ya transferí"',
  `aviso_transferencia_nota` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_cobro_unidad`),
  UNIQUE KEY `uq_cobro_unidad` (`id_cobro`,`id_unidad`),
  KEY `idx_cobro_unidad_estado` (`id_unidad`,`estado`),
  KEY `pagado_marcado_por` (`pagado_marcado_por`),
  CONSTRAINT `fk_cobro_unidad_cobro` FOREIGN KEY (`id_cobro`) REFERENCES `cobros` (`id_cobro`) ON DELETE CASCADE,
  CONSTRAINT `fk_cobro_unidad_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_cobro_unidad_marcado_por` FOREIGN KEY (`pagado_marcado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_cobro_unidad_monto` CHECK (`monto` >= 0),
  CONSTRAINT `chk_cobro_unidad_pagado` CHECK (`estado` <> 'Pagado' OR `pagado_marcado_en` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `exenciones` (
  `id_exencion` int(11) NOT NULL AUTO_INCREMENT,
  `id_cobro_unidad` int(11) NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `solicitada_por` int(11) DEFAULT NULL,
  `estado` enum('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  `resuelta_por` int(11) DEFAULT NULL,
  `resuelta_en` datetime DEFAULT NULL,
  `comentario_resolucion` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_exencion`),
  KEY `idx_exencion_cobro_unidad` (`id_cobro_unidad`,`estado`),
  KEY `solicitada_por` (`solicitada_por`),
  KEY `resuelta_por` (`resuelta_por`),
  CONSTRAINT `fk_exencion_cobro_unidad` FOREIGN KEY (`id_cobro_unidad`) REFERENCES `cobro_unidades` (`id_cobro_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_exencion_solicitada_por` FOREIGN KEY (`solicitada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_exencion_resuelta_por` FOREIGN KEY (`resuelta_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_exencion_resolucion` CHECK (`estado` = 'Pendiente' OR `resuelta_en` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `egresos` (
  `id_egreso` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `fecha_egreso` date NOT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  `requiere_visado` tinyint(1) GENERATED ALWAYS AS (`monto` >= 100000) STORED,
  `estado_visado` enum('No requiere','Pendiente','Aprobado','Rechazado') NOT NULL DEFAULT 'No requiere',
  `visado_por` int(11) DEFAULT NULL,
  `visado_en` datetime DEFAULT NULL,
  `creado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_egreso`),
  KEY `idx_egreso_red_fecha` (`id_red`,`fecha_egreso`),
  KEY `id_categoria` (`id_categoria`),
  KEY `visado_por` (`visado_por`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `fk_egreso_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_egreso_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_gasto` (`id_categoria`),
  CONSTRAINT `fk_egreso_visado_por` FOREIGN KEY (`visado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_egreso_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_egreso_monto` CHECK (`monto` > 0),
  CONSTRAINT `chk_egreso_visado` CHECK (`requiere_visado` = (`estado_visado` <> 'No requiere'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `notificaciones_enviadas` (
  `id_notificacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `tipo` enum('Cobro','Recordatorio') NOT NULL,
  `id_cobro` int(11) DEFAULT NULL,
  `destinatarios` int(11) NOT NULL DEFAULT 0,
  `enviado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_notificacion_red_fecha` (`id_red`,`fecha_creacion`),
  KEY `id_cobro` (`id_cobro`),
  KEY `enviado_por` (`enviado_por`),
  CONSTRAINT `fk_notificacion_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_notificacion_cobro` FOREIGN KEY (`id_cobro`) REFERENCES `cobros` (`id_cobro`) ON DELETE SET NULL,
  CONSTRAINT `fk_notificacion_enviado_por` FOREIGN KEY (`enviado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `muro_publicaciones`
  ADD COLUMN `id_red` int(11) NOT NULL AFTER `id_publicacion`,
  ADD COLUMN `tipo` enum('Oficial','Vecinal','Seguridad','Norma') NOT NULL DEFAULT 'Vecinal' AFTER `id_usuario`,
  ADD COLUMN `estado_aprobacion` enum('No requiere','Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'No requiere' AFTER `estado`,
  ADD COLUMN `aprobado_por` int(11) DEFAULT NULL AFTER `estado_aprobacion`,
  ADD COLUMN `aprobado_en` datetime DEFAULT NULL AFTER `aprobado_por`,
  ADD COLUMN `moderado_por` int(11) DEFAULT NULL AFTER `aprobado_en`,
  ADD COLUMN `moderado_en` datetime DEFAULT NULL AFTER `moderado_por`,
  ADD KEY `idx_muro_red_fecha` (`id_red`,`fecha_creacion`),
  ADD KEY `aprobado_por` (`aprobado_por`),
  ADD KEY `moderado_por` (`moderado_por`),
  ADD CONSTRAINT `fk_muro_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_muro_aprobado_por` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_muro_moderado_por` FOREIGN KEY (`moderado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL;

CREATE TABLE `actas` (
  `id_acta` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `numero` int(11) DEFAULT NULL,
  `titulo` varchar(150) NOT NULL,
  `tipo_reunion` enum('Ordinaria','Extraordinaria','Directiva') NOT NULL,
  `fecha_asamblea` datetime NOT NULL,
  `lugar` varchar(100) DEFAULT NULL,
  `unidades_presentes` int(11) DEFAULT NULL,
  `contenido` longtext DEFAULT NULL,
  `archivo_url` varchar(255) DEFAULT NULL,
  `publicada` tinyint(1) NOT NULL DEFAULT 0,
  `publicada_en` datetime DEFAULT NULL,
  `creada_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_acta`),
  UNIQUE KEY `uq_acta_red_numero` (`id_red`,`numero`),
  KEY `creada_por` (`creada_por`),
  CONSTRAINT `fk_acta_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_acta_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_acta_publicada` CHECK (`publicada` = 0 OR `publicada_en` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `votaciones` (
  `id_votacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo` enum('Votacion','Encuesta') NOT NULL,
  `quorum_minimo` tinyint(3) unsigned DEFAULT NULL COMMENT 'Porcentaje; NULL en encuestas',
  `inicio` datetime NOT NULL,
  `cierre` datetime NOT NULL,
  `cerrada_en` datetime DEFAULT NULL COMMENT 'Cierre anticipado',
  `creada_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_votacion`),
  KEY `idx_votacion_red_cierre` (`id_red`,`cierre`),
  KEY `creada_por` (`creada_por`),
  CONSTRAINT `fk_votacion_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_votacion_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_votacion_fechas` CHECK (`cierre` > `inicio`),
  CONSTRAINT `chk_votacion_quorum` CHECK (`quorum_minimo` IS NULL OR `quorum_minimo` BETWEEN 1 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `votacion_opciones` (
  `id_opcion` int(11) NOT NULL AUTO_INCREMENT,
  `id_votacion` int(11) NOT NULL,
  `texto` varchar(150) NOT NULL,
  `orden` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_opcion`),
  UNIQUE KEY `uq_opcion_votacion` (`id_opcion`,`id_votacion`),
  KEY `id_votacion` (`id_votacion`),
  CONSTRAINT `fk_opcion_votacion` FOREIGN KEY (`id_votacion`) REFERENCES `votaciones` (`id_votacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `votos` (
  `id_voto` int(11) NOT NULL AUTO_INCREMENT,
  `id_votacion` int(11) NOT NULL,
  `id_opcion` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_voto`),
  UNIQUE KEY `uq_voto_votacion_usuario` (`id_votacion`,`id_usuario`),
  KEY `idx_voto_opcion` (`id_opcion`,`id_votacion`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_voto_votacion` FOREIGN KEY (`id_votacion`) REFERENCES `votaciones` (`id_votacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_voto_opcion` FOREIGN KEY (`id_opcion`, `id_votacion`) REFERENCES `votacion_opciones` (`id_opcion`, `id_votacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_voto_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `invitaciones` (
  `id_invitacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `creada_por` int(11) DEFAULT NULL,
  `nombre_visita` varchar(100) NOT NULL,
  `identificador_visita` varchar(20) DEFAULT NULL,
  `patente` varchar(10) DEFAULT NULL,
  `categoria` enum('Visita','Proveedor','Servicio','Delivery') NOT NULL DEFAULT 'Visita',
  `codigo` varchar(20) NOT NULL,
  `tipo` enum('Uso único','Temporal') NOT NULL DEFAULT 'Uso único',
  `valida_desde` datetime NOT NULL,
  `valida_hasta` datetime NOT NULL,
  `usos_max` int(11) DEFAULT NULL,
  `usos` int(11) NOT NULL DEFAULT 0,
  `cancelada_en` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_invitacion`),
  UNIQUE KEY `uq_invitacion_codigo` (`codigo`),
  KEY `idx_invitacion_red_desde` (`id_red`,`valida_desde`),
  KEY `id_unidad` (`id_unidad`),
  KEY `creada_por` (`creada_por`),
  CONSTRAINT `fk_invitacion_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitacion_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitacion_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_invitacion_vigencia` CHECK (`valida_hasta` > `valida_desde`),
  CONSTRAINT `chk_invitacion_usos` CHECK (`usos` >= 0 AND (`usos_max` IS NULL OR `usos` <= `usos_max`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `visitantes`
  DROP INDEX `rut`,
  ADD COLUMN `id_red` int(11) NOT NULL AFTER `id_visitante`,
  ADD UNIQUE KEY `uq_visitante_red_rut` (`id_red`,`rut`),
  ADD CONSTRAINT `fk_visitante_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE;

ALTER TABLE `registro_accesos`
  ADD COLUMN `id_red` int(11) NOT NULL AFTER `id_acceso`,
  ADD COLUMN `id_invitacion` int(11) DEFAULT NULL AFTER `id_unidad`,
  ADD COLUMN `validado_por` int(11) DEFAULT NULL AFTER `codigo_qr_validado`,
  ADD COLUMN `metodo` enum('QR','Manual','Tag','Patente') NOT NULL DEFAULT 'Manual' AFTER `validado_por`,
  ADD COLUMN `fecha_salida` datetime DEFAULT NULL AFTER `fecha_ingreso`,
  ADD KEY `idx_acceso_red_ingreso` (`id_red`,`fecha_ingreso`),
  ADD KEY `id_invitacion` (`id_invitacion`),
  ADD KEY `validado_por` (`validado_por`),
  ADD CONSTRAINT `fk_acceso_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_acceso_invitacion` FOREIGN KEY (`id_invitacion`) REFERENCES `invitaciones` (`id_invitacion`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_acceso_validado_por` FOREIGN KEY (`validado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  ADD CONSTRAINT `chk_acceso_salida` CHECK (`fecha_salida` IS NULL OR `fecha_salida` >= `fecha_ingreso`);

ALTER TABLE `reservas`
  ADD COLUMN `id_red` int(11) NOT NULL AFTER `id_reserva`,
  ADD COLUMN `invitados` smallint(5) unsigned DEFAULT NULL AFTER `hora_fin`,
  ADD COLUMN `motivo_cancelacion` varchar(255) DEFAULT NULL AFTER `estado_reserva`,
  ADD COLUMN `entregado_en` datetime DEFAULT NULL AFTER `motivo_cancelacion`,
  ADD COLUMN `entregado_por` int(11) DEFAULT NULL AFTER `entregado_en`,
  ADD COLUMN `recibido_en` datetime DEFAULT NULL AFTER `entregado_por`,
  ADD COLUMN `recibido_por` int(11) DEFAULT NULL AFTER `recibido_en`,
  ADD COLUMN `observaciones_recepcion` varchar(255) DEFAULT NULL AFTER `recibido_por`,
  ADD KEY `idx_reserva_red_fecha` (`id_red`,`fecha_reserva`),
  ADD KEY `entregado_por` (`entregado_por`),
  ADD KEY `recibido_por` (`recibido_por`),
  ADD CONSTRAINT `fk_reserva_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_reserva_entregado_por` FOREIGN KEY (`entregado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_reserva_recibido_por` FOREIGN KEY (`recibido_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  ADD CONSTRAINT `chk_reserva_horario` CHECK (`hora_fin` > `hora_inicio`);

ALTER TABLE `espacios_comunes`
  ADD COLUMN `reglas` text DEFAULT NULL AFTER `capacidad`,
  ADD COLUMN `hora_apertura` time DEFAULT NULL AFTER `reglas`,
  ADD COLUMN `hora_cierre` time DEFAULT NULL AFTER `hora_apertura`,
  ADD COLUMN `duracion_bloque_min` smallint(5) unsigned DEFAULT NULL AFTER `hora_cierre`,
  ADD CONSTRAINT `chk_espacio_horario` CHECK (`hora_apertura` IS NULL OR `hora_cierre` IS NULL OR `hora_cierre` > `hora_apertura`),
  ADD CONSTRAINT `chk_espacio_bloque` CHECK (`duracion_bloque_min` IS NULL OR `duracion_bloque_min` > 0);

CREATE TABLE `vehiculos` (
  `id_vehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `patente` varchar(10) NOT NULL,
  `marca` varchar(40) DEFAULT NULL,
  `modelo` varchar(60) DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `uq_vehiculo_usuario_patente` (`id_usuario`,`patente`),
  KEY `idx_vehiculo_patente` (`patente`),
  CONSTRAINT `fk_vehiculo_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE `unidades`
  ADD COLUMN `tipo` enum('Casa','Departamento') NOT NULL DEFAULT 'Casa' AFTER `numero_identificador`,
  ADD COLUMN `torre` varchar(20) DEFAULT NULL AFTER `calle_pasaje`,
  ADD COLUMN `piso` smallint(6) DEFAULT NULL AFTER `torre`,
  ADD COLUMN `manzana` varchar(20) DEFAULT NULL AFTER `piso`,
  ADD COLUMN `orden` int(11) DEFAULT NULL AFTER `manzana`,
  ADD COLUMN `estacionamiento` varchar(20) DEFAULT NULL AFTER `orden`;

ALTER TABLE `marketplace_publicaciones`
  ADD COLUMN `id_red` int(11) NOT NULL AFTER `id_producto`,
  ADD COLUMN `tipo` enum('Venta','Permuta','Servicio') NOT NULL DEFAULT 'Venta' AFTER `id_categoria`,
  MODIFY `precio` decimal(10,2) DEFAULT NULL,
  ADD COLUMN `estado_moderacion` enum('Publicada','Oculta') NOT NULL DEFAULT 'Publicada' AFTER `estado`,
  ADD COLUMN `moderado_por` int(11) DEFAULT NULL AFTER `estado_moderacion`,
  ADD KEY `idx_marketplace_red_fecha` (`id_red`,`fecha_publicacion`),
  ADD KEY `moderado_por` (`moderado_por`),
  ADD CONSTRAINT `fk_marketplace_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_marketplace_moderado_por` FOREIGN KEY (`moderado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  ADD CONSTRAINT `chk_marketplace_precio` CHECK (`precio` IS NULL OR `precio` >= 0);
