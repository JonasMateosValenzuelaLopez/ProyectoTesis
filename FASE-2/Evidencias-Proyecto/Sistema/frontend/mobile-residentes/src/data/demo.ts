// Datos de ejemplo de la app de residentes, con la forma del modelo propuesto
// (redes_vecinales, unidades, residencias, cobros, invitaciones, reservas, muro, votaciones).
// Calzan con los del panel web: mismas comunidades, vecinos, cobros y códigos QR.
// Cuando exista la API, cada lista vendrá de su endpoint filtrada por la comunidad y la unidad.

export type Modulo = 'muro' | 'marketplace' | 'votaciones' | 'reservas' | 'cobros' | 'invitaciones_qr' | 'conserjeria' | 'administrador_externo';
export type TipoComunidad = 'Edificio' | 'Condominio' | 'Villa';

export type Espacio = { nombre: string; bloques: [string, string][]; capacidad: number; reglas: string };

export type Comunidad = {
  id: number; nombre: string; tipo: TipoComunidad; direccion: string; modulos: Modulo[]; espacios: Espacio[];
  transferencia: { banco: string; tipoCuenta: string; numero: string; titular: string; rut: string; correo: string };
  contactos: { nombre: string; detalle: string; telefono: string }[];
};

export type Unidad = { id: string; idRed: number; tipo: 'Casa' | 'Departamento'; numero: string };
export type Residencia = { idUnidad: string; relacion: 'propietario' | 'arrendatario' };
export type Cargo = 'presidente' | 'tesorero' | 'secretario' | 'administrador' | 'conserje';

export type Cuenta = {
  id: number; nombre: string; apellido: string; rut: string; correo: string; telefono: string;
  residencias: Residencia[]; cargos: { idRed: number; cargo: Cargo }[]; flujo: string;
};

export const CLAVE_PRUEBA = 'EntreCasas2026';
export const CODIGO_PRUEBA = '246810';

const BLOQUES_QUINCHO: [string, string][] = [['12:00', '17:00'], ['18:00', '23:30']];
const BLOQUES_SALA: [string, string][] = [['10:00', '13:00'], ['15:00', '18:00'], ['18:00', '22:00']];

