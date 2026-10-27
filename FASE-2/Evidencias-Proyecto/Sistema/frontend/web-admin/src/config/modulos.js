// Módulos activables por comunidad y lo que cada tipo trae encendido al crearse.
// Debe calzar con las tablas `modulos` y `red_modulos` propuestas para la base de datos.

export const MODULOS = {
  muro: 'Muro, comunicados y normas',
  marketplace: 'Marketplace vecinal',
  votaciones: 'Votaciones, encuestas y actas',
  reservas: 'Reservas de espacios',
  cobros: 'Cobros y gastos comunes',
  invitaciones_qr: 'Invitaciones QR',
  conserjeria: 'Conserjería y garita',
  administrador_externo: 'Administrador externo',
};

const TODOS = Object.keys(MODULOS);

export const MODULOS_POR_TIPO = {
  Edificio: TODOS,
  Condominio: TODOS.filter((m) => m !== 'conserjeria'),
  Villa: ['muro', 'marketplace', 'votaciones', 'reservas', 'cobros'],
};

// Qué agrega cada módulo y quién lo usa
export const DETALLE_MODULOS = {
  muro: 'Comunicados y normas oficiales (con aprobación del Presidente) y publicaciones de vecinos.',
  marketplace: 'Compra, venta y servicios entre vecinos. Se modera igual que el muro.',
  votaciones: 'Votaciones con quórum, encuestas y libro de actas de la Secretaría.',
  reservas: 'Reserva de espacios comunes desde la app, con entrega en conserjería si existe.',
  cobros: 'Cobros, morosidad, exenciones y reportes. Los pagos se hacen por transferencia y se marcan a mano.',
  invitaciones_qr: 'El residente invita visitas con un código QR que se valida en la entrada.',
  conserjeria: 'Panel de garita: accesos en vivo, validación de QR, espacios del día y búsqueda rápida.',
  administrador_externo: 'La comunidad tiene un administrador contratado. Si se apaga, el Presidente asume la administración.',
};
