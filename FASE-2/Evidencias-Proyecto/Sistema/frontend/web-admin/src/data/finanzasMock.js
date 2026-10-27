// Datos de ejemplo de finanzas y directiva, con la forma del modelo propuesto:
// categorias_gasto, cobros, cobro_unidades, exenciones, egresos, notificaciones_enviadas,
// muro_publicaciones (por aprobar) y bitacora_auditoria.
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
    comunidades.flatMap((c) => c.unidades.map((u, i) => [u.id, NOMBRES[(i * 5 + c.id) % NOMBRES.length]]))
  ),
  c2: 'Andrea Lagos', c5: 'Luis Muñoz', c11: 'Marta Rivas',
  vA12: 'Sonia Fuentealba', vB16: 'Jorge Silva', vD5: 'Paula Reyes',
};

const PERIODO = '2026-10';
const EMISION = '2026-10-01';
const VENCE = '2026-11-05';

function cobroUnidades(unidades, pendientes) {
  return Object.fromEntries(
    unidades.map((u) => [
      u.id,
      pendientes.includes(u.id)
        ? { estado: 'pendiente' }
        : { estado: 'pagado', marcadoPor: 'Carlos Ibáñez · Administrador', marcadoEn: '2026-10-0' + (3 + (u.numero.length % 6)) + 'T10:30:00' },
    ])
  );
}