export const COMUNIDADES: Comunidad[] = [
  {
    id: 1, nombre: 'Condominio Las Palmas', tipo: 'Condominio', direccion: 'Pasaje Los Aromos 1450, Temuco',
    modulos: ['muro', 'marketplace', 'votaciones', 'reservas', 'cobros', 'invitaciones_qr', 'administrador_externo'],
    espacios: [{ nombre: 'Quincho', bloques: BLOQUES_QUINCHO, capacidad: 25, reglas: 'Se entrega limpio. Viernes y sábado hasta la 01:00.' }],
    transferencia: { banco: 'Banco Estado', tipoCuenta: 'Cuenta corriente', numero: '62900145872', titular: 'Comunidad Condominio Las Palmas', rut: '65.142.380-6', correo: 'pagos@laspalmas.cl' },
    contactos: [
      { nombre: 'Administración Ibáñez y Cía.', detalle: 'Lunes a viernes, 9:00 a 18:00', telefono: '+56 2 2345 6789' },
      { nombre: 'Automatismos Sur SpA', detalle: 'Portón eléctrico · urgencias 24 horas', telefono: '+56 9 8765 4321' },
    ],
  },
  {
    id: 2, nombre: 'Villa Los Copihues', tipo: 'Villa', direccion: 'Calle Los Copihues s/n, Padre Las Casas',
    modulos: ['muro', 'marketplace', 'votaciones', 'reservas', 'cobros'],
    espacios: [
      { nombre: 'Sede vecinal', bloques: [['10:00', '14:00'], ['15:00', '20:00']], capacidad: 60, reglas: 'Pedir la llave a la directiva el día anterior.' },
      { nombre: 'Multicancha', bloques: [['16:00', '18:00'], ['18:00', '20:00'], ['20:00', '22:00']], capacidad: 20, reglas: 'Sin música después de las 22:00.' },
    ],
    transferencia: { banco: 'Banco Estado', tipoCuenta: 'Cuenta de ahorro', numero: '34871209', titular: 'Junta de Vecinos Villa Los Copihues', rut: '65.098.441-2', correo: 'tesoreria@loscopihues.cl' },
    contactos: [{ nombre: 'Plan Cuadrante 14', detalle: 'Carabineros del sector · 24 horas', telefono: '+56 9 8888 0014' }],
  },
  {
    id: 3, nombre: 'Edificio Torre Andes', tipo: 'Edificio', direccion: 'Av. Alemania 0890, Temuco',
    modulos: ['muro', 'marketplace', 'votaciones', 'reservas', 'cobros', 'invitaciones_qr', 'conserjeria', 'administrador_externo'],
    espacios: [
      { nombre: 'Quincho', bloques: BLOQUES_QUINCHO, capacidad: 20, reglas: 'Se retira y se devuelve en conserjería.' },
      { nombre: 'Sala multiuso', bloques: BLOQUES_SALA, capacidad: 15, reglas: 'Se retira y se devuelve en conserjería.' },
      { nombre: 'Gimnasio', bloques: [['07:00', '08:00'], ['08:00', '09:00'], ['19:00', '20:00'], ['20:00', '21:00']], capacidad: 4, reglas: 'Una hora por unidad al día.' },
    ],
    transferencia: { banco: 'Banco de Chile', tipoCuenta: 'Cuenta corriente', numero: '00-158-74123-09', titular: 'Comunidad Edificio Torre Andes', rut: '65.230.118-K', correo: 'pagos@torreandes.cl' },
    contactos: [
      { nombre: 'Conserjería', detalle: 'Todos los días, 24 horas', telefono: '+56 45 221 0890' },
      { nombre: 'Administración Olave', detalle: 'Lunes a viernes, 9:00 a 17:00', telefono: '+56 9 7123 4567' },
    ],
  },
];

const u = (id: string, idRed: number, numero: string): Unidad => ({ id, idRed, tipo: id.startsWith('d') ? 'Departamento' : 'Casa', numero });
export const UNIDADES: Record<string, Unidad> = Object.fromEntries([
  u('c1', 1, '1'), u('c5', 1, '5'), u('c15', 1, '15'), u('c4', 1, '4'), u('c7', 1, '7'), u('c9', 1, '9'), u('c13', 1, '13'),
  u('d603', 3, '603'), u('d502', 3, '502'), u('d302', 3, '302'), u('d404', 3, '404'), u('d104', 3, '104'),
  u('vB3', 2, '27'), u('vA1', 2, '1'), u('vB2', 2, '26'), u('vD5', 2, '77'),
].map((x) => [x.id, x]));

export const CUENTAS: Cuenta[] = [
  {
    id: 201, nombre: 'Rosa', apellido: 'Díaz', rut: '19.876.543-0', correo: 'rosa.diaz@correo.cl', telefono: '+56 9 6123 4501',
    residencias: [{ idUnidad: 'c1', relacion: 'propietario' }], cargos: [], flujo: 'Casa 1, Las Palmas · al día',
  },
  {
    id: 202, nombre: 'Luis', apellido: 'Muñoz', rut: '15.678.234-3', correo: 'luis.munoz@correo.cl', telefono: '+56 9 6123 4505',
    residencias: [{ idUnidad: 'c5', relacion: 'propietario' }], cargos: [{ idRed: 1, cargo: 'presidente' }], flujo: 'Casa 5, Las Palmas · pendiente · es Presidente',
  },
  {
    id: 203, nombre: 'Mónica', apellido: 'Sáez', rut: '16.890.123-2', correo: 'monica.saez@correo.cl', telefono: '+56 9 6123 4603',
    residencias: [{ idUnidad: 'd603', relacion: 'arrendatario' }], cargos: [], flujo: 'Depto 603, Torre Andes · con deuda',
  },
  {
    id: 204, nombre: 'Andrés', apellido: 'Bravo', rut: '14.230.987-4', correo: 'andres.bravo@correo.cl', telefono: '+56 9 6123 4027',
    residencias: [{ idUnidad: 'vB3', relacion: 'propietario' }], cargos: [], flujo: 'Casa 27, Villa Los Copihues · sin QR',
  },
  {
    id: 205, nombre: 'Usuario', apellido: 'Demo', rut: '11.111.111-1', correo: 'demo@entrecasas.cl', telefono: '+56 9 6000 0000',
    residencias: [{ idUnidad: 'c15', relacion: 'propietario' }, { idUnidad: 'd502', relacion: 'arrendatario' }, { idUnidad: 'vA1', relacion: 'propietario' }],
    cargos: [], flujo: 'Una vivienda en cada comunidad, para cambiar entre ellas',
  },
];

