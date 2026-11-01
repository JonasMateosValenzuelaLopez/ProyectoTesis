// Datos de ejemplo de finanzas con las filas de la base (bd/entrecasas_db_v2.sql):
// categorias_cobro, cobros, gastos_comunes (lo que debe cada unidad por cada cobro), pagos,
// exenciones, egresos y correos_enviados. Los comunicados y normas están en muroMock; la bitácora se ajusta en su módulo.
import { comunidades } from './mock';

const NOMBRES = [
  'Juan Pérez', 'Rosa Díaz', 'Pedro Gómez', 'Camila Soto', 'Gabriel Ortiz', 'Ana Rojas', 'Diego Fuentes',
  'Valentina Castro', 'Rodrigo Pizarro', 'Carolina Vera', 'Matías Contreras', 'Francisca Lagos', 'Andrés Bravo',
  'Mónica Sáez', 'Tomás Herrera', 'Daniela Pino', 'Felipe Navarro', 'Javiera Cortés', 'Ricardo Molina',
  'Isidora Tapia', 'Sebastián Araya', 'Catalina Núñez', 'Cristóbal Vargas', 'Fernanda Espinoza',
];

// Residente principal de cada unidad (sale de la tabla residencias)
// Las unidades de la directiva tienen nombres fijos para que calcen con el directorio.
export const residentes = {
  ...Object.fromEntries(
    comunidades.flatMap((c) => c.unidades.map((u, i) => [u.id_unidad, NOMBRES[(i * 5 + c.id_red) % NOMBRES.length]]))
  ),
  1002: 'Andrea Lagos', 1005: 'Luis Muñoz', 1011: 'Marta Rivas',
  2012: 'Sonia Fuentealba', 2040: 'Jorge Silva', 2077: 'Paula Reyes',
};

// Mes en curso de la demo. Los meses anteriores con gastos sin pagar quedan Atrasado.
export const PERIODO_ACTUAL = { mes: 10, anio: 2026 };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (mes) => MESES[mes - 1];

const dosDigitos = (n) => String(n).padStart(2, '0');
// Emisión el día 1 y vencimiento el 5 del mes siguiente
const fechasDe = (mes, anio) => ({
  fecha_emision: `${anio}-${dosDigitos(mes)}-01`,
  fecha_vencimiento: mes === 12 ? `${anio + 1}-01-05` : `${anio}-${dosDigitos(mes + 1)}-05`,
});