function lasPalmas(c) {
  const pendientes = ['c3', 'c5', 'c7', 'c9', 'c12', 'c14'];
  return {
    periodoActual: PERIODO,
    nombrePeriodo: 'Octubre 2026',
    categorias: [
      { id: 'cat1', nombre: 'Gasto común', activa: true },
      { id: 'cat2', nombre: 'Fondo de reserva', activa: true },
      { id: 'cat3', nombre: 'Mantención', activa: true },
      { id: 'cat4', nombre: 'Multas', activa: false },
    ],
    cobros: [
      { id: 'cb0', idCategoria: 'cat1', concepto: 'Gasto común septiembre', montoPorUnidad: 68400, periodo: '2026-09', emision: '2026-09-01', vencimiento: '2026-10-05', extraordinario: false },
      { id: 'cb1', idCategoria: 'cat1', concepto: 'Gasto común octubre', montoPorUnidad: 68400, periodo: PERIODO, emision: EMISION, vencimiento: VENCE, extraordinario: false },
      { id: 'cb2', idCategoria: 'cat2', concepto: 'Fondo de reserva octubre', montoPorUnidad: 8000, periodo: PERIODO, emision: EMISION, vencimiento: VENCE, extraordinario: false },
      { id: 'cb3', idCategoria: 'cat3', concepto: 'Mantención portón eléctrico', montoPorUnidad: 28000, periodo: PERIODO, emision: '2026-10-12', vencimiento: VENCE, extraordinario: true },
    ],
    cobroUnidades: {
      cb0: { ...cobroUnidades(c.unidades, ['c3', 'c9']), c13: { estado: 'exento' } },
      cb1: cobroUnidades(c.unidades, pendientes),
      cb2: cobroUnidades(c.unidades, pendientes),
      cb3: cobroUnidades(c.unidades, pendientes),
    },
    // Deuda de meses anteriores (suma $350.000 en 4 unidades)
    deudaAnterior: { c3: 104400, c9: 104400, c12: 68400, c14: 72800 },
    exenciones: [
      { id: 'ex1', idCobro: 'cb3', idUnidad: 'c7', motivo: 'Unidad deshabitada por remodelación hasta diciembre', solicitadaPor: 'Marta Rivas', fecha: '2026-10-22', estado: 'pendiente' },
      { id: 'ex0', idCobro: 'cb0', idUnidad: 'c13', motivo: 'Adulto mayor con pensión básica solidaria (septiembre)', solicitadaPor: 'Andrea Lagos', fecha: '2026-09-04', estado: 'aprobada', resueltaPor: 'Luis Muñoz', resueltaEn: '2026-09-06' },
    ],
    egresos: [
      { id: 'eg1', descripcion: 'Reparación motor del portón eléctrico', categoria: 'Mantención', monto: 420000, fecha: '2026-10-20', solicitadoPor: 'Administración', requiereVisado: true, estadoVisado: 'pendiente', proveedor: 'Automatismos Sur SpA' },
      { id: 'eg2', descripcion: 'Aseo áreas comunes octubre', categoria: 'Gasto común', monto: 380000, fecha: '2026-10-05', solicitadoPor: 'Administración', requiereVisado: false },
      { id: 'eg3', descripcion: 'Consumo eléctrico áreas comunes', categoria: 'Gasto común', monto: 142300, fecha: '2026-10-08', solicitadoPor: 'Administración', requiereVisado: false },
      { id: 'eg4', descripcion: 'Poda de árboles del pasaje', categoria: 'Mantención', monto: 260000, fecha: '2026-09-18', solicitadoPor: 'Administración', requiereVisado: true, estadoVisado: 'aprobado', visadoPor: 'Luis Muñoz' },
    ],
    umbralVisado: 300000,
    fondoReserva: { saldo: 3200000, meta: 4000000 },
    notificaciones: [
      { id: 'n1', tipo: 'cobro', detalle: 'Mantención portón eléctrico', destinatarios: 15, fecha: '2026-10-12T09:14:00' },
      { id: 'n2', tipo: 'cobro', detalle: 'Gasto común y fondo de reserva octubre', destinatarios: 15, fecha: '2026-10-01T08:00:00' },
    ],
    porAprobar: [
      { id: 'pa1', tipo: 'Comunicado', titulo: 'Corte de agua programado el sábado 31', autor: 'Secretaría', fecha: '2026-10-25', texto: 'Aguas Andinas realizará trabajos en la matriz. El sábado 31 de octubre no habrá agua entre 9:00 y 15:00. Les recomendamos guardar agua el viernes.', estado: 'pendiente' },
      { id: 'pa2', tipo: 'Norma', titulo: 'Horario de uso del quincho', autor: 'Secretaría', fecha: '2026-10-24', texto: 'El quincho se podrá usar de domingo a jueves hasta las 23:00 y viernes y sábado hasta la 01:00. Cada reserva debe dejar el espacio limpio para la entrega en conserjería.', estado: 'pendiente' },
      { id: 'pa0', tipo: 'Comunicado', titulo: 'Poda de árboles del pasaje', autor: 'Secretaría', fecha: '2026-10-09', texto: 'El martes 14 se podarán los árboles del pasaje entre 9:00 y 13:00. Por favor no estacionar bajo los árboles ese día.', estado: 'aprobada' },
      { id: 'pn0', tipo: 'Norma', titulo: 'Tenencia responsable de mascotas', autor: 'Secretaría', fecha: '2026-08-02', texto: 'Las mascotas deben circular con correa por el pasaje y sus dueños deben recoger los desechos. Los reclamos se registran en el muro.', estado: 'aprobada' },
    ],
  };
}

function generico(c, { categorias, montos, pendientesCada, deuda = {} }) {
  const pendientes = c.unidades.filter((_, i) => i % pendientesCada === 2).map((u) => u.id);
  const cobros = montos.map(([concepto, idCategoria, monto], i) => ({
    id: `cb${c.id}${i}`, idCategoria, concepto, montoPorUnidad: monto, periodo: PERIODO, emision: EMISION, vencimiento: VENCE, extraordinario: false,
  }));
  return {
    periodoActual: PERIODO,
    nombrePeriodo: 'Octubre 2026',
    categorias,
    cobros,
    cobroUnidades: Object.fromEntries(cobros.map((cb) => [cb.id, cobroUnidades(c.unidades, pendientes)])),
    deudaAnterior: deuda,
    exenciones: [],
    egresos: [],
    umbralVisado: 300000,
    fondoReserva: null,
    notificaciones: [],
    porAprobar: [],
  };
}

