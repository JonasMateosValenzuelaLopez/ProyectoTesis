-- --------------------------------------------------------
-- EntreCasas · base de datos v2
-- Parte de entrecasas_db.sql (HeidiSQL, MariaDB 12.3) y agrega lo que el panel web y la app
-- de residentes necesitan. Cada cambio lleva su código del análisis «EntreCasas: base de datos vs front»:
--   M1–M9  cambios a tablas que ya existían
--   N1–N10 tablas nuevas imprescindibles
--   O1–O8  tablas nuevas de directiva, moderación y garita
-- La v1 estaba vacía (solo `roles` traía filas), así que este script crea todo desde cero.
-- Convenciones: nombres en español y snake_case, enums con mayúscula inicial, montos en pesos
-- enteros, fechas en UTC y teléfonos sin espacios (+56961234501).
-- Si ya corriste la v1 en tu MariaDB, las tablas existentes NO se modifican con
-- «CREATE TABLE IF NOT EXISTS». Como la v1 no tiene datos, bórrala antes de correr este script:
--   DROP DATABASE IF EXISTS entrecasas_db;
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `entrecasas_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `entrecasas_db`;

-- ========================================================
-- Comunidades, unidades y personas
-- ========================================================

-- M3: datos de transferencia de la comunidad (la app los muestra para pagar), umbral de visado (O2)
-- y estado de la comunidad (P1, autorizado el 2026-10-27): Plataforma puede suspenderla
CREATE TABLE IF NOT EXISTS `redes_vecinales` (
  `id_red` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('Villa','Condominio','Edificio') NOT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `banco` varchar(60) DEFAULT NULL,
  `tipo_cuenta` varchar(40) DEFAULT NULL,
  `numero_cuenta` varchar(30) DEFAULT NULL,
  `titular_cuenta` varchar(100) DEFAULT NULL,
  `rut_titular` varchar(12) DEFAULT NULL,
  `correo_pagos` varchar(100) DEFAULT NULL,
  `umbral_visado` decimal(10,2) DEFAULT 300000.00 COMMENT 'Egresos sobre este monto requieren visado del Presidente',
  `estado` enum('Activa','Suspendida') NOT NULL DEFAULT 'Activa' COMMENT 'Plataforma puede suspender: nadie de la comunidad entra',
  `motivo_suspension` varchar(255) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_red`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- N3: módulos encendidos por comunidad. Sin fila = apagado.
