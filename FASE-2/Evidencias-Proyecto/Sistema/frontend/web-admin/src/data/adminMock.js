// Datos de ejemplo de Administración con las filas de la base: `usuarios` con sus `residencias`
// y `membresias` de esta comunidad (lo que devolverá la API al pedir los usuarios de una red),
// y solicitudes de acceso (residencias en estado Pendiente, con la persona que las pidió).
// El muro y el marketplace están en muroMock.
import { comunidades } from './mock';
import { residentes } from './finanzasMock';
import { digitoVerificador, formatearRut } from '../utils/rut';
import { CUENTAS, membresia } from './cuentasDemo';

// RUT de ejemplo con dígito verificador correcto
const rutDe = (n) => {
  const cuerpo = String(7000000 + ((n * 7919 * 13) % 17000000));
  return formatearRut(`${cuerpo}${digitoVerificador(cuerpo)}`);
};
// Las personas con cuenta de prueba usan su fila de `usuarios` tal cual
const cuentaDe = (nombre) => CUENTAS.find((c) => `${c.nombre} ${c.apellido_paterno}` === nombre);
// Si el nombre se repite en la demo, el correo lleva un número para no repetirse
const correoDe = (nombre, vistos) => {
  const base = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');
  const veces = (vistos.get(base) ?? 0) + 1;
  vistos.set(base, veces);
  return `${base}${veces > 1 ? veces : ''}@correo.cl`;
};
// Algunas personas tienen un solo apellido (apellido_materno NULL)
const MATERNOS = ['González', null, 'Muñoz', 'Rojas', 'Díaz', null, 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales'];
const telefonoDe = (n) => `+569${String(50000000 + ((n * 7393) % 49999999)).padStart(8, '0')}`;

// Fila de `usuarios` a partir de un nombre de la demo («Nombre Apellido»)
function persona(id_usuario, nombreCompleto, vistos, extra) {
  const c = cuentaDe(nombreCompleto);
  if (c) {
    const fila = Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'flujo' && k !== 'membresias'));
    return { ...fila, ...extra, membresias: [] };
  }
  const [nombre, ...resto] = nombreCompleto.split(' ');
  return {
    id_usuario, rut: rutDe(id_usuario), nombre, apellido_paterno: resto.join(' '), apellido_materno: MATERNOS[id_usuario % MATERNOS.length],
    correo: correoDe(nombreCompleto, vistos), telefono: telefonoDe(id_usuario), estado: 'Activo', membresias: [], ...extra,
  };
}

const residencia = (id_residencia, id_usuario, id_unidad, relacion, fecha_solicitud, extra) => ({
  id_residencia, id_usuario, id_unidad, relacion, estado: 'Activa', mensaje: null,
  fecha_solicitud, id_usuario_resuelve: null, fecha_resolucion: fecha_solicitud, ...extra,
});

// Directiva sin cuenta de prueba (las cuentas de prueba traen sus propias membresías)
const CARGOS = {
  2: { 'Paula Reyes': [['secretario', '2025-05-01', '2027-04-30']] },
};

// Personal sin unidad: administración externa y conserjería
const PERSONAL = {
  1: ['Carlos Ibáñez'],
  2: [],
  3: ['Patricia Olave', 'Héctor Lillo'],
};

function usuarios(c, vistos) {
  let n = c.id_red * 1000;
  const conCargos = (u, nombre) => {
    const cuenta = cuentaDe(nombre);
    const membresias = cuenta
      ? cuenta.membresias.filter((m) => m.id_red === c.id_red)
      : (CARGOS[c.id_red]?.[nombre] ?? []).map(([cargo, desde, hasta]) => membresia(u.id_usuario, c.id_red, cargo, desde, hasta));
    return { ...u, membresias };
  };
  const personal = PERSONAL[c.id_red].map((nombre) => {
    n += 1;
    return conCargos(persona(n, nombre, vistos, { residencias: [], fecha_registro: '2025-01-01T12:00:00' }), nombre);
  });
  const lista = c.unidades.map((u, i) => {
    const nombre = residentes[u.id_unidad];
    n += 1;
    const fecha_registro = `2026-0${1 + (i % 9)}-1${i % 10}T12:00:00`;
    const p = persona(n, nombre, vistos, { fecha_registro });
    const estado = i % 11 === 6 && !cuentaDe(nombre) ? 'Invitado' : 'Activo';
    return conCargos({
      ...p, estado,
      residencias: [residencia(n, p.id_usuario, u.id_unidad, i % 4 === 3 ? 'Arrendatario' : 'Propietario', fecha_registro)],
    }, nombre);
  });
  // Un ex arrendatario desactivado, para ver el estado en la lista
  const ex = c.id_red === 1 ? [{
    ...persona(1990, 'Rodrigo Pinto', vistos, { estado: 'Desactivado', fecha_registro: '2025-03-02T12:00:00' }),
    residencias: [residencia(1990, 1990, 1006, 'Arrendatario', '2025-03-02T12:00:00', { estado: 'Inactiva' })],
  }] : [];
  // Una misma persona puede vivir en más de una unidad: una fila de usuario con varias residencias
  const porId = new Map();
  [...personal, ...lista, ...ex].forEach((u) => {
    const previo = porId.get(u.id_usuario);
    if (previo) previo.residencias.push(...u.residencias);
    else porId.set(u.id_usuario, { ...u, residencias: [...u.residencias] });
  });
  return [...porId.values()];
}

// Solicitudes de acceso: la persona se registró en la app (fila en `usuarios`) y pidió
// vivir en una unidad (fila en `residencias` en estado Pendiente)
const solicitud = (id_usuario, nombre, apellido_paterno, apellido_materno, rut, correo, id_unidad, relacion, fecha, mensaje) => ({
  ...residencia(id_usuario, id_usuario, id_unidad, relacion, `${fecha}T12:00:00`, { estado: 'Pendiente', mensaje: mensaje || null, fecha_resolucion: null }),
  usuario: { id_usuario, rut, nombre, apellido_paterno, apellido_materno, correo, telefono: telefonoDe(id_usuario), estado: 'Activo', fecha_registro: `${fecha}T12:00:00` },
});

const SOLICITUDES = {
  1: [
    solicitud(1901, 'Josefina', 'Mardones', 'Vidal', '20.114.552-3', 'jose.mardones@correo.cl', 1006, 'Arrendatario', '2026-10-25', 'Arriendo la casa 6 desde octubre. Adjunto contrato si lo necesitan.'),
    solicitud(1902, 'Ignacio', 'Ruiz', null, '18.552.901-K', 'iruiz@correo.cl', 1009, 'Propietario', '2026-10-24', 'Soy hijo de la dueña y vivo con ella.'),
  ],
  2: [
    solicitud(2901, 'Tamara', 'Godoy', 'Flores', '19.332.120-5', 'tgodoy@correo.cl', 2051, 'Propietario', '2026-10-23', ''),
  ],
  3: [],
};

export function adminInicial() {
  const vistos = new Map();
  return Object.fromEntries(comunidades.map((c) => [c.id_red, {
    usuarios: usuarios(c, vistos),
    solicitudes: SOLICITUDES[c.id_red],
  }]));
}

// Una comunidad recién creada solo tiene a su primer responsable, invitado desde la plataforma
export function adminVacio(red) {
  const r = red.responsable;
  const usuarios = r ? [{ ...r.usuario, residencias: [], membresias: [r.membresia] }] : [];
  return { usuarios, solicitudes: [] };
}
