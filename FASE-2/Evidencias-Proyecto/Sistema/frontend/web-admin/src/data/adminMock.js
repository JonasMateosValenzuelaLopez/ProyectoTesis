// Datos de ejemplo de Administración, con la forma del modelo propuesto:
// usuarios (con identificador nacional), residencias (unidad y relación),
// membresias (cargo por comunidad con vigencia), solicitudes_acceso y muro_publicaciones.
import { comunidades } from './mock';
import { residentes } from './finanzasMock';
import { digitoVerificador, formatearRut } from '../utils/rut';
import { CUENTAS } from './cuentasDemo';

// RUT de ejemplo con dígito verificador correcto
const rutDe = (n) => {
  const cuerpo = String(7000000 + ((n * 7919 * 13) % 17000000));
  return formatearRut(`${cuerpo}${digitoVerificador(cuerpo)}`);
};
// Las personas con cuenta de prueba usan su RUT y correo reales de la demo
const cuentaDe = (nombre) => CUENTAS.find((c) => `${c.nombre} ${c.apellido}` === nombre);
// Si el nombre se repite en la demo, el correo lleva un número para no repetirse
const correoDe = (nombre, vistos) => {
  const base = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.');
  const veces = (vistos.get(base) ?? 0) + 1;
  vistos.set(base, veces);
  return `${base}${veces > 1 ? veces : ''}@correo.cl`;
};

// Directiva vigente de cada comunidad (membresias con cargo de la directiva o staff)
const CARGOS = {
  1: {
    'Luis Muñoz': [{ cargo: 'presidente', desde: '2026-03-01', hasta: '2028-02-28' }],
    'Marta Rivas': [{ cargo: 'tesorero', desde: '2026-10-22', hasta: '2028-02-28' }],
    'Andrea Lagos': [{ cargo: 'secretario', desde: '2026-03-01', hasta: '2028-02-28' }],
  },
  2: {
    'Sonia Fuentealba': [{ cargo: 'presidente', desde: '2025-05-01', hasta: '2027-04-30' }],
    'Jorge Silva': [{ cargo: 'tesorero', desde: '2025-05-01', hasta: '2027-04-30' }],
    'Paula Reyes': [{ cargo: 'secretario', desde: '2025-05-01', hasta: '2027-04-30' }],
  },
  3: {},
};

// Personal sin unidad: administración externa y conserjería
const PERSONAL = {
  1: [{ nombre: 'Carlos Ibáñez', cargos: [{ cargo: 'administrador', desde: '2025-01-01', hasta: '' }] }],
  2: [],
  3: [
    { nombre: 'Patricia Olave', cargos: [{ cargo: 'administrador', desde: '2024-06-01', hasta: '' }] },
    { nombre: 'Héctor Lillo', cargos: [{ cargo: 'conserje', desde: '2023-09-01', hasta: '' }] },
  ],
};

function usuarios(c, vistos) {
  let n = c.id * 1000;
  const lista = c.unidades.map((u, i) => {
    const nombre = residentes[u.id];
    n += 1;
    return {
      id: `u${n}`, nombre, rut: cuentaDe(nombre)?.rut ?? rutDe(n), correo: cuentaDe(nombre)?.correo ?? correoDe(nombre, vistos), telefono: `+56 9 ${String(50000000 + n * 1373).slice(0, 4)} ${String(n * 97).slice(-4)}`,
      estado: i % 11 === 6 && !cuentaDe(nombre) ? 'invitado' : 'activo',
      residencias: [{ idUnidad: u.id, relacion: i % 4 === 3 ? 'arrendatario' : 'propietario' }],
      cargos: CARGOS[c.id][nombre] ?? [],
      registro: `2026-0${1 + (i % 9)}-1${i % 10}`,
    };
  });
  const personal = PERSONAL[c.id].map((p) => {
    n += 1;
    return { id: `u${n}`, nombre: p.nombre, rut: cuentaDe(p.nombre)?.rut ?? rutDe(n), correo: cuentaDe(p.nombre)?.correo ?? correoDe(p.nombre, vistos), telefono: '', estado: 'activo', residencias: [], cargos: p.cargos, registro: '2025-01-01' };
  });
  // Un ex arrendatario desactivado, para ver el estado en la lista
  const ex = c.id === 1 ? [{
    id: 'u1990', nombre: 'Rodrigo Pinto', rut: rutDe(990), correo: 'rodrigo.pinto@correo.cl', telefono: '', estado: 'desactivado',
    residencias: [{ idUnidad: 'c6', relacion: 'arrendatario' }], cargos: [], registro: '2025-03-02',
  }] : [];
  return [...personal, ...lista, ...ex];
}

