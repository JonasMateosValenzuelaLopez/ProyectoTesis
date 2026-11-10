import { api } from './cliente';

// Bitácora de la comunidad (bitacora.controller.ts: Presidencia y Administración).
// { registros: [{ idBitacora, fecha, accion, descripcion, entidad, idEntidad, detalle,
//   usuario: { idUsuario, nombre, cargo } | null }], siguiente }. `rol` filtra por quienes tuvieron ese cargo.
export const listarBitacora = ({ rol, antesDe } = {}) =>
  api('/bitacora', { params: { limite: 50, ...(rol ? { rol } : {}), ...(antesDe ? { antesDe } : {}) } });