// Cuentas que solo usan el panel web (personal sin vivienda en la comunidad)
export const SOLO_PANEL = ['12.345.678-5', '14.567.890-0', '18.234.765-5', '9.876.543-3', '16.234.567-2', '13.987.654-7', '10.456.789-4', '17.345.123-7'];

// ---------- Gastos comunes ----------
export type Item = { concepto: string; monto: number; extraordinario?: boolean };
export type Periodo = { periodo: string; nombre: string; items: Item[]; vence: string; estado: 'pagado' | 'pendiente' | 'exento'; marcadoPor?: string; marcadoEn?: string };
export type EstadoCuenta = { actual: Periodo; deudaAnterior: number; historial: Periodo[] };

const ITEMS: Record<number, Item[]> = {
  1: [{ concepto: 'Gasto común', monto: 68400 }, { concepto: 'Fondo de reserva', monto: 8000 }, { concepto: 'Mantención portón eléctrico', monto: 28000, extraordinario: true }],
  2: [{ concepto: 'Cuota social', monto: 5000 }],
  3: [{ concepto: 'Gasto común', monto: 95000 }, { concepto: 'Fondo de reserva', monto: 10000 }],
};
const MARCA: Record<number, string> = { 1: 'Carlos Ibáñez · Administrador', 2: 'Jorge Silva · Tesorero', 3: 'Patricia Olave · Administradora' };
const PENDIENTES = ['c3', 'c5', 'c7', 'c9', 'c12', 'c14', 'd603', 'vB3'];
const DEUDA: Record<string, number> = { c3: 104400, c9: 104400, c12: 68400, c14: 72800, d603: 210000 };

const periodo = (idRed: number, idUnidad: string, p: string, nombre: string, vence: string, pagado: boolean, dia: number): Periodo => ({
  periodo: p, nombre, vence, items: idRed === 1 && p !== '2026-10' ? ITEMS[1].slice(0, 2) : ITEMS[idRed],
  estado: pagado ? 'pagado' : 'pendiente',
  ...(pagado ? { marcadoPor: MARCA[idRed], marcadoEn: `${p === '2026-10' ? '2026-10' : p === '2026-09' ? '2026-10' : '2026-09'}-0${dia}T10:30:00` } : {}),
});

export function estadoCuentaInicial(idUnidad: string): EstadoCuenta {
  const { idRed } = UNIDADES[idUnidad];
  const debe = DEUDA[idUnidad] ?? 0;
  const dia = 3 + (idUnidad.length % 5);
  return {
    actual: periodo(idRed, idUnidad, '2026-10', 'Octubre 2026', '2026-11-05', !PENDIENTES.includes(idUnidad), dia),
    deudaAnterior: debe,
    historial: [
      periodo(idRed, idUnidad, '2026-09', 'Septiembre 2026', '2026-10-05', debe === 0, dia),
      periodo(idRed, idUnidad, '2026-08', 'Agosto 2026', '2026-09-05', debe < 200000, dia + 1),
    ],
  };
}

