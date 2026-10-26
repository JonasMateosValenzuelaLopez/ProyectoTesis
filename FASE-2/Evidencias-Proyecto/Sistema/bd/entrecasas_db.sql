-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         12.3.3-MariaDB-log - MariaDB Server
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para entrecasas_db
CREATE DATABASE IF NOT EXISTS `entrecasas_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `entrecasas_db`;

-- Volcando estructura para tabla entrecasas_db.categorias_marketplace
CREATE TABLE IF NOT EXISTS `categorias_marketplace` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_categoria` varchar(50) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.categorias_marketplace: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.espacios_comunes
CREATE TABLE IF NOT EXISTS `espacios_comunes` (
  `id_espacio` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `capacidad` int(11) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_espacio`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `1` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.espacios_comunes: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.gastos_comunes
CREATE TABLE IF NOT EXISTS `gastos_comunes` (
  `id_gasto` int(11) NOT NULL AUTO_INCREMENT,
  `id_unidad` int(11) NOT NULL,
  `mes` tinyint(4) NOT NULL,
  `anio` year(4) NOT NULL,
  `monto_total` decimal(10,2) NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado_pago` enum('Pendiente','Pagado','Atrasado') DEFAULT 'Pendiente',
  `descripcion` text DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_gasto`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `1` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.gastos_comunes: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.marketplace_publicaciones
CREATE TABLE IF NOT EXISTS `marketplace_publicaciones` (
  `id_producto` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `telefono_contacto` varchar(15) DEFAULT NULL,
  `fecha_publicacion` datetime DEFAULT current_timestamp(),
  `estado` tinyint(1) DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_categoria` (`id_categoria`),
  CONSTRAINT `1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_marketplace` (`id_categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.marketplace_publicaciones: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.membresias_red
CREATE TABLE IF NOT EXISTS `membresias_red` (
  `id_membresia` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_red` int(11) NOT NULL,
  `id_unidad` int(11) DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_ingreso` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_membresia`),
  UNIQUE KEY `uq_membresia_usuario_red` (`id_usuario`,`id_red`),
  KEY `id_red` (`id_red`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `fk_membresia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando estructura para tabla entrecasas_db.membresias_roles
CREATE TABLE IF NOT EXISTS `membresias_roles` (
  `id_membresia` int(11) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_membresia`,`id_rol`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `fk_membresia_rol_membresia` FOREIGN KEY (`id_membresia`) REFERENCES `membresias_red` (`id_membresia`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_rol_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando estructura para tabla entrecasas_db.muro_publicaciones
CREATE TABLE IF NOT EXISTS `muro_publicaciones` (
  `id_publicacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `contenido` text NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` tinyint(1) DEFAULT 1,
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_publicacion`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.muro_publicaciones: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.pagos
CREATE TABLE IF NOT EXISTS `pagos` (
  `id_pago` int(11) NOT NULL AUTO_INCREMENT,
  `id_gasto` int(11) NOT NULL,
  `monto_pagado` decimal(10,2) NOT NULL,
  `fecha_pago` datetime DEFAULT current_timestamp(),
  `metodo_pago` enum('Transferencia','Efectivo') NOT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  `estado_validacion` enum('Pendiente','Validado','Rechazado') DEFAULT 'Pendiente',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_pago`),
  KEY `id_gasto` (`id_gasto`),
  CONSTRAINT `1` FOREIGN KEY (`id_gasto`) REFERENCES `gastos_comunes` (`id_gasto`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.pagos: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.redes_vecinales
CREATE TABLE IF NOT EXISTS `redes_vecinales` (
  `id_red` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('Villa','Condominio','Edificio') NOT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_red`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.redes_vecinales: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.registro_accesos
CREATE TABLE IF NOT EXISTS `registro_accesos` (
  `id_acceso` int(11) NOT NULL AUTO_INCREMENT,
  `id_visitante` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `fecha_ingreso` datetime DEFAULT current_timestamp(),
  `estado_autorizacion` enum('Aprobado','Rechazado','Pendiente de Confirmación') NOT NULL,
  `codigo_qr_validado` tinyint(1) DEFAULT 0,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_acceso`),
  KEY `id_visitante` (`id_visitante`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `1` FOREIGN KEY (`id_visitante`) REFERENCES `visitantes` (`id_visitante`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.registro_accesos: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.reservas
CREATE TABLE IF NOT EXISTS `reservas` (
  `id_reserva` int(11) NOT NULL AUTO_INCREMENT,
  `id_espacio` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_reserva` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `estado_reserva` enum('Pendiente','Aprobada','Rechazada','Cancelada') DEFAULT 'Pendiente',
  `fecha_solicitud` datetime DEFAULT current_timestamp(),
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_reserva`),
  KEY `id_espacio` (`id_espacio`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `1` FOREIGN KEY (`id_espacio`) REFERENCES `espacios_comunes` (`id_espacio`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.reservas: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.roles: ~7 rows (aproximadamente)
INSERT INTO `roles` (`id_rol`, `nombre_rol`) VALUES
	(1, 'Administración'),
	(2, 'Tesorero Vecinos'),
	(3, 'Secretario Vecinos'),
	(4, 'Presidente Vecinos'),
	(5, 'Conserje'),
	(6, 'Residente'),
	(7, 'Visitante');

-- Volcando estructura para tabla entrecasas_db.solicitudes_acceso
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
  `fecha_solicitud` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_resolucion` datetime DEFAULT NULL,
  `id_usuario_resolutor` int(11) DEFAULT NULL,
  `id_usuario_creado` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
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

-- Volcando estructura para tabla entrecasas_db.tokens_password
CREATE TABLE IF NOT EXISTS `tokens_password` (
  `id_token` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `tipo` enum('Recuperacion','Activacion') NOT NULL,
  `fecha_expiracion` datetime NOT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_token`),
  UNIQUE KEY `uq_token_hash` (`token_hash`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_token_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando estructura para tabla entrecasas_db.unidades
CREATE TABLE IF NOT EXISTS `unidades` (
  `id_unidad` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `numero_identificador` varchar(20) NOT NULL,
  `calle_pasaje` varchar(100) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_unidad`),
  UNIQUE KEY `uq_unidad_red_numero` (`id_red`,`numero_identificador`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `1` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.unidades: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido_paterno` varchar(50) NOT NULL,
  `apellido_materno` varchar(50) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_actualizada_en` datetime DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `rut` (`rut`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.usuarios: ~0 rows (aproximadamente)

-- Volcando estructura para tabla entrecasas_db.visitantes
CREATE TABLE IF NOT EXISTS `visitantes` (
  `id_visitante` int(11) NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) DEFAULT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `tipo` enum('Frecuente','Esporádico') DEFAULT 'Esporádico',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_visitante`),
  UNIQUE KEY `rut` (`rut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Volcando datos para la tabla entrecasas_db.visitantes: ~0 rows (aproximadamente)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
