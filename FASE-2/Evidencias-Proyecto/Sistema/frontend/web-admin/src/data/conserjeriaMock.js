// Datos de ejemplo de portería con las filas de la base: `visitantes`, `invitaciones` (QR),
// `registro_accesos` (una fila por visita, con su ingreso y su salida), `vehiculos` y `reservas`.
// Las horas se arman sobre el día de hoy para que la garita siempre se vea "en vivo" al abrir la demo.
// Son las mismas filas que usa la app de residentes.

const pad = (n) => String(n).padStart(2, '0');
export const diaISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// DATETIME local, como lo guarda MariaDB
export const fechaHoraLocal = (d = new Date()) => `${diaISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const enDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return diaISO(d); };

// Hora desplazada en minutos respecto de ahora (negativo = en el futuro)
const haceMin = (min) => fechaHoraLocal(new Date(Date.now() - min * 60000));
// Día relativo a hoy a una hora fija
const diaA = (n, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return fechaHoraLocal(d); };

// Un delivery o una empresa sin apellido se guarda con apellido vacío
const visitante = (id_visitante, nombre, apellido = '', rut = null, tipo = 'Esporádico') => ({ id_visitante, rut, nombre, apellido, tipo });
// Quien invita es el residente de la unidad (`id_usuario`, el mismo de Residentes y cargos)
const invitacion = (id_invitacion, codigo, id_unidad, id_usuario, id_visitante, tipo, fecha_desde, fecha_hasta, patente, estado) => ({
  id_invitacion, codigo, id_unidad, id_usuario, id_visitante, tipo, fecha_desde, fecha_hasta, patente, estado, fecha_creacion: fecha_desde,
});
// Con invitación nace Aprobado; sin invitación, «Pendiente de Confirmación» hasta que el residente responde
const acceso = (id_acceso, id_visitante, id_unidad, categoria, fecha_ingreso, fecha_salida, extra) => ({
  id_acceso, id_visitante, id_unidad, id_invitacion: null, categoria, patente: null, metodo: 'Manual', fecha_ingreso, fecha_salida,
  estado_autorizacion: 'Aprobado', autorizado_via: null, id_usuario_autoriza: null, id_usuario_registra: null, codigo_qr_validado: 0, ...extra,
});
const conQR = (inv, id_usuario_registra) => ({
  id_invitacion: inv, metodo: 'QR', autorizado_via: 'Invitación', codigo_qr_validado: 1, id_usuario_registra,
});
const vehiculo = (id_vehiculo, id_unidad, patente, modelo, estacionamiento = null) => ({ id_vehiculo, id_unidad, patente, modelo, estacionamiento });

// Fila de `reservas`. Quien reserva es el residente de la unidad (`id_usuario`, el mismo de
// Residentes y cargos); las horas son columnas TIME. La app las crea Aprobada: no hay paso de aprobación.
const reserva = (id_reserva, id_espacio, id_usuario, id_unidad, fecha_reserva, inicio, fin, cantidad_invitados, estado_reserva = 'Aprobada', observacion = null) => ({
  id_reserva, id_espacio, id_usuario, id_unidad, fecha_reserva, hora_inicio: `${inicio}:00`, hora_fin: `${fin}:00`,
  cantidad_invitados, estado_reserva, observacion, fecha_solicitud: `${diaISO()}T09:00:00`,
});

// 108 Héctor Lillo (conserje) registra los ingresos en la garita
function edificio() {
  return {
    visitantes: [
      visitante(301, 'Daniela', 'Pino', '17.654.321-6'),
      visitante(302, 'Gasfitería Lagos', '', '76.543.210-3'),
      visitante(303, 'Tomás', 'Herrera', '19.111.222-3'),
      visitante(304, 'Isidora', 'Tapia', '18.765.432-1', 'Frecuente'),
      visitante(305, 'Felipe', 'Navarro', '16.222.333-4'),
      visitante(306, 'Catalina', 'Núñez', '20.333.444-5'),
      visitante(307, 'Mudanzas Andes', '', '77.888.999-0'),
      visitante(308, 'Ignacio', 'Fuentes'),
      visitante(309, 'Carmen', 'Rojas', null, 'Frecuente'),
      visitante(310, 'Repartidor PedidosYa'),
      visitante(311, 'Sebastián', 'Rojas'),
      visitante(312, 'Repartidor Rappi'),
    ],
    invitaciones: [
      invitacion(301, 'EC-4K7Q2', 3502, 3008, 301, 'Visita', haceMin(30), haceMin(-180), 'RTKD45', 'Esperada'),
      invitacion(302, 'EC-9P3M8', 3301, 3015, 302, 'Proveedor', haceMin(10), haceMin(-120), null, 'Esperada'),
      invitacion(303, 'EC-2H6W1', 3104, 3026, 303, 'Visita', haceMin(-90), haceMin(-300), null, 'Esperada'),
      invitacion(304, 'EC-7B5N3', 3602, 3004, 304, 'Visita', haceMin(120), haceMin(-60), 'KLPR12', 'Adentro'),
      invitacion(305, 'EC-1X8C4', 3203, 3021, 305, 'Visita', haceMin(600), haceMin(240), null, 'Esperada'),
      invitacion(306, 'EC-5T2R9', 3401, 3011, 306, 'Visita', haceMin(300), haceMin(120), null, 'Salió'),
      invitacion(307, 'EC-3V9J6', 3201, 3019, 307, 'Servicio', diaA(0, 9), diaA(0, 13), 'FHJK88', 'Cancelada'),
      invitacion(308, 'EC-7M2D4', 3502, 3008, 308, 'Visita', diaA(2, 19), diaA(2, 23), null, 'Esperada'),
      invitacion(309, 'EC-8R4Z1', 3502, 3008, 309, 'Visita', diaA(-3, 15), diaA(-3, 19), null, 'Salió'),
    ],
    registro_accesos: [
      acceso(301, 304, 3602, 'Visita', haceMin(115), null, { ...conQR(304, 108), patente: 'KLPR12' }),
      acceso(302, 306, 3401, 'Visita', haceMin(170), haceMin(48), conQR(306, 108)),
      acceso(303, 310, 3502, 'Delivery', haceMin(20), haceMin(16), { autorizado_via: 'App', id_usuario_autoriza: 3008, id_usuario_registra: 108 }),
      acceso(304, 309, 3502, 'Visita', diaA(-3, 15, 10), diaA(-3, 18, 40), conQR(309, 108)),
      // Llegaron sin invitación: esperan que el residente responda
      acceso(305, 311, 3603, 'Visita', haceMin(2), null, { estado_autorizacion: 'Pendiente de Confirmación', id_usuario_registra: 108 }),
      acceso(306, 312, 3502, 'Delivery', haceMin(1), null, { estado_autorizacion: 'Pendiente de Confirmación', id_usuario_registra: 108 }),
    ],
    vehiculos: [
      vehiculo(301, 3104, 'GHTY21', 'Toyota Yaris gris', 'E-12'),
      vehiculo(302, 3403, 'PLMN34', 'Kia Morning rojo', 'E-04'),
      vehiculo(303, 3502, 'BCDF56', 'Suzuki Swift blanco', 'E-07'),
      vehiculo(304, 3502, 'XZ1234', 'Moto Honda negra', 'E-07'),
      vehiculo(305, 3601, 'JKLM78', 'Hyundai Tucson azul', 'E-01'),
    ],
    reservas: [
      reserva(301, 31, 3016, 3302, diaISO(), '12:00', '17:00', 12, 'Devuelto', 'Sin novedades'),
      reserva(302, 31, 3010, 3504, diaISO(), '18:00', '23:30', 15),
      reserva(303, 32, 3021, 3203, diaISO(), '10:00', '13:00', 6, 'Devuelto', 'Sin novedades'),
      reserva(304, 32, 3014, 3404, diaISO(), '18:00', '22:00', 8),
      reserva(305, 33, 3003, 3601, diaISO(), '07:00', '08:00', 0, 'Devuelto', 'Sin novedades'),
      reserva(306, 31, 3026, 3104, enDias(1), '12:00', '17:00', 10),
      reserva(307, 32, 3015, 3301, enDias(2), '15:00', '18:00', 5),
      reserva(308, 31, 3004, 3602, enDias(5), '12:00', '17:00', 20),
      reserva(309, 33, 3008, 3502, enDias(1), '07:00', '08:00', 0),
    ],
  };
}

// Sin conserjería: el administrador 101 Carlos Ibáñez registra los ingresos
function lasPalmas() {
  return {
    visitantes: [
      visitante(101, 'Ignacio', 'Ruiz', '18.552.901-K'),
      visitante(102, 'Jardines del Sur', '', '76.111.222-3', 'Frecuente'),
      visitante(103, 'Marcela', 'Díaz'),
    ],
    invitaciones: [
      invitacion(101, 'EC-6L4S2', 1009, 1010, 101, 'Visita', haceMin(60), haceMin(-240), 'HJTR19', 'Esperada'),
      invitacion(102, 'EC-8D1F7', 1001, 110, 102, 'Proveedor', diaA(0, 9), diaA(0, 13), null, 'Salió'),
      invitacion(103, 'EC-3F9K7', 1001, 110, 103, 'Visita', diaA(0, 18), diaA(0, 22), 'PFGH62', 'Esperada'),
    ],
    registro_accesos: [
      acceso(101, 102, 1001, 'Proveedor', haceMin(210), haceMin(40), conQR(102, 101)),
    ],
    vehiculos: [
      vehiculo(101, 1004, 'LKJH23', 'Nissan Versa gris'),
      vehiculo(102, 1011, 'MNBV98', 'Chevrolet Sail blanco'),
    ],
    reservas: [
      reserva(101, 11, 102, 1005, enDias(2), '12:00', '17:00', 14),
      reserva(102, 11, 1013, 1012, enDias(6), '18:00', '23:30', 8),
      reserva(103, 11, 110, 1001, enDias(-9), '12:00', '17:00', 12, 'Devuelto', 'Sin novedades'),
    ],
  };
}

function villa() {
  return {
    visitantes: [], invitaciones: [], registro_accesos: [], vehiculos: [],
    reservas: [
      reserva(201, 21, 2026, 2026, enDias(3), '10:00', '14:00', 30),
      reserva(202, 22, 2077, 2077, enDias(1), '18:00', '20:00', 10),
    ],
  };
}

export function conserjeriaInicial() {
  return { 1: lasPalmas(), 2: villa(), 3: edificio() };
}

export const conserjeriaVacia = () => ({ visitantes: [], invitaciones: [], registro_accesos: [], vehiculos: [], reservas: [] });