// ---------- Invitaciones QR ----------
export type Invitacion = {
  id: string; codigo: string; visitante: string; rut: string; idUnidad: string; tipo: 'visita' | 'proveedor' | 'servicio';
  desde: string; hasta: string; patente: string; estado: 'esperada' | 'adentro' | 'salio' | 'cancelada';
};
const haceMin = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const enDias = (n: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d.toISOString(); };

export function invitacionesIniciales(): Invitacion[] {
  return [
    { id: 'i1', codigo: 'EC-4K7Q2', visitante: 'Daniela Pino', rut: '17.654.321-6', idUnidad: 'd502', tipo: 'visita', desde: haceMin(30), hasta: haceMin(-180), patente: 'RTKD45', estado: 'esperada' },
    { id: 'i8', codigo: 'EC-7M2D4', visitante: 'Ignacio Fuentes', rut: '', idUnidad: 'd502', tipo: 'visita', desde: enDias(2, 19), hasta: enDias(2, 23), patente: '', estado: 'esperada' },
    { id: 'i9', codigo: 'EC-8R4Z1', visitante: 'Tía Carmen', rut: '', idUnidad: 'd502', tipo: 'visita', desde: enDias(-3, 15), hasta: enDias(-3, 19), patente: '', estado: 'salio' },
    { id: 'pi1', codigo: 'EC-6L4S2', visitante: 'Ignacio Ruiz', rut: '18.552.901-K', idUnidad: 'c9', tipo: 'visita', desde: haceMin(60), hasta: haceMin(-240), patente: 'HJTR19', estado: 'esperada' },
    { id: 'ri1', codigo: 'EC-3F9K7', visitante: 'Marcela Díaz', rut: '', idUnidad: 'c1', tipo: 'visita', desde: enDias(0, 18), hasta: enDias(0, 22), patente: 'PFGH62', estado: 'esperada' },
    { id: 'ri2', codigo: 'EC-1W5P3', visitante: 'Jardines del Sur', rut: '76.111.222-3', idUnidad: 'c1', tipo: 'proveedor', desde: enDias(-6, 9), hasta: enDias(-6, 13), patente: '', estado: 'salio' },
  ];
}

// ---------- Reservas ----------
export type Reserva = { id: string; idRed: number; espacio: string; idUnidad: string; fecha: string; desde: string; hasta: string; invitados: number; estado: 'confirmada' | 'cancelada' | 'devuelto' };
const pad = (n: number) => String(n).padStart(2, '0');
export const diaISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dia = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return diaISO(d); };

export function reservasIniciales(): Reserva[] {
  return [
    { id: 'r2', idRed: 3, espacio: 'Quincho', idUnidad: 'd504', fecha: dia(0), desde: '18:00', hasta: '23:30', invitados: 15, estado: 'confirmada' },
    { id: 'r4', idRed: 3, espacio: 'Sala multiuso', idUnidad: 'd404', fecha: dia(0), desde: '18:00', hasta: '22:00', invitados: 8, estado: 'confirmada' },
    { id: 'r6', idRed: 3, espacio: 'Quincho', idUnidad: 'd104', fecha: dia(1), desde: '12:00', hasta: '17:00', invitados: 10, estado: 'confirmada' },
    { id: 'r9', idRed: 3, espacio: 'Gimnasio', idUnidad: 'd502', fecha: dia(1), desde: '07:00', hasta: '08:00', invitados: 0, estado: 'confirmada' },
    { id: 'pr1', idRed: 1, espacio: 'Quincho', idUnidad: 'c5', fecha: dia(2), desde: '12:00', hasta: '17:00', invitados: 14, estado: 'confirmada' },
    { id: 'pr2', idRed: 1, espacio: 'Quincho', idUnidad: 'c13', fecha: dia(6), desde: '18:00', hasta: '23:30', invitados: 8, estado: 'confirmada' },
    { id: 'pr3', idRed: 1, espacio: 'Quincho', idUnidad: 'c1', fecha: dia(-9), desde: '12:00', hasta: '17:00', invitados: 12, estado: 'devuelto' },
    { id: 'vr1', idRed: 2, espacio: 'Sede vecinal', idUnidad: 'vB2', fecha: dia(3), desde: '10:00', hasta: '14:00', invitados: 30, estado: 'confirmada' },
    { id: 'vr2', idRed: 2, espacio: 'Multicancha', idUnidad: 'vD5', fecha: dia(1), desde: '18:00', hasta: '20:00', invitados: 10, estado: 'confirmada' },
  ];
}

