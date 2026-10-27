// La tabla `unidades` solo guarda número y calle o pasaje. El tipo (Casa o Departamento),
// el piso y el grupo del plano se deducen aquí, a partir del tipo de su comunidad.
const TIPO_RED = new Map();
export const registrarRed = (red) => TIPO_RED.set(red.id_red, red.tipo);

export const tipoUnidad = (u) => (TIPO_RED.get(u?.id_red) === 'Edificio' ? 'Departamento' : 'Casa');
// Depto 603 = piso 6
export const pisoDe = (u) => Math.floor(Number(u.numero_identificador) / 100);
// Torre, manzana o lado del pasaje, según la comunidad: va en `calle_pasaje`
export const grupoDe = (u) => u.calle_pasaje ?? '';

// Generación de unidades según el tipo de comunidad. La usan la creación en lote
// del Administrador y el asistente de nueva comunidad de la plataforma.

export const rango = (desde, hasta) => {
  const a = Number(desde);
  const b = Number(hasta);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a || b - a > 499) return [];
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
};

// Filas nuevas de `unidades`. Llevan ids provisorios negativos hasta que la API las guarde.
let provisorio = 0;
const fila = (red, numero, calle_pasaje) => ({ id_unidad: --provisorio, id_red: red.id_red, numero_identificador: String(numero), calle_pasaje });

// Un lote: pisos y departamentos de una torre en un edificio, casas de una hilera en un
// condominio o de una manzana en una villa. `red` es la comunidad ({ id_red, tipo }).
export function generar(red, f) {
  if (red.tipo === 'Edificio') {
    const porPiso = Number(f.porPiso);
    if (!porPiso || porPiso > 30) return [];
    return rango(f.pisoDesde, f.pisoHasta).flatMap((piso) => Array.from({ length: porPiso }, (_, i) => (
      fila(red, `${piso}${String(i + 1).padStart(2, '0')}`, `Torre ${f.torre}`)
    )));
  }
  const grupo = red.tipo === 'Villa' ? `Manzana ${f.grupo.toUpperCase()}` : f.grupo.trim();
  return rango(f.desde, f.hasta).map((n) => fila(red, n, grupo));
}

const entero = (v, max) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= max ? n : 0;
};
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Estructura completa de una comunidad nueva:
// edificio = pisos × deptos por piso; condominio = casas a cada lado del pasaje; villa = manzanas × casas.
export function generarEstructura(red, f) {
  if (red.tipo === 'Edificio') {
    const pisos = entero(f.pisos, 60);
    if (!pisos) return [];
    return generar(red, { torre: f.torre || 'A', pisoDesde: 1, pisoHasta: pisos, porPiso: entero(f.porPiso, 30) })
      .sort((a, b) => pisoDe(b) - pisoDe(a) || a.numero_identificador.localeCompare(b.numero_identificador));
  }
  if (red.tipo === 'Condominio') {
    const norte = entero(f.norte, 200);
    const sur = Number(f.sur) === 0 ? 0 : entero(f.sur, 200);
    if (!norte) return [];
    return [
      ...generar(red, { grupo: 'Lado norte', desde: 1, hasta: norte }),
      ...(sur ? generar(red, { grupo: 'Lado sur', desde: norte + 1, hasta: norte + sur }) : []),
    ];
  }
  const manzanas = entero(f.manzanas, 26);
  const casas = entero(f.casasPorManzana, 100);
  if (!manzanas || !casas) return [];
  return LETRAS.slice(0, manzanas).split('').flatMap((m, i) => (
    generar(red, { grupo: m, desde: i * casas + 1, hasta: (i + 1) * casas })
  ));
}