const SOLICITUDES = {
  1: [
    { id: 's1', nombre: 'Josefina Mardones', rut: '20.114.552-3', correo: 'jose.mardones@correo.cl', idUnidad: 'c6', relacion: 'arrendatario', fecha: '2026-10-25', mensaje: 'Arriendo la casa 6 desde octubre. Adjunto contrato si lo necesitan.' },
    { id: 's2', nombre: 'Ignacio Ruiz', rut: '18.552.901-K', correo: 'iruiz@correo.cl', idUnidad: 'c9', relacion: 'propietario', fecha: '2026-10-24', mensaje: 'Soy hijo de la dueña y vivo con ella.' },
  ],
  2: [
    { id: 's3', nombre: 'Tamara Godoy', rut: '19.332.120-5', correo: 'tgodoy@correo.cl', idUnidad: 'vC3', relacion: 'propietario', fecha: '2026-10-23', mensaje: '' },
  ],
  3: [],
};

// Publicaciones de vecinos en el muro y el marketplace; el autor es el residente de la unidad.
// Las oficiales (comunicados y normas) vienen de finanzas: porAprobar aprobadas.
const PUBLICACIONES = {
  1: [
    { id: 'm1', idUnidad: 'c4', lugar: 'muro', texto: '¿Alguien perdió un gato gris? Está en mi patio desde anoche.', fecha: '2026-10-25T21:10:00', reportes: [], estado: 'visible' },
    { id: 'm2', idUnidad: 'c7', lugar: 'muro', texto: 'Otra vez dejaron la basura fuera del contenedor. Así no se puede vivir, los de la casa 3 nunca respetan nada.', fecha: '2026-10-24T08:45:00', reportes: [{ por: 'Casa 3', motivo: 'Acusación personal' }, { por: 'Casa 10', motivo: 'Lenguaje ofensivo' }], estado: 'visible' },
    { id: 'm3', idUnidad: 'c13', lugar: 'marketplace', texto: 'Vendo bicicleta aro 26 en buen estado, $45.000.', fecha: '2026-10-23T17:30:00', reportes: [], estado: 'visible' },
    { id: 'm4', idUnidad: 'c9', lugar: 'marketplace', texto: 'Préstamos rápidos sin papeleo, escríbeme al interno.', fecha: '2026-10-22T12:00:00', reportes: [{ por: 'Casa 1', motivo: 'Posible estafa' }], estado: 'visible' },
    { id: 'm0', idUnidad: 'c9', lugar: 'muro', texto: 'Vendo entradas para el concierto del sábado.', fecha: '2026-10-25T18:00:00', reportes: [{ por: 'Casa 2', motivo: 'Comercio fuera del marketplace' }], estado: 'oculta', moderadaPor: 'Carlos Ibáñez' },
  ],
  2: [
    { id: 'vm1', idUnidad: 'vB2', lugar: 'muro', texto: 'Este sábado hacemos limpieza de la plaza de la manzana B. ¡Los esperamos a las 10!', fecha: '2026-10-24T10:00:00', reportes: [], estado: 'visible' },
  ],
  3: [],
};

export function adminInicial() {
  const vistos = new Map();
  return Object.fromEntries(comunidades.map((c) => [c.id, {
    usuarios: usuarios(c, vistos),
    solicitudes: SOLICITUDES[c.id],
    publicaciones: PUBLICACIONES[c.id],
  }]));
}

// Una comunidad recién creada solo tiene a su primer responsable, invitado desde la plataforma
export function adminVacio(red) {
  const r = red.responsable;
  const usuarios = r ? [{
    id: `u${red.id}000`, nombre: `${r.nombre} ${r.apellido}`, rut: r.rut, correo: r.correo, telefono: '', estado: 'activo',
    residencias: [], cargos: [{ cargo: r.cargo, desde: red.creadaEn, hasta: '' }], registro: red.creadaEn,
  }] : [];
  return { usuarios, solicitudes: [], publicaciones: [] };
}
