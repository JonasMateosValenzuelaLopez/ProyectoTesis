// Datos de ejemplo de portería, con la forma del modelo propuesto: invitaciones (QR),
// registro_accesos, vehiculos y reservas. Las horas se arman sobre el día de hoy
// para que la garita siempre se vea "en vivo" al abrir la demo.
import { residentes } from './finanzasMock';

const pad = (n) => String(n).padStart(2, '0');
export const diaISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const enDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return diaISO(d); };

// Hora de hoy desplazada en minutos respecto de ahora (negativo = en el pasado)
const haceMin = (min) => new Date(Date.now() - min * 60000).toISOString();
// Hora de hoy a una hora fija
const hoyA = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };

function edificio() {
  return {
    invitaciones: [
      { id: 'i1', codigo: 'EC-4K7Q2', visitante: 'Daniela Pino', rut: '17.654.321-6', idUnidad: 'd502', tipo: 'visita', desde: haceMin(30), hasta: haceMin(-180), patente: 'RTKD45', estado: 'esperada' },
      { id: 'i2', codigo: 'EC-9P3M8', visitante: 'Gasfitería Lagos', rut: '76.543.210-3', idUnidad: 'd301', tipo: 'proveedor', desde: haceMin(10), hasta: haceMin(-120), patente: '', estado: 'esperada' },
      { id: 'i3', codigo: 'EC-2H6W1', visitante: 'Tomás Herrera', rut: '19.111.222-3', idUnidad: 'd104', tipo: 'visita', desde: haceMin(-90), hasta: haceMin(-300), patente: '', estado: 'esperada' },
      { id: 'i4', codigo: 'EC-7B5N3', visitante: 'Isidora Tapia', rut: '18.765.432-1', idUnidad: 'd602', tipo: 'visita', desde: haceMin(120), hasta: haceMin(-60), patente: 'KLPR12', estado: 'adentro' },
      { id: 'i5', codigo: 'EC-1X8C4', visitante: 'Felipe Navarro', rut: '16.222.333-4', idUnidad: 'd203', tipo: 'visita', desde: haceMin(600), hasta: haceMin(240), patente: '', estado: 'esperada' },
      { id: 'i6', codigo: 'EC-5T2R9', visitante: 'Catalina Núñez', rut: '20.333.444-5', idUnidad: 'd401', tipo: 'visita', desde: haceMin(300), hasta: haceMin(120), patente: '', estado: 'salio' },
      { id: 'i7', codigo: 'EC-3V9J6', visitante: 'Mudanzas Andes', rut: '77.888.999-0', idUnidad: 'd201', tipo: 'servicio', desde: hoyA(9), hasta: hoyA(13), patente: 'FHJK88', estado: 'cancelada' },
    ],
    accesos: [
      { id: 'a1', fecha: haceMin(2), sentido: 'ingreso', persona: residentes.d403, categoria: 'residente', idUnidad: 'd403', metodo: 'Tag', patente: '' },
      { id: 'a2', fecha: haceMin(9), sentido: 'salida', persona: residentes.d104, categoria: 'residente', idUnidad: 'd104', metodo: 'Patente', patente: 'GHTY21' },
      { id: 'a3', fecha: haceMin(16), sentido: 'ingreso', persona: 'Repartidor PedidosYa', categoria: 'delivery', idUnidad: 'd502', metodo: 'Manual', patente: '' },
      { id: 'a4', fecha: haceMin(17), sentido: 'salida', persona: 'Repartidor PedidosYa', categoria: 'delivery', idUnidad: 'd502', metodo: 'Manual', patente: '' },
      { id: 'a5', fecha: haceMin(48), sentido: 'salida', persona: 'Catalina Núñez', categoria: 'visita', idUnidad: 'd401', metodo: 'QR', patente: '' },
      { id: 'a6', fecha: haceMin(115), sentido: 'ingreso', persona: 'Isidora Tapia', categoria: 'visita', idUnidad: 'd602', metodo: 'QR', patente: 'KLPR12' },
      { id: 'a7', fecha: haceMin(160), sentido: 'ingreso', persona: residentes.d201, categoria: 'residente', idUnidad: 'd201', metodo: 'Tag', patente: '' },
    ],
    vehiculos: {
      d104: [{ patente: 'GHTY21', modelo: 'Toyota Yaris gris' }],
      d403: [{ patente: 'PLMN34', modelo: 'Kia Morning rojo' }],
      d502: [{ patente: 'BCDF56', modelo: 'Suzuki Swift blanco' }, { patente: 'XZ1234', modelo: 'Moto Honda negra' }],
      d601: [{ patente: 'JKLM78', modelo: 'Hyundai Tucson azul' }],
    },
    estacionamientos: { d104: 'E-12', d403: 'E-04', d502: 'E-07', d601: 'E-01' },
    reservas: [
      { id: 'r1', espacio: 'Quincho', idUnidad: 'd302', fecha: diaISO(), desde: '13:00', hasta: '17:00', invitados: 12, estado: 'devuelto', observacion: 'Sin novedades' },
      { id: 'r2', espacio: 'Quincho', idUnidad: 'd504', fecha: diaISO(), desde: '19:00', hasta: '23:30', invitados: 15, estado: 'confirmada' },
      { id: 'r3', espacio: 'Sala multiuso', idUnidad: 'd203', fecha: diaISO(), desde: '10:00', hasta: '12:00', invitados: 6, estado: 'devuelto', observacion: 'Sin novedades' },
      { id: 'r4', espacio: 'Sala multiuso', idUnidad: 'd404', fecha: diaISO(), desde: '18:00', hasta: '20:00', invitados: 8, estado: 'confirmada' },
      { id: 'r5', espacio: 'Gimnasio', idUnidad: 'd601', fecha: diaISO(), desde: '07:00', hasta: '08:00', invitados: 0, estado: 'devuelto', observacion: 'Sin novedades' },
      { id: 'r6', espacio: 'Quincho', idUnidad: 'd104', fecha: enDias(1), desde: '13:00', hasta: '18:00', invitados: 10, estado: 'confirmada' },
      { id: 'r7', espacio: 'Sala multiuso', idUnidad: 'd301', fecha: enDias(2), desde: '17:00', hasta: '19:00', invitados: 5, estado: 'confirmada' },
      { id: 'r8', espacio: 'Quincho', idUnidad: 'd602', fecha: enDias(5), desde: '12:00', hasta: '16:00', invitados: 20, estado: 'confirmada' },
    ],
  };
}