// ---------- Muro y mercado ----------
export type Publicacion = {
  id: string; idRed: number; lugar: 'muro' | 'mercado'; oficial?: { tipo: 'Comunicado' | 'Norma'; aprobadoPor: string; cargo: 'presidente' | 'administrador' };
  autor: string; idUnidad?: string; titulo?: string; texto: string; fecha: string; precio?: number; categoria?: 'Vendo' | 'Servicio' | 'Busco';
  reportadaPorMi?: boolean;
};

export function publicacionesIniciales(): Publicacion[] {
  return [
    { id: 'pa0', idRed: 1, lugar: 'muro', oficial: { tipo: 'Comunicado', aprobadoPor: 'Luis Muñoz · Presidente', cargo: 'presidente' }, autor: 'Secretaría', titulo: 'Poda de árboles del pasaje', texto: 'El martes 14 se podarán los árboles del pasaje entre 9:00 y 13:00. Por favor no estacionar bajo los árboles ese día.', fecha: '2026-10-09T10:00:00' },
    { id: 'pn0', idRed: 1, lugar: 'muro', oficial: { tipo: 'Norma', aprobadoPor: 'Luis Muñoz · Presidente', cargo: 'presidente' }, autor: 'Secretaría', titulo: 'Tenencia responsable de mascotas', texto: 'Las mascotas deben circular con correa por el pasaje y sus dueños deben recoger los desechos. Los reclamos se registran en el muro.', fecha: '2026-08-02T10:00:00' },
    { id: 'm1', idRed: 1, lugar: 'muro', autor: 'Gabriel Ortiz', idUnidad: 'c4', texto: '¿Alguien perdió un gato gris? Está en mi patio desde anoche.', fecha: '2026-10-25T21:10:00' },
    { id: 'm5', idRed: 1, lugar: 'muro', autor: 'Diego Fuentes', idUnidad: 'c7', texto: 'Gracias a quien dejó el paquete de Correos en mi puerta, llegó perfecto.', fecha: '2026-10-23T19:40:00' },
    { id: 'm3', idRed: 1, lugar: 'mercado', categoria: 'Vendo', precio: 45000, autor: 'Matías Contreras', idUnidad: 'c13', texto: 'Bicicleta aro 26 en buen estado. Se puede probar en el pasaje.', fecha: '2026-10-23T17:30:00' },
    { id: 'm6', idRed: 1, lugar: 'mercado', categoria: 'Servicio', autor: 'Rodrigo Pizarro', idUnidad: 'c9', texto: 'Clases de matemáticas para básica y media. Primera clase sin costo.', fecha: '2026-10-21T12:00:00' },
    { id: 'm7', idRed: 1, lugar: 'mercado', categoria: 'Busco', autor: 'Gabriel Ortiz', idUnidad: 'c4', texto: 'Busco quien me preste una escalera de 3 metros el fin de semana.', fecha: '2026-10-24T09:15:00' },
    { id: 'vm1', idRed: 2, lugar: 'muro', autor: 'Valentina Castro', idUnidad: 'vB2', texto: 'Este sábado hacemos limpieza de la plaza de la manzana B. ¡Los esperamos a las 10!', fecha: '2026-10-24T10:00:00' },
    { id: 'vm2', idRed: 2, lugar: 'muro', oficial: { tipo: 'Comunicado', aprobadoPor: 'Sonia Fuentealba · Presidenta', cargo: 'presidente' }, autor: 'Secretaría', titulo: 'Asamblea ordinaria de octubre', texto: 'El acta de la asamblea del 4 de octubre ya está disponible. Se aprobó cotizar una alarma comunitaria; la votación está abierta en la app.', fecha: '2026-10-06T09:00:00' },
    { id: 'vm3', idRed: 2, lugar: 'mercado', categoria: 'Vendo', precio: 3500, autor: 'Paula Reyes', idUnidad: 'vD5', texto: 'Empanadas de pino los domingos. Pedidos hasta el sábado.', fecha: '2026-10-22T18:00:00' },
    { id: 'em1', idRed: 3, lugar: 'muro', oficial: { tipo: 'Comunicado', aprobadoPor: 'Patricia Olave · Administradora', cargo: 'administrador' }, autor: 'Administración', titulo: 'Mantención de ascensores', texto: 'El jueves de 10:00 a 13:00 el ascensor A estará detenido por mantención preventiva.', fecha: '2026-10-22T09:00:00' },
    { id: 'em2', idRed: 3, lugar: 'muro', autor: 'Tomás Herrera', idUnidad: 'd104', texto: 'Se encontró un juego de llaves en el gimnasio. Están en conserjería.', fecha: '2026-10-25T08:20:00' },
    { id: 'em3', idRed: 3, lugar: 'mercado', categoria: 'Vendo', precio: 120000, autor: 'Ricardo Molina', idUnidad: 'd302', texto: 'Escritorio blanco de 120 cm con cajonera. Retiro en el depto.', fecha: '2026-10-20T20:00:00' },
  ];
}

