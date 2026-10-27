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
// sus reservas. Los nuevos espacios y bloques llevan id provisorio negativo hasta que la API los guarde.
export function conEspacios(c, lista) {
  const filas = c.espacios_comunes ?? [];
  const ids = new Set(lista.map((e) => e.id_espacio));
  const bajas = filas.filter((e) => !ids.has(e.id_espacio)).map((e) => ({ ...e, estado: 0 }));
  const vigentes = lista.map((e) => {
    const id_espacio = e.id_espacio ?? --provisorio;
    const espacios_bloques = [...e.espacios_bloques]
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      .map((b) => ({ ...b, id_bloque: b.id_bloque ?? --provisorio, id_espacio }));
    return { ...e, id_espacio, id_red: c.id_red, estado: 1, espacios_bloques };
  });
  return [...vigentes, ...bajas];
}

// El formulario se puede guardar si cada espacio tiene nombre único y horarios válidos
export const espaciosValidos = (espacios) => {
  const nombres = espacios.map((e) => e.nombre.trim().toLowerCase());
  return nombres.every((n, i) => n && nombres.indexOf(n) === i)
    && espacios.every((e) => erroresBloques(e.espacios_bloques).every((x) => !x));
};
