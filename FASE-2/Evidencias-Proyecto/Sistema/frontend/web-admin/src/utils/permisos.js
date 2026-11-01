import { cargosEfectivos } from '../config/navegacion';

// Quién puede registrar pagos y crear cobros: Tesorería y Administración
// (y el Presidente cuando la comunidad no tiene administrador).
export const puedeGestionarFinanzas = (cargo, comunidad) =>
  cargosEfectivos(cargo, comunidad).some((c) => c === 'tesorero' || c === 'administrador');

export const esPresidente = (cargo) => cargo === 'presidente';
