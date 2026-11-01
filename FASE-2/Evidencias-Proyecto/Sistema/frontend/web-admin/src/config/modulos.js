// Módulos activables por comunidad y lo que cada tipo trae encendido al crearse.
// Las claves son los valores del enum `red_modulos.modulo` de la base.

export const MODULOS = {
  muro: 'Muro, comunicados y normas',
  marketplace: 'Marketplace vecinal',
  votaciones: 'Votaciones, encuestas y actas',
  reservas: 'Reservas de espacios',
  cobros: 'Cobros y gastos comunes',
  invitaciones_qr: 'Invitaciones QR',
  conserjeria: 'Conserjería y garita',
  administrador_externo: 'Administración externa',
};

const TODOS = Object.keys(MODULOS);

export const MODULOS_POR_TIPO = {
  Edificio: TODOS,
  Condominio: TODOS.filter((m) => m !== 'conserjeria'),
  Villa: ['muro', 'marketplace', 'votaciones', 'reservas', 'cobros'],
};

// Qué agrega cada módulo y quién lo usa
export const DETALLE_MODULOS = {
  muro: 'Comunicados y normas oficiales (con aprobación de la Presidencia) y publicaciones de vecinos.',
  marketplace: 'Compra, venta y servicios entre vecinos. Se modera igual que el muro.',
  votaciones: 'Votaciones con quórum, encuestas y libro de actas de la Secretaría.',
  reservas: 'Reserva de espacios comunes desde la app, con entrega en conserjería si existe.',
  cobros: 'Cobros, morosidad, exenciones y reportes. Los pagos se hacen por transferencia y se marcan a mano.',
  invitaciones_qr: 'El residente invita visitas con un código QR que se valida en la entrada.',
  conserjeria: 'Panel de garita: accesos en vivo, validación de QR, espacios del día y búsqueda rápida.',
  administrador_externo: 'La comunidad tiene una administración contratada. Si se apaga, la Presidencia asume la administración.',
};

// `red_modulos`: una fila por módulo con `activo`; sin fila = apagado
export const tieneModulo = (red, modulo) => (red?.red_modulos ?? []).some((m) => m.modulo === modulo && m.activo);
export const modulosActivos = (red) => (red?.red_modulos ?? []).filter((m) => m.activo).map((m) => m.modulo);
// Enciende o apaga un módulo y devuelve la lista nueva de filas
export const conModulo = (red, modulo, activo) => {
  const fila = { modulo, activo: activo ? 1 : 0 };
  return red.red_modulos.some((m) => m.modulo === modulo)
    ? red.red_modulos.map((m) => (m.modulo === modulo ? { ...m, ...fila } : m))
    : [...red.red_modulos, fila];
};