// Arma las filas de una comunidad. `cobros` lleva, además de sus columnas, a quién se le
// debe (`debe`), quién está exento (`exentas`) y quién avisó una transferencia sin validar
// (`avisos`); con eso se generan `gastos_comunes` y `pagos` como los tendría la base.
function armar(id_red, unidades, { categorias, cobros, validador, avisos = [], exenciones = [], egresos = [], correos = [] }) {
  const categorias_cobro = categorias.map(([id_categoria, nombre, activa = 1]) => ({ id_categoria, id_red, nombre, activa }));
  const filasCobros = [];
  const gastos_comunes = [];
  const pagos = [];
  cobros.forEach(({ debe = [], exentas = [], ...c }, i) => {
    const cobro = { id_cobro: id_red * 100 + i + 1, id_red, ...fechasDe(c.mes, c.anio), es_extraordinario: 0, id_usuario_emite: validador, ...c };
    filasCobros.push(cobro);
    const vencido = cobro.mes < PERIODO_ACTUAL.mes || cobro.anio < PERIODO_ACTUAL.anio;
    unidades.forEach((u) => {
      // Ids fijos para que el panel y la app usen los mismos: id_cobro × 1000 + número de la unidad
      const id_gasto = cobro.id_cobro * 1000 + (u.id_unidad % 1000);
      const estado_pago = exentas.includes(u.id_unidad) ? 'Exento' : debe.includes(u.id_unidad) ? (vencido ? 'Atrasado' : 'Pendiente') : 'Pagado';
      gastos_comunes.push({
        id_gasto, id_cobro: cobro.id_cobro, id_unidad: u.id_unidad, mes: cobro.mes, anio: cobro.anio, monto_total: cobro.monto_por_unidad,
        fecha_emision: cobro.fecha_emision, fecha_vencimiento: cobro.fecha_vencimiento, estado_pago, descripcion: cobro.concepto,
      });
      if (estado_pago === 'Pagado') {
        // Pago registrado en el panel: nace Validado y sin residente que lo avisara
        const fecha = `${cobro.fecha_emision.slice(0, 8)}${dosDigitos(Number(cobro.fecha_emision.slice(8)) + 1 + (u.id_unidad % 6))}T10:30:00`;
        pagos.push({
          id_pago: id_gasto * 10 + 1, id_gasto, id_usuario: null, monto_pagado: cobro.monto_por_unidad, fecha_pago: fecha, metodo_pago: 'Transferencia',
          comprobante_url: null, observacion: null, estado_validacion: 'Validado', id_validador: validador, fecha_validacion: fecha,
        });
      }
    });
  });
  // Transferencias que el residente avisó desde la app y esperan validación
  avisos.forEach(({ id_unidad, id_usuario, fecha_pago, observacion }) => {
    gastos_comunes
      .filter((g) => g.id_unidad === id_unidad && g.mes === PERIODO_ACTUAL.mes && g.anio === PERIODO_ACTUAL.anio && g.estado_pago === 'Pendiente')
      .forEach((g) => {
        pagos.push({
          id_pago: g.id_gasto * 10 + 2, id_gasto: g.id_gasto, id_usuario, monto_pagado: g.monto_total, fecha_pago, metodo_pago: 'Transferencia',
          comprobante_url: `comprobantes/${id_unidad}-${fecha_pago.slice(0, 10)}.jpg`, observacion,
          estado_validacion: 'Pendiente', id_validador: null, fecha_validacion: null,
        });
      });
  });
  const gastoDe = (id_cobro, id_unidad) => gastos_comunes.find((g) => g.id_cobro === id_cobro && g.id_unidad === id_unidad).id_gasto;
  return {
    categorias_cobro,
    cobros: filasCobros,
    gastos_comunes,
    pagos,
    exenciones: exenciones.map(([id_exencion, id_cobro, id_unidad, motivo, id_solicitante, fecha_solicitud, estado = 'Pendiente', id_resuelve = null, fecha_resolucion = null]) => ({
      id_exencion, id_gasto: gastoDe(id_cobro, id_unidad), motivo, id_solicitante, fecha_solicitud, estado, id_resuelve, fecha_resolucion,
    })),
    egresos: egresos.map((e) => ({
      id_red, id_categoria: null, proveedor: null, id_usuario_registra: validador, requiere_visado: 0, estado_visado: null,
      id_visador: null, fecha_visado: null, comprobante_url: null, ...e,
    })),
    correos_enviados: correos.map(([id_correo, tipo, asunto, id_cobro, fecha_envio, extra]) => ({
      id_correo, id_red, tipo, asunto, id_cobro, id_votacion: null, destinatarios: unidades.length, id_usuario_envia: validador, fecha_envio, ...extra,
    })),
  };
}

const porUnidad = (unidades, cada, resto) => unidades.filter((_, i) => i % cada === resto).map((u) => u.id_unidad);

