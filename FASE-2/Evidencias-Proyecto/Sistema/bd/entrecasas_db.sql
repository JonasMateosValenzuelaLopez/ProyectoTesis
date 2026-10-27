CREATE DATABASE IF NOT EXISTS `entrecasas_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `entrecasas_db`;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `actas` (
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
  CONSTRAINT `fk_acta_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_acta_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `chk_acta_publicada` CHECK (`publicada` = 0 or `publicada_en` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `bitacora_auditoria` (
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
  CONSTRAINT `chk_bitacora_ambito` CHECK (`ambito` = 'Plataforma' or `id_red` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `categorias_gasto` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `categorias_marketplace` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_categoria` varchar(50) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cobro_unidades` (
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
  CONSTRAINT `fk_cobro_unidad_marcado_por` FOREIGN KEY (`pagado_marcado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_cobro_unidad_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `chk_cobro_unidad_monto` CHECK (`monto` >= 0),
  CONSTRAINT `chk_cobro_unidad_pagado` CHECK (`estado` <> 'Pagado' or `pagado_marcado_en` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `cobros` (
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
  CONSTRAINT `fk_cobro_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_gasto` (`id_categoria`),
  CONSTRAINT `fk_cobro_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_cobro_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `chk_cobro_monto` CHECK (`monto_por_unidad` > 0),
  CONSTRAINT `chk_cobro_periodo` CHECK (dayofmonth(`periodo`) = 1),
  CONSTRAINT `chk_cobro_vencimiento` CHECK (`fecha_vencimiento` >= `fecha_emision`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `codigos_otp` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `egresos` (
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
  CONSTRAINT `fk_egreso_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_gasto` (`id_categoria`),
  CONSTRAINT `fk_egreso_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_egreso_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_egreso_visado_por` FOREIGN KEY (`visado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_egreso_monto` CHECK (`monto` > 0),
  CONSTRAINT `chk_egreso_visado` CHECK (`requiere_visado` = (`estado_visado` <> 'No requiere'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `espacios_comunes` (
  `id_espacio` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `capacidad` int(11) DEFAULT NULL,
  `reglas` text DEFAULT NULL,
  `hora_apertura` time DEFAULT NULL,
  `hora_cierre` time DEFAULT NULL,
  `duracion_bloque_min` smallint(5) unsigned DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_espacio`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `1` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `chk_espacio_horario` CHECK (`hora_apertura` is null or `hora_cierre` is null or `hora_cierre` > `hora_apertura`),
  CONSTRAINT `chk_espacio_bloque` CHECK (`duracion_bloque_min` is null or `duracion_bloque_min` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `exenciones` (
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
  CONSTRAINT `fk_exencion_resuelta_por` FOREIGN KEY (`resuelta_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_exencion_solicitada_por` FOREIGN KEY (`solicitada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_exencion_resolucion` CHECK (`estado` = 'Pendiente' or `resuelta_en` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `invitaciones` (
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
  CONSTRAINT `fk_invitacion_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_invitacion_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitacion_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `chk_invitacion_vigencia` CHECK (`valida_hasta` > `valida_desde`),
  CONSTRAINT `chk_invitacion_usos` CHECK (`usos` >= 0 and (`usos_max` is null or `usos` <= `usos_max`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `marketplace_publicaciones` (
  `id_producto` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `tipo` enum('Venta','Permuta','Servicio') NOT NULL DEFAULT 'Venta',
  `titulo` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `telefono_contacto` varchar(15) DEFAULT NULL,
  `fecha_publicacion` datetime DEFAULT current_timestamp(),
  `estado` tinyint(1) DEFAULT 1,
  `estado_moderacion` enum('Publicada','Oculta') NOT NULL DEFAULT 'Publicada',
  `moderado_por` int(11) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_categoria` (`id_categoria`),
  KEY `idx_marketplace_red_fecha` (`id_red`,`fecha_publicacion`),
  KEY `moderado_por` (`moderado_por`),
  CONSTRAINT `1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_marketplace` (`id_categoria`),
  CONSTRAINT `fk_marketplace_moderado_por` FOREIGN KEY (`moderado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_marketplace_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `chk_marketplace_precio` CHECK (`precio` is null or `precio` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `membresias` (
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
  CONSTRAINT `fk_membresia_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresia_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`),
  CONSTRAINT `fk_membresia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `chk_membresia_periodo` CHECK (`hasta` is null or `hasta` >= `desde`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `modulos` (
  `codigo` varchar(30) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `muro_publicaciones` (
  `id_publicacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `tipo` enum('Oficial','Vecinal','Seguridad','Norma') NOT NULL DEFAULT 'Vecinal',
  `titulo` varchar(150) NOT NULL,
  `contenido` text NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `estado` tinyint(1) DEFAULT 1,
  `estado_aprobacion` enum('No requiere','Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'No requiere',
  `aprobado_por` int(11) DEFAULT NULL,
  `aprobado_en` datetime DEFAULT NULL,
  `moderado_por` int(11) DEFAULT NULL,
  `moderado_en` datetime DEFAULT NULL,
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_publicacion`),
  KEY `id_usuario` (`id_usuario`),
  KEY `idx_muro_red_fecha` (`id_red`,`fecha_creacion`),
  KEY `aprobado_por` (`aprobado_por`),
  KEY `moderado_por` (`moderado_por`),
  CONSTRAINT `1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_muro_aprobado_por` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_muro_moderado_por` FOREIGN KEY (`moderado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_muro_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `notificaciones_enviadas` (
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
  CONSTRAINT `fk_notificacion_cobro` FOREIGN KEY (`id_cobro`) REFERENCES `cobros` (`id_cobro`) ON DELETE SET NULL,
  CONSTRAINT `fk_notificacion_enviado_por` FOREIGN KEY (`enviado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_notificacion_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `red_modulos` (
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
  CONSTRAINT `fk_red_modulo_actualizado_por` FOREIGN KEY (`actualizado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_red_modulo_modulo` FOREIGN KEY (`codigo_modulo`) REFERENCES `modulos` (`codigo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_red_modulo_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `redes_vecinales` (
  `id_red` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('Villa','Condominio','Edificio') NOT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `estado` enum('Activa','Suspendida') NOT NULL DEFAULT 'Activa',
  `motivo_suspension` varchar(255) DEFAULT NULL,
  `creada_por` int(11) DEFAULT NULL,
  `ultima_actividad` datetime DEFAULT NULL,
  `banco` varchar(60) DEFAULT NULL,
  `tipo_cuenta` varchar(30) DEFAULT NULL,
  `numero_cuenta` varchar(30) DEFAULT NULL,
  `titular_cuenta` varchar(100) DEFAULT NULL,
  `identificador_titular` varchar(20) DEFAULT NULL,
  `correo_transferencias` varchar(100) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_red`),
  KEY `creada_por` (`creada_por`),
  CONSTRAINT `fk_red_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `registro_accesos` (
  `id_acceso` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_visitante` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `id_invitacion` int(11) DEFAULT NULL,
  `fecha_ingreso` datetime DEFAULT current_timestamp(),
  `fecha_salida` datetime DEFAULT NULL,
  `estado_autorizacion` enum('Aprobado','Rechazado','Pendiente de Confirmación') NOT NULL,
  `codigo_qr_validado` tinyint(1) DEFAULT 0,
  `validado_por` int(11) DEFAULT NULL,
  `metodo` enum('QR','Manual','Tag','Patente') NOT NULL DEFAULT 'Manual',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_acceso`),
  KEY `id_visitante` (`id_visitante`),
  KEY `id_unidad` (`id_unidad`),
  KEY `idx_acceso_red_ingreso` (`id_red`,`fecha_ingreso`),
  KEY `id_invitacion` (`id_invitacion`),
  KEY `validado_por` (`validado_por`),
  CONSTRAINT `1` FOREIGN KEY (`id_visitante`) REFERENCES `visitantes` (`id_visitante`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_acceso_invitacion` FOREIGN KEY (`id_invitacion`) REFERENCES `invitaciones` (`id_invitacion`) ON DELETE SET NULL,
  CONSTRAINT `fk_acceso_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_acceso_validado_por` FOREIGN KEY (`validado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `chk_acceso_salida` CHECK (`fecha_salida` is null or `fecha_salida` >= `fecha_ingreso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `reservas` (
  `id_reserva` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_espacio` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_reserva` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `invitados` smallint(5) unsigned DEFAULT NULL,
  `estado_reserva` enum('Pendiente','Aprobada','Rechazada','Cancelada') DEFAULT 'Pendiente',
  `motivo_cancelacion` varchar(255) DEFAULT NULL,
  `entregado_en` datetime DEFAULT NULL,
  `entregado_por` int(11) DEFAULT NULL,
  `recibido_en` datetime DEFAULT NULL,
  `recibido_por` int(11) DEFAULT NULL,
  `observaciones_recepcion` varchar(255) DEFAULT NULL,
  `fecha_solicitud` datetime DEFAULT current_timestamp(),
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_reserva`),
  KEY `id_espacio` (`id_espacio`),
  KEY `id_usuario` (`id_usuario`),
  KEY `idx_reserva_red_fecha` (`id_red`,`fecha_reserva`),
  KEY `entregado_por` (`entregado_por`),
  KEY `recibido_por` (`recibido_por`),
  CONSTRAINT `1` FOREIGN KEY (`id_espacio`) REFERENCES `espacios_comunes` (`id_espacio`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_reserva_entregado_por` FOREIGN KEY (`entregado_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_reserva_recibido_por` FOREIGN KEY (`recibido_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_reserva_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `chk_reserva_horario` CHECK (`hora_fin` > `hora_inicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `residencias` (
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
  CONSTRAINT `fk_residencia_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_residencia_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `chk_residencia_periodo` CHECK (`hasta` is null or `hasta` >= `desde`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uq_rol_nombre` (`nombre_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `solicitudes_acceso` (
  `id_solicitud` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_unidad` int(11) DEFAULT NULL,
  `numero_unidad` varchar(20) NOT NULL,
  `tipo_residencia` enum('Propietario','Arrendatario') NOT NULL DEFAULT 'Propietario',
  `identificador` varchar(20) NOT NULL,
  `pais` char(2) NOT NULL DEFAULT 'CL',
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
  KEY `id_unidad` (`id_unidad`),
  KEY `id_usuario_resolutor` (`id_usuario_resolutor`),
  KEY `id_usuario_creado` (`id_usuario_creado`),
  KEY `idx_solicitud_identificador` (`pais`,`identificador`),
  CONSTRAINT `fk_solicitud_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_solicitud_resolutor` FOREIGN KEY (`id_usuario_resolutor`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_solicitud_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE SET NULL,
  CONSTRAINT `fk_solicitud_usuario_creado` FOREIGN KEY (`id_usuario_creado`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `unidades` (
  `id_unidad` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `numero_identificador` varchar(20) NOT NULL,
  `tipo` enum('Casa','Departamento') NOT NULL DEFAULT 'Casa',
  `calle_pasaje` varchar(100) DEFAULT NULL,
  `torre` varchar(20) DEFAULT NULL,
  `piso` smallint(6) DEFAULT NULL,
  `manzana` varchar(20) DEFAULT NULL,
  `orden` int(11) DEFAULT NULL,
  `estacionamiento` varchar(20) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_unidad`),
  UNIQUE KEY `uq_unidad_red_numero` (`id_red`,`numero_identificador`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `1` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `identificador` varchar(20) NOT NULL,
  `pais` char(2) NOT NULL DEFAULT 'CL',
  `nombre` varchar(50) NOT NULL,
  `apellido_paterno` varchar(50) NOT NULL,
  `apellido_materno` varchar(50) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `password_actualizada_en` datetime DEFAULT NULL,
  `es_plataforma` tinyint(1) NOT NULL DEFAULT 0,
  `bloqueado` tinyint(1) NOT NULL DEFAULT 0,
  `motivo_bloqueo` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`),
  UNIQUE KEY `uq_usuario_identificador` (`pais`,`identificador`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `vehiculos` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `visitantes` (
  `id_visitante` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `rut` varchar(12) DEFAULT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `tipo` enum('Frecuente','Esporádico') DEFAULT 'Esporádico',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_eliminacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_visitante`),
  UNIQUE KEY `uq_visitante_red_rut` (`id_red`,`rut`),
  CONSTRAINT `fk_visitante_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `votacion_opciones` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `votaciones` (
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
  CONSTRAINT `fk_votacion_creada_por` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_votacion_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `chk_votacion_fechas` CHECK (`cierre` > `inicio`),
  CONSTRAINT `chk_votacion_quorum` CHECK (`quorum_minimo` is null or `quorum_minimo` between 1 and 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE IF NOT EXISTS `votos` (
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
  CONSTRAINT `fk_voto_opcion` FOREIGN KEY (`id_opcion`, `id_votacion`) REFERENCES `votacion_opciones` (`id_opcion`, `id_votacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_voto_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_voto_votacion` FOREIGN KEY (`id_votacion`) REFERENCES `votaciones` (`id_votacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES (1,'Administrador','2026-10-26 01:44:25','2026-10-26 23:03:23',NULL);
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES (2,'Tesorero','2026-10-26 01:44:25','2026-10-26 23:03:23',NULL);
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES (3,'Secretario','2026-10-26 01:44:25','2026-10-26 23:03:23',NULL);
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES (4,'Presidente','2026-10-26 01:44:25','2026-10-26 23:03:23',NULL);
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES (5,'Conserje','2026-10-26 01:44:25','2026-10-26 01:44:25',NULL);
INSERT INTO `roles` (`id_rol`, `nombre_rol`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES (6,'Residente','2026-10-26 01:44:25','2026-10-26 01:44:25',NULL);
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('administrador_externo','Administrador externo','La comunidad tiene un administrador contratado. Si se apaga, el Presidente asume la administración.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('cobros','Cobros y gastos comunes','Cobros, morosidad, exenciones y reportes. Los pagos se hacen por transferencia y se marcan a mano.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('conserjeria','Conserjería y garita','Panel de garita: accesos en vivo, validación de QR, espacios del día y búsqueda rápida.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('invitaciones_qr','Invitaciones QR','El residente invita visitas con un código QR que se valida en la entrada.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('marketplace','Marketplace vecinal','Compra, venta y servicios entre vecinos. Se modera igual que el muro.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('muro','Muro, comunicados y normas','Comunicados y normas oficiales (con aprobación del Presidente) y publicaciones de vecinos.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('reservas','Reservas de espacios','Reserva de espacios comunes desde la app, con entrega en conserjería si existe.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
INSERT INTO `modulos` (`codigo`, `nombre`, `descripcion`, `fecha_creacion`, `fecha_actualizacion`, `fecha_eliminacion`) VALUES ('votaciones','Votaciones, encuestas y actas','Votaciones con quórum, encuestas y libro de actas de la Secretaría.','2026-10-26 23:03:23','2026-10-26 23:03:23',NULL);
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