CREATE TABLE IF NOT EXISTS `red_modulos` (
  `id_red` int(11) NOT NULL,
  `modulo` enum('muro','marketplace','votaciones','reservas','cobros','invitaciones_qr','conserjeria','administrador_externo') NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_cambio` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_red`,`modulo`),
  CONSTRAINT `fk_red_modulos_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Sin cambios: el tipo de unidad (Casa o Departamento) sale del tipo de comunidad;
-- manzana, pasaje o torre van en `calle_pasaje`.
CREATE TABLE IF NOT EXISTS `unidades` (
  `id_unidad` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `numero_identificador` varchar(20) NOT NULL,
  `calle_pasaje` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_unidad`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `fk_unidades_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- M2: se agrega «Plataforma» (equipo EntreCasas que crea comunidades). «Visitante» queda sin uso:
-- las visitas no entran a la app, se guardan en `visitantes`.
CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `roles` (`id_rol`, `nombre_rol`) VALUES
	(1, 'Administración'),
	(2, 'Tesorero Vecinos'),
	(3, 'Secretario Vecinos'),
	(4, 'Presidente Vecinos'),
	(5, 'Conserje'),
	(6, 'Residente'),
	(7, 'Visitante'),
	(8, 'Plataforma')
ON DUPLICATE KEY UPDATE `nombre_rol` = VALUES(`nombre_rol`);

-- M1: el rol y la unidad salen de aquí (van a `membresias` y `residencias`).
-- `estado` distingue a quien fue invitado y aún no activa su cuenta. Hay personas con un solo apellido.
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido_paterno` varchar(50) NOT NULL,
  `apellido_materno` varchar(50) DEFAULT NULL,
  `correo` varchar(100) NOT NULL,
  `telefono` varchar(15) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `estado` enum('Activo','Invitado','Desactivado') NOT NULL DEFAULT 'Activo',
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `rut` (`rut`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- N1: cargos y personal por comunidad, con su periodo. Residente no va aquí: sale de `residencias`.
-- Plataforma no pertenece a una comunidad (`id_red` NULL).
CREATE TABLE IF NOT EXISTS `membresias` (
  `id_membresia` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_red` int(11) DEFAULT NULL,
  `id_rol` int(11) NOT NULL,
  `fecha_desde` date NOT NULL,
  `fecha_hasta` date DEFAULT NULL,
  `estado` enum('Vigente','Terminada') NOT NULL DEFAULT 'Vigente',
  PRIMARY KEY (`id_membresia`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_red` (`id_red`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `fk_membresias_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresias_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_membresias_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- N2: en qué unidades vive cada persona. «Solicitar acceso» crea una fila Pendiente que el
-- administrador aprueba (Activa) o rechaza. Al irse un arrendatario queda Inactiva.
CREATE TABLE IF NOT EXISTS `residencias` (
  `id_residencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `relacion` enum('Propietario','Arrendatario') NOT NULL,
  `estado` enum('Pendiente','Activa','Rechazada','Inactiva') NOT NULL DEFAULT 'Pendiente',
  `mensaje` varchar(255) DEFAULT NULL COMMENT 'Lo que escribe quien solicita acceso',
  `fecha_solicitud` datetime DEFAULT current_timestamp(),
  `id_usuario_resuelve` int(11) DEFAULT NULL,
  `fecha_resolucion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_residencia`),
  UNIQUE KEY `usuario_unidad` (`id_usuario`,`id_unidad`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `fk_residencias_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_residencias_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_residencias_resuelve` FOREIGN KEY (`id_usuario_resuelve`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O5: quién hizo qué en cada comunidad (bitácora del Presidente y de Plataforma)
CREATE TABLE IF NOT EXISTS `bitacora` (
  `id_bitacora` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) DEFAULT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `detalle` varchar(255) DEFAULT NULL,
  `fecha` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_bitacora`),
  KEY `red_fecha` (`id_red`,`fecha`),
  CONSTRAINT `fk_bitacora_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ========================================================
-- Cobros y pagos (sin integraciones de pago: transferencia y marca manual)
-- ========================================================

-- N4: categorías que define el tesorero (Gasto común, Fondo de reserva, Mantención…)
CREATE TABLE IF NOT EXISTS `categorias_cobro` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_categoria`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `fk_categorias_cobro_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- N5: un cobro emitido a todas las unidades de la comunidad. Cada unidad recibe su fila en `gastos_comunes`.
CREATE TABLE IF NOT EXISTS `cobros` (
  `id_cobro` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `concepto` varchar(150) NOT NULL,
  `monto_por_unidad` decimal(10,2) NOT NULL,
  `mes` tinyint(4) NOT NULL,
  `anio` year(4) NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `es_extraordinario` tinyint(1) NOT NULL DEFAULT 0,
  `id_usuario_emite` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_cobro`),
  KEY `red_periodo` (`id_red`,`anio`,`mes`),
  KEY `id_categoria` (`id_categoria`),
  CONSTRAINT `fk_cobros_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_cobros_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_cobro` (`id_categoria`),
  CONSTRAINT `fk_cobros_emite` FOREIGN KEY (`id_usuario_emite`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- M4: cada fila es lo que una unidad debe por un cobro. Se agrega `id_cobro` y el estado Exento
-- (exención aprobada: la unidad no debe, pero tampoco pagó).
CREATE TABLE IF NOT EXISTS `gastos_comunes` (
  `id_gasto` int(11) NOT NULL AUTO_INCREMENT,
  `id_cobro` int(11) DEFAULT NULL,
  `id_unidad` int(11) NOT NULL,
  `mes` tinyint(4) NOT NULL,
  `anio` year(4) NOT NULL,
  `monto_total` decimal(10,2) NOT NULL,
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado_pago` enum('Pendiente','Pagado','Atrasado','Exento') DEFAULT 'Pendiente',
  `descripcion` text DEFAULT NULL,
  PRIMARY KEY (`id_gasto`),
  UNIQUE KEY `cobro_unidad` (`id_cobro`,`id_unidad`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `fk_gastos_cobro` FOREIGN KEY (`id_cobro`) REFERENCES `cobros` (`id_cobro`) ON DELETE CASCADE,
  CONSTRAINT `fk_gastos_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- M5: sin MercadoPago (el proyecto no integra pagos). El residente avisa su transferencia
-- (Pendiente) y el tesorero o administrador la valida. Un pago marcado a mano en el panel nace Validado.
CREATE TABLE IF NOT EXISTS `pagos` (
  `id_pago` int(11) NOT NULL AUTO_INCREMENT,
  `id_gasto` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL COMMENT 'Residente que avisó la transferencia',
  `monto_pagado` decimal(10,2) NOT NULL,
  `fecha_pago` datetime DEFAULT current_timestamp(),
  `metodo_pago` enum('Transferencia','Efectivo') NOT NULL DEFAULT 'Transferencia',
  `comprobante_url` varchar(255) DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  `estado_validacion` enum('Pendiente','Validado','Rechazado') DEFAULT 'Pendiente',
  `id_validador` int(11) DEFAULT NULL,
  `fecha_validacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_pago`),
  KEY `id_gasto` (`id_gasto`),
  CONSTRAINT `fk_pagos_gasto` FOREIGN KEY (`id_gasto`) REFERENCES `gastos_comunes` (`id_gasto`) ON DELETE CASCADE,
  CONSTRAINT `fk_pagos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_pagos_validador` FOREIGN KEY (`id_validador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O1: exención de una unidad para un cobro. Si se aprueba, el gasto queda Exento.
CREATE TABLE IF NOT EXISTS `exenciones` (
  `id_exencion` int(11) NOT NULL AUTO_INCREMENT,
  `id_gasto` int(11) NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `id_solicitante` int(11) DEFAULT NULL,
  `fecha_solicitud` datetime DEFAULT current_timestamp(),
  `estado` enum('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  `id_resuelve` int(11) DEFAULT NULL,
  `fecha_resolucion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_exencion`),
  KEY `id_gasto` (`id_gasto`),
  CONSTRAINT `fk_exenciones_gasto` FOREIGN KEY (`id_gasto`) REFERENCES `gastos_comunes` (`id_gasto`) ON DELETE CASCADE,
  CONSTRAINT `fk_exenciones_solicitante` FOREIGN KEY (`id_solicitante`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_exenciones_resuelve` FOREIGN KEY (`id_resuelve`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O2: gastos de la comunidad. Sobre `redes_vecinales.umbral_visado` requieren visado del Presidente.
-- P2 (autorizado el 2026-10-27): `proveedor`, a quién se le pagó el gasto.
CREATE TABLE IF NOT EXISTS `egresos` (
  `id_egreso` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `descripcion` varchar(255) NOT NULL,
  `proveedor` varchar(150) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fecha` date NOT NULL,
  `id_usuario_registra` int(11) DEFAULT NULL,
  `requiere_visado` tinyint(1) NOT NULL DEFAULT 0,
  `estado_visado` enum('Pendiente','Aprobado','Rechazado') DEFAULT NULL,
  `id_visador` int(11) DEFAULT NULL,
  `fecha_visado` datetime DEFAULT NULL,
  `comprobante_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_egreso`),
  KEY `red_fecha` (`id_red`,`fecha`),
  CONSTRAINT `fk_egresos_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_egresos_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_cobro` (`id_categoria`) ON DELETE SET NULL,
  CONSTRAINT `fk_egresos_registra` FOREIGN KEY (`id_usuario_registra`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_egresos_visador` FOREIGN KEY (`id_visador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- P3 (autorizado el 2026-10-27): correos que envía el sistema. Crear un cobro avisa a todas las
-- unidades y el tesorero puede recordar a los morosos. Una fila por envío, con cuántas unidades lo recibieron.
-- P6 (autorizado el 2026-10-27): Secretaría también recuerda las votaciones a las unidades que no han votado
-- (tipo 'Recordatorio de votación' con `id_votacion`).
CREATE TABLE IF NOT EXISTS `correos_enviados` (
  `id_correo` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `tipo` enum('Nuevo cobro','Recordatorio de morosidad','Recordatorio de votación') NOT NULL,
  `asunto` varchar(150) NOT NULL,
  `id_cobro` int(11) DEFAULT NULL COMMENT 'Cobro que avisa (tipo Nuevo cobro)',
  `id_votacion` int(11) DEFAULT NULL COMMENT 'Votación que recuerda (tipo Recordatorio de votación)',
  `destinatarios` int(11) NOT NULL DEFAULT 0 COMMENT 'Unidades que recibieron el correo',
  `id_usuario_envia` int(11) DEFAULT NULL,
  `fecha_envio` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_correo`),
  KEY `red_fecha` (`id_red`,`fecha_envio`),
  CONSTRAINT `fk_correos_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_correos_cobro` FOREIGN KEY (`id_cobro`) REFERENCES `cobros` (`id_cobro`) ON DELETE SET NULL,
  CONSTRAINT `fk_correos_votacion` FOREIGN KEY (`id_votacion`) REFERENCES `votaciones` (`id_votacion`) ON DELETE SET NULL,
  CONSTRAINT `fk_correos_envia` FOREIGN KEY (`id_usuario_envia`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ========================================================
-- Espacios comunes y reservas
-- ========================================================

-- Sin cambios: las reglas de uso van en `descripcion`
CREATE TABLE IF NOT EXISTS `espacios_comunes` (
  `id_espacio` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `capacidad` int(11) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id_espacio`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `fk_espacios_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- N6: bloques fijos que se pueden reservar (Quincho 12:00–17:00 y 18:00–23:30)
CREATE TABLE IF NOT EXISTS `espacios_bloques` (
  `id_bloque` int(11) NOT NULL AUTO_INCREMENT,
  `id_espacio` int(11) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id_bloque`),
  KEY `id_espacio` (`id_espacio`),
  CONSTRAINT `fk_bloques_espacio` FOREIGN KEY (`id_espacio`) REFERENCES `espacios_comunes` (`id_espacio`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- M6: la reserva es de la unidad (quien reserva puede tener varias). Conserjería la entrega
-- y la recibe (Entregado, Devuelto) y anota cómo quedó el espacio.
CREATE TABLE IF NOT EXISTS `reservas` (
  `id_reserva` int(11) NOT NULL AUTO_INCREMENT,
  `id_espacio` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `fecha_reserva` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `cantidad_invitados` int(11) NOT NULL DEFAULT 0,
  `estado_reserva` enum('Pendiente','Aprobada','Rechazada','Cancelada','Entregado','Devuelto') DEFAULT 'Pendiente',
  `observacion` varchar(255) DEFAULT NULL,
  `fecha_solicitud` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_reserva`),
  KEY `espacio_fecha` (`id_espacio`,`fecha_reserva`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `fk_reservas_espacio` FOREIGN KEY (`id_espacio`) REFERENCES `espacios_comunes` (`id_espacio`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservas_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservas_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ========================================================
-- Muro y marketplace
-- ========================================================

-- M7: cada publicación es de una comunidad. Comunicados y normas los aprueba el Presidente;
-- lo de vecinos se publica directo (Aprobada) y sin título.
-- P4 (autorizado el 2026-10-27): `id_moderador` y `fecha_moderacion`. Con `estado` = 0 y moderador,
-- la ocultó la administración (se puede restaurar); sin moderador, la eliminó su autor.
CREATE TABLE IF NOT EXISTS `muro_publicaciones` (
  `id_publicacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_unidad` int(11) DEFAULT NULL COMMENT 'Vivienda desde la que publica un vecino',
  `tipo` enum('Vecino','Comunicado','Norma') NOT NULL DEFAULT 'Vecino',
  `titulo` varchar(150) DEFAULT NULL,
  `contenido` text NOT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  `estado_aprobacion` enum('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Aprobada',
  `id_aprobador` int(11) DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1 COMMENT '0 = oculta por moderación o eliminada',
  `id_moderador` int(11) DEFAULT NULL COMMENT 'Quién la ocultó o la restauró',
  `fecha_moderacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_publicacion`),
  KEY `red_fecha` (`id_red`,`fecha_creacion`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_muro_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_muro_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_muro_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE SET NULL,
  CONSTRAINT `fk_muro_aprobador` FOREIGN KEY (`id_aprobador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_muro_moderador` FOREIGN KEY (`id_moderador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `categorias_marketplace` (
  `id_categoria` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_categoria` varchar(50) NOT NULL,
  PRIMARY KEY (`id_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

INSERT INTO `categorias_marketplace` (`id_categoria`, `nombre_categoria`) VALUES
	(1, 'Vendo'),
	(2, 'Servicio'),
	(3, 'Busco')
ON DUPLICATE KEY UPDATE `nombre_categoria` = VALUES(`nombre_categoria`);

-- M8: el aviso es de una comunidad y puede no tener precio (Busco, servicios «a convenir»).
-- `telefono_contacto` solo se muestra a quien el vendedor acepta (ver `solicitudes_contacto`).
-- P4 (autorizado el 2026-10-27): `id_moderador` y `fecha_moderacion`, igual que en el muro.
CREATE TABLE IF NOT EXISTS `marketplace_publicaciones` (
  `id_producto` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_unidad` int(11) DEFAULT NULL,
  `id_categoria` int(11) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `telefono_contacto` varchar(15) DEFAULT NULL,
  `fecha_publicacion` datetime DEFAULT current_timestamp(),
  `estado` tinyint(1) DEFAULT 1 COMMENT '0 = oculto por moderación o eliminado',
  `id_moderador` int(11) DEFAULT NULL COMMENT 'Quién lo ocultó o lo restauró',
  `fecha_moderacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  KEY `red_fecha` (`id_red`,`fecha_publicacion`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_categoria` (`id_categoria`),
  CONSTRAINT `fk_marketplace_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_marketplace_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_marketplace_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE SET NULL,
  CONSTRAINT `fk_marketplace_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias_marketplace` (`id_categoria`),
  CONSTRAINT `fk_marketplace_moderador` FOREIGN KEY (`id_moderador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O7: «Contactar» en el mercado. Si el vendedor acepta, el interesado ve su teléfono.
CREATE TABLE IF NOT EXISTS `solicitudes_contacto` (
  `id_solicitud` int(11) NOT NULL AUTO_INCREMENT,
  `id_producto` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL COMMENT 'Vecino interesado',
  `id_unidad` int(11) DEFAULT NULL,
  `estado` enum('Pendiente','Aceptada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  `fecha_solicitud` datetime DEFAULT current_timestamp(),
  `fecha_respuesta` datetime DEFAULT NULL,
  `vista` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'El interesado ya vio la respuesta',
  PRIMARY KEY (`id_solicitud`),
  UNIQUE KEY `producto_usuario` (`id_producto`,`id_usuario`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_solicitudes_producto` FOREIGN KEY (`id_producto`) REFERENCES `marketplace_publicaciones` (`id_producto`) ON DELETE CASCADE,
  CONSTRAINT `fk_solicitudes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_solicitudes_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O6: reportes de vecinos sobre el muro o el marketplace, para que el administrador modere
-- P4 (autorizado el 2026-10-27): `estado`. Al ocultar la publicación sus reportes quedan Atendido;
-- al descartarlos quedan Descartado y la publicación sigue visible.
-- P5 (autorizado el 2026-10-27): `motivo` pasa a NOT NULL.
CREATE TABLE IF NOT EXISTS `reportes_publicacion` (
  `id_reporte` int(11) NOT NULL AUTO_INCREMENT,
  `tipo_publicacion` enum('muro','marketplace') NOT NULL,
  `id_publicacion` int(11) NOT NULL COMMENT 'id_publicacion o id_producto según tipo_publicacion',
  `id_usuario` int(11) NOT NULL,
  `motivo` varchar(255) NOT NULL COMMENT 'Obligatorio: el vecino elige un motivo al reportar',
  `fecha` datetime DEFAULT current_timestamp(),
  `estado` enum('Pendiente','Descartado','Atendido') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`id_reporte`),
  UNIQUE KEY `uno_por_usuario` (`tipo_publicacion`,`id_publicacion`,`id_usuario`),
  CONSTRAINT `fk_reportes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ========================================================
-- Votaciones, actas y directorio
-- ========================================================

-- N8–N10: un voto por unidad, aunque vivan varias personas
CREATE TABLE IF NOT EXISTS `votaciones` (
  `id_votacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `tipo` enum('Votación','Encuesta') NOT NULL DEFAULT 'Votación',
  `titulo` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_cierre` date NOT NULL,
  `quorum` tinyint(4) DEFAULT NULL COMMENT 'Porcentaje de unidades; NULL en encuestas',
  `estado` enum('Abierta','Cerrada') NOT NULL DEFAULT 'Abierta',
  `id_usuario_crea` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_votacion`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `fk_votaciones_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_votaciones_crea` FOREIGN KEY (`id_usuario_crea`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `votacion_opciones` (
  `id_opcion` int(11) NOT NULL AUTO_INCREMENT,
  `id_votacion` int(11) NOT NULL,
  `texto` varchar(150) NOT NULL,
  PRIMARY KEY (`id_opcion`),
  KEY `id_votacion` (`id_votacion`),
  CONSTRAINT `fk_opciones_votacion` FOREIGN KEY (`id_votacion`) REFERENCES `votaciones` (`id_votacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `votos` (
  `id_voto` int(11) NOT NULL AUTO_INCREMENT,
  `id_votacion` int(11) NOT NULL,
  `id_opcion` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL COMMENT 'Residente que votó por la unidad',
  `fecha` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_voto`),
  UNIQUE KEY `un_voto_por_unidad` (`id_votacion`,`id_unidad`),
  KEY `id_opcion` (`id_opcion`),
  CONSTRAINT `fk_votos_votacion` FOREIGN KEY (`id_votacion`) REFERENCES `votaciones` (`id_votacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_votos_opcion` FOREIGN KEY (`id_opcion`) REFERENCES `votacion_opciones` (`id_opcion`) ON DELETE CASCADE,
  CONSTRAINT `fk_votos_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_votos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O3: libro de actas de Secretaría. Asistentes y temas son listas cortas: se guardan como texto, una por línea.
CREATE TABLE IF NOT EXISTS `actas` (
  `id_acta` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `numero` int(11) NOT NULL,
  `tipo` enum('Reunión de directiva','Asamblea ordinaria','Asamblea extraordinaria') NOT NULL,
  `fecha` date NOT NULL,
  `lugar` varchar(100) DEFAULT NULL,
  `asistentes` text DEFAULT NULL,
  `unidades_presentes` int(11) DEFAULT NULL,
  `temas` text DEFAULT NULL,
  `estado` enum('Borrador','Publicada') NOT NULL DEFAULT 'Borrador',
  `id_redactor` int(11) DEFAULT NULL,
  `fecha_publicacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_acta`),
  UNIQUE KEY `red_numero` (`id_red`,`numero`),
  CONSTRAINT `fk_actas_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE,
  CONSTRAINT `fk_actas_redactor` FOREIGN KEY (`id_redactor`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE IF NOT EXISTS `acta_acuerdos` (
  `id_acuerdo` int(11) NOT NULL AUTO_INCREMENT,
  `id_acta` int(11) NOT NULL,
  `texto` varchar(255) NOT NULL,
  `responsable` varchar(100) DEFAULT NULL,
  `plazo` date DEFAULT NULL,
  PRIMARY KEY (`id_acuerdo`),
  KEY `id_acta` (`id_acta`),
  CONSTRAINT `fk_acuerdos_acta` FOREIGN KEY (`id_acta`) REFERENCES `actas` (`id_acta`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O4: contactos útiles de la comunidad. `visible` = se muestra en la app de residentes.
CREATE TABLE IF NOT EXISTS `contactos` (
  `id_contacto` int(11) NOT NULL AUTO_INCREMENT,
  `id_red` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `detalle` varchar(150) DEFAULT NULL,
  `telefono` varchar(15) NOT NULL,
  `horario` varchar(100) DEFAULT NULL,
  `visible` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_contacto`),
  KEY `id_red` (`id_red`),
  CONSTRAINT `fk_contactos_red` FOREIGN KEY (`id_red`) REFERENCES `redes_vecinales` (`id_red`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- ========================================================
-- Portería
-- ========================================================

-- Sin cambios: un delivery sin apellido se guarda con apellido vacío
CREATE TABLE IF NOT EXISTS `visitantes` (
  `id_visitante` int(11) NOT NULL AUTO_INCREMENT,
  `rut` varchar(12) DEFAULT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `tipo` enum('Frecuente','Esporádico') DEFAULT 'Esporádico',
  PRIMARY KEY (`id_visitante`),
  UNIQUE KEY `rut` (`rut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- N7: invitación con código QR que crea el residente y valida la garita
CREATE TABLE IF NOT EXISTS `invitaciones` (
  `id_invitacion` int(11) NOT NULL AUTO_INCREMENT,
  `codigo` varchar(12) NOT NULL COMMENT 'Formato EC-XXXXX',
  `id_unidad` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL COMMENT 'Residente que invita',
  `id_visitante` int(11) NOT NULL,
  `tipo` enum('Visita','Proveedor','Servicio') NOT NULL DEFAULT 'Visita',
  `fecha_desde` datetime NOT NULL,
  `fecha_hasta` datetime NOT NULL,
  `patente` varchar(10) DEFAULT NULL,
  `estado` enum('Esperada','Adentro','Salió','Cancelada') NOT NULL DEFAULT 'Esperada',
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_invitacion`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `unidad_fecha` (`id_unidad`,`fecha_desde`),
  CONSTRAINT `fk_invitaciones_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitaciones_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitaciones_visitante` FOREIGN KEY (`id_visitante`) REFERENCES `visitantes` (`id_visitante`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- M9: una fila por visita, con su ingreso y su salida. Con invitación QR nace Aprobado;
-- sin invitación nace «Pendiente de Confirmación» hasta que el residente responde en la app
-- o la garita lo confirma por teléfono (`autorizado_via`).
CREATE TABLE IF NOT EXISTS `registro_accesos` (
  `id_acceso` int(11) NOT NULL AUTO_INCREMENT,
  `id_visitante` int(11) NOT NULL,
  `id_unidad` int(11) NOT NULL,
  `id_invitacion` int(11) DEFAULT NULL,
  `categoria` enum('Visita','Delivery','Proveedor','Servicio') NOT NULL DEFAULT 'Visita',
  `patente` varchar(10) DEFAULT NULL,
  `metodo` enum('QR','Manual') NOT NULL DEFAULT 'Manual',
  `fecha_ingreso` datetime DEFAULT current_timestamp(),
  `fecha_salida` datetime DEFAULT NULL,
  `estado_autorizacion` enum('Aprobado','Rechazado','Pendiente de Confirmación') NOT NULL,
  `autorizado_via` enum('Invitación','App','Teléfono') DEFAULT NULL,
  `id_usuario_autoriza` int(11) DEFAULT NULL COMMENT 'Residente que autorizó',
  `id_usuario_registra` int(11) DEFAULT NULL COMMENT 'Conserje que anotó el ingreso',
  `codigo_qr_validado` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_acceso`),
  KEY `id_visitante` (`id_visitante`),
  KEY `unidad_fecha` (`id_unidad`,`fecha_ingreso`),
  KEY `id_invitacion` (`id_invitacion`),
  CONSTRAINT `fk_accesos_visitante` FOREIGN KEY (`id_visitante`) REFERENCES `visitantes` (`id_visitante`) ON DELETE CASCADE,
  CONSTRAINT `fk_accesos_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE,
  CONSTRAINT `fk_accesos_invitacion` FOREIGN KEY (`id_invitacion`) REFERENCES `invitaciones` (`id_invitacion`) ON DELETE SET NULL,
  CONSTRAINT `fk_accesos_autoriza` FOREIGN KEY (`id_usuario_autoriza`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL,
  CONSTRAINT `fk_accesos_registra` FOREIGN KEY (`id_usuario_registra`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- O8: vehículos de cada unidad, para buscar por patente en la garita
CREATE TABLE IF NOT EXISTS `vehiculos` (
  `id_vehiculo` int(11) NOT NULL AUTO_INCREMENT,
  `id_unidad` int(11) NOT NULL,
  `patente` varchar(10) NOT NULL,
  `modelo` varchar(60) DEFAULT NULL,
  `estacionamiento` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id_vehiculo`),
  UNIQUE KEY `patente` (`patente`),
  KEY `id_unidad` (`id_unidad`),
  CONSTRAINT `fk_vehiculos_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
