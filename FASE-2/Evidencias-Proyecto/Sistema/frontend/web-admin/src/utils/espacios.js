// Filas de `espacios_comunes` de una comunidad, cada una con sus `espacios_bloques`.
// Un espacio con estado 0 está dado de baja: sus reservas anteriores se conservan.
export const espaciosActivos = (c) => (c?.espacios_comunes ?? []).filter((e) => e.estado);

// Columnas TIME de la base (13:00:00) a como se muestran (13:00)
export const hora = (t) => (t ?? '').slice(0, 5);

// Reemplaza los espacios activos por una lista de nombres: conserva los que siguen,
// reactiva o crea los nuevos y da de baja los quitados. Los nuevos llevan id provisorio
// negativo hasta que la API los guarde; los bloques se configuran después.
let provisorio = 0;
export function conNombresDeEspacios(c, nombres) {
  const filas = c.espacios_comunes ?? [];
  const clave = (n) => n.trim().toLowerCase();
  const pedidos = new Set(nombres.map(clave));
  const actualizadas = filas.map((e) => ({ ...e, estado: pedidos.has(clave(e.nombre)) ? 1 : 0 }));
  const nuevas = nombres
    .filter((n) => !filas.some((e) => clave(e.nombre) === clave(n)))
    .map((nombre) => ({ id_espacio: --provisorio, id_red: c.id_red, nombre, descripcion: null, capacidad: null, estado: 1, espacios_bloques: [] }));
  return [...actualizadas, ...nuevas];
}

// Problemas de los horarios de un espacio: cada bloque debe terminar después de empezar
// y no puede pisarse con otro. Devuelve un texto por bloque (null si está bien).
export function erroresBloques(bloques) {
  return bloques.map((b, i) => {
    if (!b.hora_inicio || !b.hora_fin) return 'Indica la hora de inicio y de término';
    if (b.hora_fin <= b.hora_inicio) return 'Debe terminar después de empezar';
    const pisa = bloques.some((o, j) => j !== i && o.hora_inicio && o.hora_fin && b.hora_inicio < o.hora_fin && o.hora_inicio < b.hora_fin);
    return pisa ? 'Se cruza con otro horario' : null;
  });
}

// Reemplaza los espacios activos de la comunidad por los del formulario (con capacidad,
// descripción y bloques). Los que ya no están quedan dados de baja (estado 0) para conservar
// sus reservas. Un espacio nuevo con el nombre de uno que ya existió lo recupera, como la API.
// Los nuevos espacios y bloques llevan id provisorio negativo hasta que la API los guarde.
export function conEspacios(c, lista) {
  const filas = c.espacios_comunes ?? [];
  const lista2 = emparejarPorNombre(filas, lista);
  const ids = new Set(lista2.map((e) => e.id_espacio));
  const bajas = filas.filter((e) => !ids.has(e.id_espacio)).map((e) => ({ ...e, estado: 0 }));
  const vigentes = lista2.map((e) => {
    const id_espacio = e.id_espacio ?? --provisorio;
    const espacios_bloques = [...e.espacios_bloques]
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      .map((b) => ({ ...b, id_bloque: b.id_bloque ?? --provisorio, id_espacio }));
    return { ...e, id_espacio, id_red: c.id_red, estado: 1, espacios_bloques };
  });
  return [...vigentes, ...bajas];
}

// Límites de la API (PUT /reservas/espacios)
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
    && espacios.every((e) => e.espacios_bloques.length <= MAX_BLOQUES
      && (e.descripcion ?? '').length <= MAX_DESCRIPCION
      && (e.capacidad == null || (e.capacidad >= 1 && e.capacidad <= MAX_CAPACIDAD))
      && erroresBloques(e.espacios_bloques).every((x) => !x));
};

// Un espacio nuevo del formulario (sin id) con el nombre de uno que ya existe toma su id
const clave = (n) => n.trim().toLowerCase();
function emparejarPorNombre(filas, lista) {
  const usados = new Set(lista.map((e) => e.id_espacio).filter((id) => id != null));
  return lista.map((e) => {
    if (e.id_espacio != null) return e;
    const igual = filas.find((f) => !usados.has(f.id_espacio) && clave(f.nombre) === clave(e.nombre));
    if (!igual) return e;
    usados.add(igual.id_espacio);
    return { ...e, id_espacio: igual.id_espacio };
  });
}

// Reglas de reservas de la API (reglas-reservas.ts). Fechas y horas se comparan como texto local
// 'AAAA-MM-DD HH:MM:SS', igual que las columnas DATE y TIME de la base.
export const MOTIVO_BAJA = 'El espacio dejó de estar disponible';
export const MOTIVO_HORARIO = 'El horario reservado cambió o dejó de estar disponible';
export const MAX_MOTIVO = 255;
export const momentoLocal = (d = new Date()) => {
  const l = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return `${l.slice(0, 10)} ${l.slice(11, 19)}`;
};
export const yaEmpezo = (r, ahora = momentoLocal()) => `${r.fecha_reserva} ${r.hora_inicio}` <= ahora;
// Administración cancela una reserva confirmada que no se entregó y que todavía no empieza
export const puedeCancelarAdministracion = (r, ahora = momentoLocal()) => r.estado_reserva === 'Aprobada' && !yaEmpezo(r, ahora);
// Quién canceló, según el motivo guardado: el residente cancela sin motivo
export const origenCancelacion = (r) => {
  if (!r.motivo_cancelacion) return 'el residente';
  if (r.motivo_cancelacion === MOTIVO_BAJA || r.motivo_cancelacion === MOTIVO_HORARIO) return 'un cambio en el espacio';
  return 'Administración';
};

// Reservas que la API cancela al guardar los espacios: las confirmadas, sin entregar y que aún no
// terminan, de un espacio que se quita (MOTIVO_BAJA) o de un horario que se quita o cambia su hora
// de término (MOTIVO_HORARIO). Los horarios se reconocen por su hora de inicio.
export function reservasAfectadas(antes, despues, reservas, ahora = momentoLocal()) {
  const lista = emparejarPorNombre(antes, despues);
  const porId = new Map(lista.filter((e) => e.id_espacio != null).map((e) => [e.id_espacio, e]));
  const vigente = (r) => r.estado_reserva === 'Aprobada' && `${r.fecha_reserva} ${r.hora_fin}` > ahora;
  return antes.flatMap((esp) => {
    const delEspacio = reservas.filter((r) => r.id_espacio === esp.id_espacio && vigente(r));
    const nuevo = porId.get(esp.id_espacio);
    if (!nuevo) return delEspacio.map((reserva) => ({ reserva, motivo: MOTIVO_BAJA }));
    const finPorInicio = new Map(nuevo.espacios_bloques.map((b) => [b.hora_inicio, b.hora_fin]));
    const cambiados = new Set(esp.espacios_bloques.filter((b) => finPorInicio.get(b.hora_inicio) !== b.hora_fin).map((b) => b.hora_inicio));
    return delEspacio.filter((r) => cambiados.has(r.hora_inicio)).map((reserva) => ({ reserva, motivo: MOTIVO_HORARIO }));
  });
}
