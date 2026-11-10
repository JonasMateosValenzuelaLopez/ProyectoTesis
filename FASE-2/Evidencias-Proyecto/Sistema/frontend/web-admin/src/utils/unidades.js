// Unidades con los campos que devuelve la API: { idUnidad, numeroIdentificador, tipo ('Casa' | 'Departamento'),
// callePasaje, torre, piso, manzana, orden }.

export const tipoUnidad = (u) => u?.tipo ?? 'Casa';
// Algunas respuestas traen la unidad sin `tipo` (reservas, exenciones): en un edificio son departamentos
export const conTipo = (unidad, comunidad) => (unidad ? { ...unidad, tipo: unidad.tipo ?? (comunidad?.tipo === 'Edificio' ? 'Departamento' : 'Casa') } : null);
// El piso viene en la unidad; si falta, sale del número (depto 603 = piso 6)
export const pisoDe = (u) => u.piso ?? Math.floor(Number(u.numeroIdentificador) / 100);
// Torre, manzana o lado del pasaje: va en `callePasaje`
export const grupoDe = (u) => u.callePasaje ?? '';

export const rango = (desde, hasta) => {
  const a = Number(desde);
  const b = Number(hasta);
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a || b - a > 499) return [];
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
};

// Límites de la estructura, los mismos de la API (EstructuraDto de crear-comunidad.dto.ts)
export const LIMITES_ESTRUCTURA = {
  pisos: [1, 60, 'Los pisos deben ser un número entre 1 y 60'],
  porPiso: [1, 30, 'Los departamentos por piso deben ser entre 1 y 30'],
  norte: [1, 200, 'Las casas del lado norte deben ser entre 1 y 200'],
  sur: [0, 200, 'Las casas del lado sur deben ser entre 0 y 200'],
  manzanas: [1, 26, 'Las manzanas deben ser entre 1 y 26'],
  casasPorManzana: [1, 100, 'Las casas por manzana deben ser entre 1 y 100'],
};
export const CAMPOS_POR_TIPO = {
  Edificio: ['torre', 'pisos', 'porPiso'],
  Condominio: ['norte', 'sur'],
  Villa: ['manzanas', 'casasPorManzana'],
};

// Estructura que se envía a la API: solo los campos del tipo, como números (la torre en mayúsculas)
export function estructuraPara(tipo, f) {
  return Object.fromEntries(CAMPOS_POR_TIPO[tipo]
    .filter((campo) => String(f[campo] ?? '').trim() !== '')
    .map((campo) => [campo, campo === 'torre' ? String(f.torre).trim().toUpperCase() : Number(f[campo])]));
}

