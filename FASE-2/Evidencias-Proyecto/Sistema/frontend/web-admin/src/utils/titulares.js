// Titular de cada vivienda (`residencias.titular`, 1 o null): es quien vota y quien recibe los
// avisos de votaciones. Mismas reglas que la API (cuentas.service.ts → asegurarTitular):
// - Una vivienda tiene a lo más un titular.
// - Solo puede serlo alguien con acceso a la comunidad (cuenta no desactivada) y residencia vigente.
// - Si la vivienda no tiene un titular con acceso, lo pasa a ser la residencia vigente más antigua con acceso.

const conAcceso = (u) => u.estado !== 'Desactivado';

// Aplica la regla a todas las viviendas. Devuelve la misma lista si no cambia nada.
export function conTitulares(usuarios) {
  const porUnidad = new Map();
  usuarios.forEach((u) => u.residencias
    .filter((r) => r.estado === 'Activa')
    .forEach((r) => { if (!porUnidad.has(r.id_unidad)) porUnidad.set(r.id_unidad, []); porUnidad.get(r.id_unidad).push({ u, r }); }));

  const marcas = new Map(); // id_residencia → 1 | null
  porUnidad.forEach((filas) => {
    const habilitadas = filas.filter((f) => conAcceso(f.u)).sort((a, b) => a.r.id_residencia - b.r.id_residencia);
    if (habilitadas.length === 0 || habilitadas.some((f) => f.r.titular === 1)) return;
    const nueva = habilitadas[0].r.id_residencia;
    filas.forEach((f) => marcas.set(f.r.id_residencia, f.r.id_residencia === nueva ? 1 : null));
  });
  if (marcas.size === 0) return usuarios;
  return usuarios.map((u) => (u.residencias.some((r) => marcas.has(r.id_residencia))
    ? { ...u, residencias: u.residencias.map((r) => (marcas.has(r.id_residencia) ? { ...r, titular: marcas.get(r.id_residencia) } : r)) }
    : u));
}

// Deja a `id_usuario` como titular de la vivienda y le quita la marca a quien lo era (PUT /unidades/:id/titular)
export function conTitular(usuarios, id_unidad, id_usuario) {
  return usuarios.map((u) => ({
    ...u,
    residencias: u.residencias.map((r) => (r.id_unidad === id_unidad && r.estado === 'Activa'
      ? { ...r, titular: u.id_usuario === id_usuario ? 1 : null }
      : r)),
  }));
}

// Por qué alguien no puede quedar como titular (null si puede)
export function motivoNoTitular(u, id_unidad) {
  if (!u?.residencias.some((r) => r.id_unidad === id_unidad && r.estado === 'Activa')) return 'No es residente vigente de la vivienda';
  if (!conAcceso(u)) return 'Tiene la cuenta desactivada: reactívala antes de dejarla como titular';
  return null;
}
