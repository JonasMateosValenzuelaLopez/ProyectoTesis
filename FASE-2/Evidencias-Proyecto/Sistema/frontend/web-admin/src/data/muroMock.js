// Datos de ejemplo del muro y el marketplace con las filas de la base: `muro_publicaciones`
// (vecinos, comunicados y normas), `marketplace_publicaciones` y `reportes_publicacion`.
// Son las mismas filas que usa la app de residentes. `solicitudes_contacto` solo vive en la app.

export const CATEGORIAS_MARKETPLACE = [
  { id_categoria: 1, nombre_categoria: 'Vendo' },
  { id_categoria: 2, nombre_categoria: 'Servicio' },
  { id_categoria: 3, nombre_categoria: 'Busco' },
];

// Lo de vecinos se publica directo (Aprobada, sin aprobador ni título)
const vecino = (id_publicacion, id_red, id_usuario, id_unidad, contenido, fecha_creacion, extra) => ({
  id_publicacion, id_red, id_usuario, id_unidad, tipo: 'Vecino', titulo: null, contenido, fecha_creacion,
  estado_aprobacion: 'Aprobada', id_aprobador: null, fecha_aprobacion: null, estado: 1, id_moderador: null, fecha_moderacion: null, ...extra,
});
// Comunicados y normas: sin `id_aprobador` quedan esperando al Presidente
const oficial = (id_publicacion, id_red, id_usuario, tipo, titulo, contenido, fecha_creacion, id_aprobador = null, fecha_aprobacion = null) => ({
  ...vecino(id_publicacion, id_red, id_usuario, null, contenido, fecha_creacion),
  tipo, titulo, estado_aprobacion: id_aprobador ? 'Aprobada' : 'Pendiente', id_aprobador, fecha_aprobacion,
});
const producto = (id_producto, id_red, id_usuario, id_unidad, id_categoria, titulo, descripcion, precio, telefono_contacto, fecha_publicacion) => ({
  id_producto, id_red, id_usuario, id_unidad, id_categoria, titulo, descripcion, precio, foto_url: null, telefono_contacto, fecha_publicacion,
  estado: 1, id_moderador: null, fecha_moderacion: null,
});
const reporte = (id_reporte, tipo_publicacion, id_publicacion, id_usuario, motivo, fecha, estado = 'Pendiente') => ({
  id_reporte, tipo_publicacion, id_publicacion, id_usuario, motivo, fecha, estado,
});

// 104 Andrea Lagos (secretaria) redacta; 102 Luis Muñoz (presidente) aprueba; 101 Carlos Ibáñez modera
const MURO = {
  1: [
    oficial(101, 1, 104, 'Norma', 'Tenencia responsable de mascotas', 'Las mascotas deben circular con correa por el pasaje y sus dueños deben recoger los desechos. Los reclamos se registran en el muro.', '2026-08-02T10:00:00', 102, '2026-08-03T09:00:00'),
    oficial(102, 1, 104, 'Comunicado', 'Poda de árboles del pasaje', 'El martes 14 se podarán los árboles del pasaje entre 9:00 y 13:00. Por favor no estacionar bajo los árboles ese día.', '2026-10-09T10:00:00', 102, '2026-10-09T18:30:00'),
    vecino(103, 1, 1010, 1009, 'Vendo entradas para el concierto del sábado.', '2026-10-25T18:00:00', { estado: 0, id_moderador: 101, fecha_moderacion: '2026-10-25T18:42:00' }),
    vecino(104, 1, 1005, 1004, '¿Alguien perdió un gato gris? Está en mi patio desde anoche.', '2026-10-25T21:10:00'),
    vecino(105, 1, 1008, 1007, 'Otra vez dejaron la basura fuera del contenedor. Así no se puede vivir, los de la casa 3 nunca respetan nada.', '2026-10-24T08:45:00'),
    vecino(106, 1, 1008, 1007, 'Gracias a quien dejó el paquete de Correos en mi puerta, llegó perfecto.', '2026-10-23T19:40:00'),
    oficial(107, 1, 104, 'Comunicado', 'Corte de agua programado el sábado 31', 'Aguas Andinas realizará trabajos en la matriz. El sábado 31 de octubre no habrá agua entre 9:00 y 15:00. Les recomendamos guardar agua el viernes.', '2026-10-25T11:00:00'),
    oficial(108, 1, 104, 'Norma', 'Horario de uso del quincho', 'El quincho se podrá usar de domingo a jueves hasta las 23:00 y viernes y sábado hasta la 01:00. Cada reserva debe dejar el espacio limpio para la entrega en conserjería.', '2026-10-24T16:00:00'),
  ],
  // 2077 Paula Reyes (secretaria) redacta; 105 Sonia Fuentealba (presidenta) aprueba
  2: [
    oficial(201, 2, 2077, 'Comunicado', 'Asamblea ordinaria de octubre', 'El acta de la asamblea del 4 de octubre ya está disponible. Se aprobó cotizar una alarma comunitaria; la votación está abierta en la app.', '2026-10-06T09:00:00', 105, '2026-10-06T12:00:00'),
    vecino(202, 2, 2026, 2026, 'Este sábado hacemos limpieza de la plaza de la manzana B. ¡Los esperamos a las 10!', '2026-10-24T10:00:00'),
    oficial(203, 2, 2077, 'Comunicado', 'Corte de agua el sábado', 'El sábado 31 no habrá agua entre 9:00 y 15:00 por trabajos en la matriz.', '2026-10-25T10:00:00'),
  ],
  // 107 Patricia Olave (administradora): sin Presidente, publica y aprueba ella
  3: [
    oficial(301, 3, 107, 'Comunicado', 'Mantención de ascensores', 'El jueves de 10:00 a 13:00 el ascensor A estará detenido por mantención preventiva.', '2026-10-22T09:00:00', 107, '2026-10-22T09:00:00'),
    vecino(302, 3, 3026, 3104, 'Se encontró un juego de llaves en el gimnasio. Están en conserjería.', '2026-10-25T08:20:00'),
  ],
};

