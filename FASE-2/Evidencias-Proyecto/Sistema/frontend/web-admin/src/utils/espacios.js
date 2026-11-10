// Espacios comunes como los devuelve la API (GET reservas/espacios):
// { idEspacio, nombre, descripcion, capacidad, bloques: [{ idBloque, horaInicio, horaFin }] }.
// La API solo devuelve los espacios activos; uno quitado queda dado de baja y conserva sus reservas.

// Columnas TIME (13:00:00) a como se muestran y se envían (13:00)
export const hora = (t) => (t ?? '').slice(0, 5);

// Problemas de los horarios de un espacio: cada bloque debe terminar después de empezar
// y no puede pisarse con otro. Devuelve un texto por bloque (null si está bien).
export function erroresBloques(bloques) {
  return bloques.map((b, i) => {
    const ini = hora(b.horaInicio);
    const fin = hora(b.horaFin);
    if (!ini || !fin) return 'Indica la hora de inicio y de término';
    if (fin <= ini) return 'Debe terminar después de empezar';
    const pisa = bloques.some((o, j) => j !== i && o.horaInicio && o.horaFin && ini < hora(o.horaFin) && hora(o.horaInicio) < fin);
    return pisa ? 'Se cruza con otro horario' : null;
  });
}

// Límites de la API (reglas-reservas.ts y GuardarEspaciosDto)
export const MAX_ESPACIOS = 20;
export const MAX_BLOQUES = 24;
export const MAX_CAPACIDAD = 1000;
export const MAX_NOMBRE = 100;
export const MAX_DESCRIPCION = 1000;

// El formulario se puede guardar si cada espacio tiene nombre único y horarios válidos, dentro de los límites
export const espaciosValidos = (espacios) => {
  const nombres = espacios.map((e) => e.nombre.trim().toLowerCase());
  return espacios.length <= MAX_ESPACIOS
    && nombres.every((n, i) => n && n.length <= MAX_NOMBRE && nombres.indexOf(n) === i)
    && espacios.every((e) => e.bloques.length <= MAX_BLOQUES
      && (e.descripcion ?? '').length <= MAX_DESCRIPCION
      && (e.capacidad == null || (e.capacidad >= 1 && e.capacidad <= MAX_CAPACIDAD))
      && erroresBloques(e.bloques).every((x) => !x));
};

// Lo que se envía a PUT reservas/espacios: la lista completa de espacios que quedan. Los que no van
// se dan de baja; uno sin `idEspacio` con el nombre de uno que existió lo recupera.
export const espaciosParaGuardar = (espacios) => ({
  espacios: espacios.map((e) => ({
    ...(e.idEspacio ? { idEspacio: e.idEspacio } : {}),
    nombre: e.nombre.trim().replace(/\s+/g, ' '),
    ...(e.descripcion?.trim() ? { descripcion: e.descripcion.trim() } : {}),
    ...(e.capacidad != null ? { capacidad: e.capacidad } : {}),
    bloques: [...e.bloques]
      .map((b) => ({ horaInicio: hora(b.horaInicio), horaFin: hora(b.horaFin) }))
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
  })),
});

// ---------- Reservas (reglas-reservas.ts) ----------
// Las reservas llegan de la API con `fecha` 'AAAA-MM-DD', `horaInicio`/`horaFin` 'HH:MM' y `estado`:
// 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Cancelada' | 'Entregado' (en uso) | 'Devuelto'.
export const MOTIVO_BAJA = 'El espacio dejó de estar disponible';
export const MOTIVO_HORARIO = 'El horario reservado cambió o dejó de estar disponible';
export const MAX_MOTIVO = 255;

// Fecha y hora local como texto comparable: 'AAAA-MM-DD HH:MM'
export const momentoLocal = (d = new Date()) => {
  const l = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return `${l.slice(0, 10)} ${l.slice(11, 16)}`;
};
export const yaEmpezo = (r, ahora = momentoLocal()) => `${r.fecha} ${hora(r.horaInicio)}` <= ahora;
const yaTermino = (r, ahora = momentoLocal()) => `${r.fecha} ${hora(r.horaFin)}` <= ahora;
// Administración cancela una reserva vigente que no se entregó y que todavía no empieza
export const puedeCancelarAdministracion = (r, ahora = momentoLocal()) =>
  (r.estado === 'Aprobada' || r.estado === 'Pendiente') && !yaEmpezo(r, ahora);

// Quién canceló, según el motivo guardado: el residente cancela sin motivo
export const origenCancelacion = (r) => {
  if (!r.motivoCancelacion) return 'el residente';
  if (r.motivoCancelacion === MOTIVO_BAJA || r.motivoCancelacion === MOTIVO_HORARIO) return 'un cambio en el espacio';
  return 'la administración';
};

// Reservas que cancelaría el backend al guardar los espacios (espacios.service.ts → reservasPorCancelar):
// las vigentes, no entregadas y que aún no terminan, de un espacio que se quita o de un horario que se quita
// o cambia su hora de término. `actuales` = espacios guardados; `nuevos` = los del formulario; `reservas` = GET reservas.
export function reservasAfectadas(actuales, nuevos, reservas, ahora = momentoLocal()) {
  const porId = new Map(nuevos.filter((e) => e.idEspacio).map((e) => [e.idEspacio, e]));
  const vigente = (r) => (r.estado === 'Aprobada' || r.estado === 'Pendiente') && !r.entregadoEn && !yaTermino(r, ahora);
  const afectadas = [];
  for (const espacio of actuales) {
    const nuevo = porId.get(espacio.idEspacio);
    const propias = reservas.filter((r) => r.idEspacio === espacio.idEspacio && vigente(r));
    if (!nuevo) {
      afectadas.push(...propias.map((r) => ({ ...r, motivo: MOTIVO_BAJA })));
      continue;
    }
    const finPorInicio = new Map(nuevo.bloques.map((b) => [hora(b.horaInicio), hora(b.horaFin)]));
    const cambiados = new Set(espacio.bloques
      .filter((b) => finPorInicio.get(hora(b.horaInicio)) !== hora(b.horaFin))
      .map((b) => hora(b.horaInicio)));
    afectadas.push(...propias.filter((r) => cambiados.has(hora(r.horaInicio))).map((r) => ({ ...r, motivo: MOTIVO_HORARIO })));
  }
  return afectadas.sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`));
}