// ---------- Votaciones (un voto por unidad) ----------
export type Votacion = {
  id: string; idRed: number; tipo: 'votacion' | 'encuesta'; titulo: string; descripcion: string; estado: 'abierta' | 'cerrada';
  opciones: { id: string; texto: string; votos: number }[]; cierre: string; quorum: number | null; totalUnidades: number;
};

export function votacionesIniciales(): Votacion[] {
  return [
    { id: 'vo1', idRed: 1, tipo: 'votacion', titulo: 'Cambio de empresa de seguridad', descripcion: 'Cambiar a Vigilancia Araucanía desde diciembre. El costo por casa baja $3.200 al mes.', estado: 'abierta', opciones: [{ id: 'o1', texto: 'A favor', votos: 7 }, { id: 'o2', texto: 'En contra', votos: 2 }, { id: 'o3', texto: 'Abstención', votos: 1 }], cierre: '2026-10-31', quorum: 60, totalUnidades: 15 },
    { id: 'vo2', idRed: 1, tipo: 'encuesta', titulo: '¿Qué día prefieres para la próxima asamblea?', descripcion: 'La directiva fijará la fecha con la opción más votada.', estado: 'abierta', opciones: [{ id: 'o1', texto: 'Martes 19:30', votos: 3 }, { id: 'o2', texto: 'Jueves 19:30', votos: 2 }, { id: 'o3', texto: 'Sábado 11:00', votos: 1 }], cierre: '2026-11-03', quorum: null, totalUnidades: 15 },
    { id: 'vo0', idRed: 1, tipo: 'votacion', titulo: 'Poda de árboles del pasaje', descripcion: 'Contratar la poda anual con Jardines del Sur por $260.000.', estado: 'cerrada', opciones: [{ id: 'o1', texto: 'A favor', votos: 11 }, { id: 'o2', texto: 'En contra', votos: 1 }], cierre: '2026-09-25', quorum: 60, totalUnidades: 15 },
    { id: 'vvo1', idRed: 2, tipo: 'votacion', titulo: 'Instalar alarma comunitaria', descripcion: 'Alarma con botón en cada manzana. Costo único de $2.000 por casa.', estado: 'abierta', opciones: [{ id: 'o1', texto: 'A favor', votos: 38 }, { id: 'o2', texto: 'En contra', votos: 9 }], cierre: '2026-11-08', quorum: 50, totalUnidades: 96 },
  ];
}