function lasPalmas(c) {
  const octubre = [1003, 1005, 1007, 1009, 1012, 1014];
  const mes = (m, extra = {}) => [
    { id_categoria: 1, concepto: `Gasto común ${nombreMes(m)}`, monto_por_unidad: 68400, mes: m, anio: 2026, ...extra.gc },
    { id_categoria: 2, concepto: `Fondo de reserva ${nombreMes(m)}`, monto_por_unidad: 8000, mes: m, anio: 2026, ...extra.fr },
  ];
  return armar(1, c.unidades, {
    // Ids de usuario: 101 Carlos Ibáñez (administrador), 102 Luis Muñoz (presidente),
    // 103 Marta Rivas (tesorera), 104 Andrea Lagos (secretaria)
    validador: 101,
    categorias: [[1, 'Gasto común'], [2, 'Fondo de reserva'], [3, 'Mantención'], [4, 'Multas', 0]],
    cobros: [
      ...mes(8, { gc: { debe: [1003, 1014] }, fr: { debe: [1003, 1014] } }),
      ...mes(9, { gc: { debe: [1003, 1009, 1012], exentas: [1013] }, fr: { debe: [1003, 1009] } }),
      ...mes(10, { gc: { debe: octubre }, fr: { debe: octubre } }),
      { id_categoria: 3, concepto: 'Mantención portón eléctrico', monto_por_unidad: 28000, mes: 10, anio: 2026, fecha_emision: '2026-10-12', es_extraordinario: 1, debe: octubre },
    ],
    // Luis Muñoz avisó desde la app que transfirió lo de octubre
    avisos: [{ id_unidad: 1005, id_usuario: 102, fecha_pago: '2026-10-26T20:14:00', observacion: 'Transferencia desde Banco Estado' }],
    exenciones: [
      [1, 107, 1007, 'Unidad deshabitada por remodelación hasta diciembre', 103, '2026-10-22T11:00:00'],
      [2, 103, 1013, 'Adulto mayor con pensión básica solidaria (septiembre)', 104, '2026-09-04T09:30:00', 'Aprobada', 102, '2026-09-06T18:00:00'],
    ],
    egresos: [
      { id_egreso: 101, id_categoria: 3, descripcion: 'Reparación motor del portón eléctrico', proveedor: 'Automatismos Sur SpA', monto: 420000, fecha: '2026-10-20', requiere_visado: 1, estado_visado: 'Pendiente' },
      { id_egreso: 102, id_categoria: 1, descripcion: 'Aseo áreas comunes octubre', proveedor: 'Limpiezas del Sur Ltda.', monto: 380000, fecha: '2026-10-05' },
      { id_egreso: 103, id_categoria: 1, descripcion: 'Consumo eléctrico áreas comunes', proveedor: 'Frontel', monto: 142300, fecha: '2026-10-08' },
      { id_egreso: 104, id_categoria: 3, descripcion: 'Poda de árboles del pasaje', proveedor: 'Jardines del Sur', monto: 260000, fecha: '2026-09-18', requiere_visado: 1, estado_visado: 'Aprobado', id_visador: 102, fecha_visado: '2026-09-17T19:20:00' },
    ],
    // Correos que mandó el sistema al emitir los cobros de octubre
    correos: [
      [101, 'Nuevo cobro', 'Gasto común octubre', 105, '2026-10-01T08:00:00'],
      [102, 'Nuevo cobro', 'Fondo de reserva octubre', 106, '2026-10-01T08:00:00'],
      [103, 'Nuevo cobro', 'Mantención portón eléctrico', 107, '2026-10-12T09:14:00'],
      // P6: recordatorios de votación que envió Secretaría (104) a las casas que no habían votado
      [104, 'Recordatorio de votación', 'Poda de árboles del pasaje', null, '2026-09-19T19:00:00', { id_votacion: 103, destinatarios: 8, id_usuario_envia: 104 }],
      [105, 'Recordatorio de votación', 'Poda de árboles del pasaje', null, '2026-09-23T19:00:00', { id_votacion: 103, destinatarios: 4, id_usuario_envia: 104 }],
      [106, 'Recordatorio de votación', 'Cambio de empresa de seguridad', null, '2026-10-24T19:00:00', { id_votacion: 101, destinatarios: 7, id_usuario_envia: 104 }],
    ],
  });
}

