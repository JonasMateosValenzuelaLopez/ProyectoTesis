// Tabla `roles` de la base. El panel trabaja con el nombre corto del cargo; la API guarda `id_rol`.
// Residente no va en `membresias`: sale de `residencias`. Plataforma es una membresía sin comunidad.
export const ROLES = {
  1: 'administrador',
  2: 'tesorero',
  3: 'secretario',
  4: 'presidente',
  5: 'conserje',
  6: 'residente',
  7: 'visitante',
  8: 'plataforma',
};
export const ID_ROL = Object.fromEntries(Object.entries(ROLES).map(([id, cargo]) => [cargo, Number(id)]));

export const cargoDe = (m) => ROLES[m.id_rol];

// Membresías vigentes de una fila de `usuarios`; con `id_red`, solo las de esa comunidad
export const membresiasVigentes = (u, id_red) => (u?.membresias ?? [])
  .filter((m) => m.estado === 'Vigente' && (id_red === undefined || m.id_red === id_red));
export const cargosDe = (u, id_red) => membresiasVigentes(u, id_red).map(cargoDe);
export const tieneCargo = (u, cargo, id_red) => cargosDe(u, id_red).includes(cargo);
export const esPlataforma = (u) => tieneCargo(u, 'plataforma');

// Residencias aprobadas (las Pendiente son solicitudes de acceso)
export const residenciasActivas = (u) => (u?.residencias ?? []).filter((r) => r.estado === 'Activa');