const MARKETPLACE = {
  1: [
    producto(101, 1, 1014, 1013, 1, 'Bicicleta aro 26', 'En buen estado. Se puede probar en el pasaje.', 45000, '+56957496502', '2026-10-23T17:30:00'),
    producto(102, 1, 1010, 1009, 2, 'Clases de matemáticas', 'Para básica y media. Primera clase sin costo.', null, '+56957466930', '2026-10-21T12:00:00'),
    producto(103, 1, 1005, 1004, 3, 'Escalera de 3 metros', 'Busco quien me la preste el fin de semana.', null, '+56957429965', '2026-10-24T09:15:00'),
    producto(104, 1, 102, 1005, 1, 'Coche de bebé plegable', 'Poco uso. Incluye cubre lluvia.', 60000, '+56961234502', '2026-10-25T11:00:00'),
    producto(105, 1, 1008, 1007, 1, 'Mesa de ping-pong plegable', 'Con paletas y pelotas.', 80000, '+56957452144', '2026-10-19T16:00:00'),
    producto(106, 1, 1010, 1009, 2, 'Préstamos rápidos', 'Préstamos rápidos sin papeleo, escríbeme al interno.', null, '+56957466930', '2026-10-22T12:00:00'),
  ],
  2: [
    producto(201, 2, 2077, 2077, 1, 'Empanadas de pino', 'Los domingos. Pedidos hasta el sábado.', 3500, '+56965355261', '2026-10-22T18:00:00'),
  ],
  3: [
    producto(301, 3, 3016, 3302, 1, 'Escritorio blanco de 120 cm', 'Con cajonera. Retiro en el depto.', 120000, '+56972297288', '2026-10-20T20:00:00'),
  ],
};

// Reportes de vecinos. Los de una publicación ya oculta quedaron Atendido.
const REPORTES = {
  1: [
    reporte(1, 'muro', 103, 104, 'Comercio fuera del marketplace', '2026-10-25T18:20:00', 'Atendido'),
    reporte(2, 'muro', 105, 1004, 'Acusación personal', '2026-10-24T09:30:00'),
    reporte(3, 'muro', 105, 1011, 'Lenguaje ofensivo', '2026-10-24T11:02:00'),
    reporte(4, 'marketplace', 106, 110, 'Posible estafa', '2026-10-22T15:20:00'),
  ],
  2: [],
  3: [],
};

export function muroInicial() {
  return Object.fromEntries([1, 2, 3].map((id_red) => [id_red, {
    muro_publicaciones: MURO[id_red],
    marketplace_publicaciones: MARKETPLACE[id_red],
    reportes_publicacion: REPORTES[id_red],
  }]));
}

export const muroVacio = () => ({ muro_publicaciones: [], marketplace_publicaciones: [], reportes_publicacion: [] });