function losCopihues(c) {
  const octubre = porUnidad(c.unidades, 3, 2);
  const atrasadas = [2015, 2033, 2058];
  const cuota = (m, debe) => ({ id_categoria: 21, concepto: `Cuota social ${nombreMes(m)}`, monto_por_unidad: 5000, mes: m, anio: 2026, debe });
  return armar(2, c.unidades, {
    // 105 Sonia Fuentealba (presidenta), 106 Jorge Silva (tesorero)
    validador: 106,
    categorias: [[21, 'Cuota social'], [22, 'Seguridad']],
    cobros: [cuota(8, atrasadas.slice(0, 1)), cuota(9, atrasadas), cuota(10, octubre)],
    exenciones: [[21, 203, 2042, 'Adulto mayor que vive sola', 106, '2026-10-21T10:00:00']],
    egresos: [
      { id_egreso: 201, id_categoria: 22, descripcion: 'Reparación del portón de acceso', proveedor: 'Herrería Don Raúl', monto: 380000, fecha: '2026-10-23', requiere_visado: 1, estado_visado: 'Pendiente' },
    ],
  });
}

function torreAndes(c) {
  const octubre = porUnidad(c.unidades, 7, 2);
  const mes = (m, debe) => [
    { id_categoria: 31, concepto: `Gasto común ${nombreMes(m)}`, monto_por_unidad: 95000, mes: m, anio: 2026, debe },
    { id_categoria: 32, concepto: `Fondo de reserva ${nombreMes(m)}`, monto_por_unidad: 10000, mes: m, anio: 2026, debe },
  ];
  // 3603 debe agosto y septiembre: $210.000
  return armar(3, c.unidades, {
    // 107 Patricia Olave (administradora)
    validador: 107,
    categorias: [[31, 'Gasto común'], [32, 'Fondo de reserva']],
    cobros: [...mes(8, [3603]), ...mes(9, [3603]), ...mes(10, octubre)],
  });
}

export function finanzasIniciales() {
  const red = (id) => comunidades.find((c) => c.id_red === id);
  return { 1: lasPalmas(red(1)), 2: losCopihues(red(2)), 3: torreAndes(red(3)) };
}

// Filas de `bitacora`: quién hizo qué en cada comunidad. El cargo no se guarda: la API lo saca de
// `membresias` (el Presidente audita las acciones de Administración).
const bitacora = (id_bitacora, id_red, id_usuario, accion, detalle, fecha) => ({ id_bitacora, id_red, id_usuario, accion, detalle, fecha });
export const bitacoraInicial = {
  1: [
    bitacora(101, 1, 101, 'Ocultó una publicación', '«Vendo entradas para el concierto del sábado.» de Casa 9', '2026-10-25T18:42:00'),
    bitacora(102, 1, 101, 'Registró un egreso', 'Reparación motor del portón eléctrico · $420.000 · enviado a visado', '2026-10-24T11:05:00'),
    bitacora(103, 1, 101, 'Asignó un cargo', 'Marta Rivas como Tesorera desde el 22 de octubre', '2026-10-22T16:20:00'),
    bitacora(104, 1, 101, 'Desactivó un usuario', 'Ex arrendatario de Casa 6', '2026-10-20T09:31:00'),
    bitacora(105, 1, 101, 'Cambió los módulos', 'Activó Invitaciones QR', '2026-10-18T10:12:00'),
    bitacora(107, 1, 101, 'Creó un cobro', 'Mantención portón eléctrico · $28.000 por unidad · aviso a 15 unidades', '2026-10-12T09:14:00'),
    bitacora(106, 1, 101, 'Marcó un pago', 'Casa 4 · Gasto común octubre', '2026-10-05T12:48:00'),
    bitacora(108, 1, 101, 'Creó un cobro', 'Gasto común y fondo de reserva octubre · aviso a 15 unidades', '2026-10-01T08:00:00'),
  ],
  2: [],
  3: [],
};

// Una comunidad recién creada desde la plataforma parte con las dos categorías básicas y sin movimientos
export const finanzasVacia = (id_red) => ({
  categorias_cobro: [
    { id_categoria: id_red * 100 + 1, id_red, nombre: 'Gasto común', activa: 1 },
    { id_categoria: id_red * 100 + 2, id_red, nombre: 'Fondo de reserva', activa: 1 },
  ],
  cobros: [], gastos_comunes: [], pagos: [], exenciones: [], egresos: [], correos_enviados: [],
});