// Primer error de la estructura (como la valida la API), o null
export function errorEstructura(tipo, f) {
  const e = estructuraPara(tipo, f);
  if (tipo === 'Edificio' && e.torre !== undefined && !/^[A-Z0-9]{1,3}$/.test(e.torre)) return 'La torre debe tener de 1 a 3 letras o números';
  for (const campo of CAMPOS_POR_TIPO[tipo]) {
    if (campo === 'torre') continue;
    const [min, max, mensaje] = LIMITES_ESTRUCTURA[campo];
    const v = e[campo];
    if (v === undefined) {
      if (campo !== 'sur') return mensaje;
      continue;
    }
    if (!Number.isInteger(v) || v < min || v > max) return mensaje;
  }
  return null;
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Las unidades que creará la API para una comunidad nueva (estructura-unidades.ts › generarUnidades):
// edificio = pisos × deptos por piso; condominio = casas a cada lado del pasaje; villa = manzanas × casas.
// Llevan ids provisorios negativos: solo sirven para dibujar el plano antes de crearla.
export function generarUnidades(tipo, f) {
  if (!tipo || errorEstructura(tipo, f)) return [];
  const e = estructuraPara(tipo, f);
  const unidades = [];
  if (tipo === 'Edificio') {
    const torre = e.torre ?? 'A';
    for (let piso = 1; piso <= e.pisos; piso++) {
      for (let depto = 1; depto <= e.porPiso; depto++) {
        unidades.push({ numeroIdentificador: `${piso}${String(depto).padStart(2, '0')}`, tipo: 'Departamento', callePasaje: `Torre ${torre}`, torre, piso, manzana: null });
      }
    }
  } else if (tipo === 'Condominio') {
    const total = e.norte + (e.sur ?? 0);
    for (let numero = 1; numero <= total; numero++) {
      unidades.push({ numeroIdentificador: String(numero), tipo: 'Casa', callePasaje: numero <= e.norte ? 'Lado norte' : 'Lado sur', torre: null, piso: null, manzana: null });
    }
  } else {
    LETRAS.slice(0, e.manzanas).split('').forEach((letra, i) => {
      for (let casa = 1; casa <= e.casasPorManzana; casa++) {
        unidades.push({ numeroIdentificador: String(i * e.casasPorManzana + casa), tipo: 'Casa', callePasaje: `Manzana ${letra}`, torre: null, piso: null, manzana: letra });
      }
    });
  }
  return unidades.map((u, i) => ({ ...u, idUnidad: -(i + 1), orden: i + 1 }));
}

// ---------- Creación en lote (POST unidades/lote), como lote-unidades.ts ----------
export const MAX_UNIDADES_POR_LOTE = 500;

// Lo que se envía según el tipo: edificio { torre, pisoDesde, pisoHasta, porPiso }; casas { grupo, desde, hasta }
export function lotePara(tipo, f) {
  if (tipo === 'Edificio') {
    return { torre: String(f.torre ?? '').trim().toUpperCase(), pisoDesde: Number(f.pisoDesde), pisoHasta: Number(f.pisoHasta), porPiso: Number(f.porPiso) };
  }
  const grupo = String(f.grupo ?? '').trim();
  return { grupo: tipo === 'Villa' ? grupo.toUpperCase() : grupo, desde: Number(f.desde), hasta: Number(f.hasta) };
}

const entre = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

// Primer error del lote (como lo valida la API), o null
export function errorLote(tipo, f) {
  const l = lotePara(tipo, f);
  if (tipo === 'Edificio') {
    if (!/^[A-Z0-9]{1,3}$/.test(l.torre)) return 'La torre debe tener de 1 a 3 letras o números';
    if (!entre(l.pisoDesde, 1, 99)) return 'El piso inicial debe ser un número entre 1 y 99';
    if (!entre(l.pisoHasta, 1, 99)) return 'El piso final debe ser un número entre 1 y 99';
    if (!entre(l.porPiso, 1, 30)) return 'Los departamentos por piso deben ser entre 1 y 30';
    if (l.pisoHasta < l.pisoDesde) return 'El piso final no puede ser menor que el inicial';
    if ((l.pisoHasta - l.pisoDesde + 1) * l.porPiso > MAX_UNIDADES_POR_LOTE) return `Un lote puede crear hasta ${MAX_UNIDADES_POR_LOTE} unidades`;
    return null;
  }
  if (!l.grupo) return tipo === 'Villa' ? 'Indica la letra de la manzana' : 'Indica la hilera o pasaje';
  if (tipo === 'Villa' && !/^[A-Z]{1,3}$/.test(l.grupo)) return 'La manzana debe ser de 1 a 3 letras';
  if (l.grupo.length > 100) return 'El grupo no puede superar 100 caracteres';
  if (!entre(l.desde, 1, 99999)) return 'El número inicial debe ser un entero entre 1 y 99999';
  if (!entre(l.hasta, 1, 99999)) return 'El número final debe ser un entero entre 1 y 99999';
  if (l.hasta < l.desde) return 'El número final no puede ser menor que el inicial';
  if (l.hasta - l.desde + 1 > MAX_UNIDADES_POR_LOTE) return `Un lote puede crear hasta ${MAX_UNIDADES_POR_LOTE} unidades`;
  return null;
}

// Las unidades que creará el lote (para mostrarlas antes de crearlas). Ids provisorios negativos.
export function generarLote(tipo, f) {
  if (errorLote(tipo, f)) return [];
  const l = lotePara(tipo, f);
  const unidades = [];
  if (tipo === 'Edificio') {
    for (let piso = l.pisoDesde; piso <= l.pisoHasta; piso++) {
      for (let depto = 1; depto <= l.porPiso; depto++) {
        unidades.push({ numeroIdentificador: `${piso}${String(depto).padStart(2, '0')}`, tipo: 'Departamento', callePasaje: `Torre ${l.torre}`, torre: l.torre, piso, manzana: null });
      }
    }
  } else {
    const villa = tipo === 'Villa';
    for (let numero = l.desde; numero <= l.hasta; numero++) {
      unidades.push({ numeroIdentificador: String(numero), tipo: 'Casa', callePasaje: villa ? `Manzana ${l.grupo}` : l.grupo, torre: null, piso: null, manzana: villa ? l.grupo : null });
    }
  }
  return unidades.map((u, i) => ({ ...u, idUnidad: -(i + 1) }));
}

// Como la API: una unidad se repite si ya existe el mismo número en la misma torre (sin torre en casas)
export const claveUnidad = (u) => `${u.torre ?? ''}|${u.numeroIdentificador}`;
