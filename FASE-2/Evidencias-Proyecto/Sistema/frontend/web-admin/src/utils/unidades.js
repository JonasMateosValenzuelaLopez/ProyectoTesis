// Generación de unidades según el tipo de comunidad. La usan la creación en lote
// del Administrador y el asistente de nueva comunidad de la plataforma.

export const rango = (desde, hasta) => {
  const a = Number(desde);
  const b = Number(hasta);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a || b - a > 499) return [];
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
};

// Un lote: pisos y departamentos en un edificio, casas por sector en un condominio o por manzana en una villa.
export function generar(tipo, f) {
  if (tipo === 'Edificio') {
    const porPiso = Number(f.porPiso);
    if (!porPiso || porPiso > 30) return [];
    return rango(f.pisoDesde, f.pisoHasta).flatMap((piso) => Array.from({ length: porPiso }, (_, i) => {
      const numero = `${piso}${String(i + 1).padStart(2, '0')}`;
      return { id: `d${f.torre}${numero}`, tipo: 'Departamento', numero, torre: f.torre, piso };
    }));
  }
  const grupo = tipo === 'Villa' ? { manzana: f.grupo.toUpperCase() } : { sector: f.grupo.toLowerCase() };
  return rango(f.desde, f.hasta).map((n) => ({ id: `c${f.grupo}${n}`, tipo: 'Casa', numero: String(n), ...grupo }));
}

const entero = (v, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= max ? n : 0;
};
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Estructura completa de una comunidad nueva:
// edificio = pisos × deptos por piso; condominio = casas a cada lado del pasaje; villa = manzanas × casas.
export function generarEstructura(tipo, f) {
  if (tipo === 'Edificio') {
    const pisos = entero(f.pisos, 60);
    if (!pisos) return [];
    return generar(tipo, { torre: f.torre || 'A', pisoDesde: 1, pisoHasta: pisos, porPiso: entero(f.porPiso, 30) })
      .sort((a, b) => b.piso - a.piso || a.numero.localeCompare(b.numero));
  }
  if (tipo === 'Condominio') {
    const norte = entero(f.norte, 200);
    const sur = Number(f.sur) === 0 ? 0 : entero(f.sur, 200);
    return [
      ...generar(tipo, { grupo: 'norte', desde: 1, hasta: norte }),
      ...(sur ? generar(tipo, { grupo: 'sur', desde: norte + 1, hasta: norte + sur }) : []),
    ].filter(() => norte > 0).map((u, i) => ({ ...u, orden: i }));
  }
  const manzanas = entero(f.manzanas, 26);
  const casas = entero(f.casasPorManzana, 100);
  if (!manzanas || !casas) return [];
  return LETRAS.slice(0, manzanas).split('').flatMap((m, i) => (
    generar(tipo, { grupo: m, desde: i * casas + 1, hasta: (i + 1) * casas })
  ));
}