export function finanzasIniciales() {
  return {
    1: lasPalmas(comunidades.find((c) => c.id === 1)),
    2: {
      ...generico(comunidades.find((c) => c.id === 2), {
        categorias: [{ id: 'v1', nombre: 'Cuota social', activa: true }, { id: 'v2', nombre: 'Seguridad', activa: true }],
        montos: [['Cuota social octubre', 'v1', 5000]],
        pendientesCada: 3,
      }),
      egresos: [
        { id: 'veg1', descripcion: 'Reparación del portón de acceso', categoria: 'Seguridad', monto: 380000, fecha: '2026-10-23', solicitadoPor: 'Tesorería', requiereVisado: true, estadoVisado: 'pendiente', proveedor: 'Herrería Don Raúl' },
      ],
      exenciones: [
        { id: 'vex1', idCobro: 'cb20', idUnidad: 'vB17', motivo: 'Adulto mayor que vive sola', solicitadaPor: 'Tesorería', fecha: '2026-10-21', estado: 'pendiente' },
      ],
      porAprobar: [
        { id: 'vpa1', tipo: 'Comunicado', titulo: 'Corte de agua el sábado', autor: 'Secretaría', fecha: '2026-10-25', texto: 'El sábado 31 no habrá agua entre 9:00 y 15:00 por trabajos en la matriz.', estado: 'pendiente' },
      ],
    },
    3: generico(comunidades.find((c) => c.id === 3), {
      categorias: [{ id: 'e1', nombre: 'Gasto común', activa: true }, { id: 'e2', nombre: 'Fondo de reserva', activa: true }],
      montos: [['Gasto común octubre', 'e1', 95000], ['Fondo de reserva octubre', 'e2', 10000]],
      pendientesCada: 7,
      deuda: { d603: 210000 },
    }),
  };
}

// Acciones del administrador que audita el Presidente (bitacora_auditoria)
export const bitacoraInicial = {
  1: [
    { id: 'b1', fecha: '2026-10-25T18:42:00', usuario: 'Carlos Ibáñez', cargo: 'administrador', accion: 'Eliminó una publicación del muro', detalle: '«Vendo entradas» de Casa 9, por infringir la norma de comercio en el muro' },
    { id: 'b2', fecha: '2026-10-24T11:05:00', usuario: 'Carlos Ibáñez', cargo: 'administrador', accion: 'Registró un egreso', detalle: 'Reparación motor del portón eléctrico · $420.000 · enviado a visado' },
    { id: 'b3', fecha: '2026-10-22T16:20:00', usuario: 'Carlos Ibáñez', cargo: 'administrador', accion: 'Asignó un cargo', detalle: 'Marta Rivas como Tesorera desde el 22 de octubre' },
    { id: 'b4', fecha: '2026-10-20T09:31:00', usuario: 'Carlos Ibáñez', cargo: 'administrador', accion: 'Desactivó un usuario', detalle: 'Ex arrendatario de Casa 6' },
    { id: 'b5', fecha: '2026-10-18T10:12:00', usuario: 'Carlos Ibáñez', cargo: 'administrador', accion: 'Cambió los módulos', detalle: 'Activó Invitaciones QR' },
    { id: 'b6', fecha: '2026-10-05T12:48:00', usuario: 'Carlos Ibáñez', cargo: 'administrador', accion: 'Marcó un pago', detalle: 'Casa 4 · Gasto común octubre' },
  ],
  2: [],
  3: [],
};

// Una comunidad recién creada desde la plataforma parte sin cobros ni movimientos
export const finanzasVacia = () => ({
  periodoActual: PERIODO, nombrePeriodo: 'Octubre 2026',
  categorias: [{ id: 'g1', nombre: 'Gasto común', activa: true }, { id: 'g2', nombre: 'Fondo de reserva', activa: true }],
  cobros: [], cobroUnidades: {}, deudaAnterior: {}, exenciones: [], egresos: [],
  umbralVisado: 300000, fondoReserva: null, notificaciones: [], porAprobar: [],
});