function lasPalmas() {
  return {
    invitaciones: [
      { id: 'pi1', codigo: 'EC-6L4S2', visitante: 'Ignacio Ruiz', rut: '18.552.901-K', idUnidad: 'c9', tipo: 'visita', desde: haceMin(60), hasta: haceMin(-240), patente: 'HJTR19', estado: 'esperada' },
      { id: 'pi2', codigo: 'EC-8D1F7', visitante: 'Jardines del Sur', rut: '76.111.222-3', idUnidad: 'c1', tipo: 'proveedor', desde: hoyA(9), hasta: hoyA(13), patente: '', estado: 'salio' },
    ],
    accesos: [
      { id: 'pa1', fecha: haceMin(40), sentido: 'salida', persona: 'Jardines del Sur', categoria: 'proveedor', idUnidad: 'c1', metodo: 'QR', patente: '' },
      { id: 'pa2', fecha: haceMin(210), sentido: 'ingreso', persona: 'Jardines del Sur', categoria: 'proveedor', idUnidad: 'c1', metodo: 'QR', patente: '' },
    ],
    vehiculos: { c4: [{ patente: 'LKJH23', modelo: 'Nissan Versa gris' }], c11: [{ patente: 'MNBV98', modelo: 'Chevrolet Sail blanco' }] },
    estacionamientos: {},
    reservas: [
      { id: 'pr1', espacio: 'Quincho', idUnidad: 'c5', fecha: enDias(2), desde: '13:00', hasta: '18:00', invitados: 14, estado: 'confirmada' },
      { id: 'pr2', espacio: 'Quincho', idUnidad: 'c12', fecha: enDias(6), desde: '19:00', hasta: '23:00', invitados: 8, estado: 'confirmada' },
    ],
  };
}

function villa() {
  return {
    invitaciones: [], accesos: [], vehiculos: {}, estacionamientos: {},
    reservas: [
      { id: 'vr1', espacio: 'Sede vecinal', idUnidad: 'vB2', fecha: enDias(3), desde: '10:00', hasta: '14:00', invitados: 30, estado: 'confirmada' },
      { id: 'vr2', espacio: 'Multicancha', idUnidad: 'vD5', fecha: enDias(1), desde: '18:00', hasta: '20:00', invitados: 10, estado: 'confirmada' },
    ],
  };
}

export function conserjeriaInicial() {
  return { 1: lasPalmas(), 2: villa(), 3: edificio() };
}

// Gente que entra y sale para simular el monitor en vivo de la garita
export const MOVIMIENTOS_SIMULADOS = [
  { categoria: 'residente', metodo: 'Tag' },
  { categoria: 'residente', metodo: 'Patente' },
  { categoria: 'delivery', metodo: 'Manual', persona: 'Repartidor Rappi' },
  { categoria: 'residente', metodo: 'Tag' },
  { categoria: 'delivery', metodo: 'Manual', persona: 'Correos de Chile' },
];

export const conserjeriaVacia = () => ({ invitaciones: [], accesos: [], vehiculos: {}, estacionamientos: {}, reservas: [] });
