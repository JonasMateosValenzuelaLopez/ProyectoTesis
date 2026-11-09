import { RolUsuario, rolesEfectivos } from '../config/roles';

// Como `reglas-finanzas.ts` del backend:
// - GESTION_COBROS (crear cobros, marcar pagos, registrar egresos): Tesorería y Administración
//   (y la Presidencia cuando la comunidad no tiene administrador externo);
// - LECTURA_FINANZAS: además, la Presidencia.
export const gestionaFinanzas = (cargo, comunidad) =>
  rolesEfectivos(cargo, comunidad).some((r) => r === RolUsuario.TESORERO || r === RolUsuario.ADMINISTRADOR);

export const leeFinanzas = (cargo, comunidad) =>
  gestionaFinanzas(cargo, comunidad) || cargo === RolUsuario.PRESIDENTE;

export const esTesorero = (cargo) => cargo === RolUsuario.TESORERO;
export const esPresidente = (cargo) => cargo === RolUsuario.PRESIDENTE;
