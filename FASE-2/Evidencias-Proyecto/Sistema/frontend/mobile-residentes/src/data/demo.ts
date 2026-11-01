// Datos de ejemplo de la app de residentes. Cada objeto es una fila de la base
// (bd/entrecasas_db_v2.sql) con sus columnas tal cual; las listas anidadas son lo que
// devolverá la API al pedir una comunidad o un usuario.
// Calzan con los del panel web: mismas comunidades, ids de unidad, vecinos, cobros y códigos QR.
// Ids de unidad: id_red × 1000 + número (Casa 5 de Las Palmas = 1005, Depto 603 = 3603).

// Valores del enum `red_modulos.modulo`
export type Modulo = 'muro' | 'marketplace' | 'votaciones' | 'reservas' | 'cobros' | 'invitaciones_qr' | 'conserjeria' | 'administrador_externo';
export type TipoComunidad = 'Edificio' | 'Condominio' | 'Villa';

// Fila de `espacios_comunes` con sus `espacios_bloques` (horarios que se pueden reservar). Las reglas van en `descripcion`.
export type Bloque = { id_bloque: number; id_espacio: number; hora_inicio: string; hora_fin: string };
export type EspacioComun = {
  id_espacio: number; id_red: number; nombre: string; descripcion: string | null; capacidad: number | null; estado: 0 | 1;
  espacios_bloques: Bloque[];
};

// Fila de `redes_vecinales`, con sus módulos y espacios comunes. Los contactos van en su tabla (CONTACTOS).
export type Comunidad = {
  id_red: number; nombre: string; tipo: TipoComunidad; direccion: string;
  banco: string | null; tipo_cuenta: string | null; numero_cuenta: string | null; titular_cuenta: string | null; rut_titular: string | null; correo_pagos: string | null;
  red_modulos: { modulo: Modulo; activo: 0 | 1 }[];
  espacios_comunes: EspacioComun[];
};

// Fila de `unidades`. El tipo (Casa o Departamento) sale del tipo de comunidad.
export type Unidad = { id_unidad: number; id_red: number; numero_identificador: string; calle_pasaje: string | null };
export type Residencia = {
  id_residencia: number; id_usuario: number; id_unidad: number; relacion: 'Propietario' | 'Arrendatario';
  estado: 'Pendiente' | 'Activa' | 'Rechazada' | 'Inactiva';
};
// Tabla `roles`: 1 Administración, 2 Tesorero, 3 Secretario, 4 Presidente, 5 Conserje, 6 Residente, 7 Visitante, 8 Plataforma
export type Cargo = 'administrador' | 'tesorero' | 'secretario' | 'presidente' | 'conserje';
export const ROLES: Record<number, Cargo> = { 1: 'administrador', 2: 'tesorero', 3: 'secretario', 4: 'presidente', 5: 'conserje' };
export type Membresia = {
  id_membresia: number; id_usuario: number; id_red: number | null; id_rol: number;
  fecha_desde: string; fecha_hasta: string | null; estado: 'Vigente' | 'Terminada';
};

// Fila de `usuarios` con sus residencias y membresías. `flujo` es solo para la lista de cuentas de prueba.
export type Cuenta = {
  id_usuario: number; rut: string; nombre: string; apellido_paterno: string; apellido_materno: string | null;
  correo: string; telefono: string | null; estado: 'Activo' | 'Invitado' | 'Desactivado';
  residencias: Residencia[]; membresias: Membresia[]; flujo: string;
};

export const CLAVE_PRUEBA = 'EntreCasas2026';
export const CODIGO_PRUEBA = '246810';

const BLOQUES_QUINCHO: [string, string][] = [['12:00', '17:00'], ['18:00', '23:30']];
const BLOQUES_SALA: [string, string][] = [['10:00', '13:00'], ['15:00', '18:00'], ['18:00', '22:00']];
// Ids iguales al panel: id_red × 10 + n para el espacio y id_espacio × 10 + n para el bloque
const espacio = (id_red: number, n: number, nombre: string, capacidad: number, descripcion: string, bloques: [string, string][]): EspacioComun => {
  const id_espacio = id_red * 10 + n;
  return {
    id_espacio, id_red, nombre, descripcion, capacidad, estado: 1,
    espacios_bloques: bloques.map(([inicio, fin], i) => ({ id_bloque: id_espacio * 10 + i + 1, id_espacio, hora_inicio: `${inicio}:00`, hora_fin: `${fin}:00` })),
  };
};
const modulos = (...m: Modulo[]) => m.map((modulo) => ({ modulo, activo: 1 as const }));

export const COMUNIDADES: Comunidad[] = [
  {
    id_red: 1, nombre: 'Condominio Las Palmas', tipo: 'Condominio', direccion: 'Pasaje Los Aromos 1450, Temuco',
    banco: 'Banco Estado', tipo_cuenta: 'Cuenta corriente', numero_cuenta: '62900145872', titular_cuenta: 'Comunidad Condominio Las Palmas', rut_titular: '65.142.380-6', correo_pagos: 'pagos@laspalmas.cl',
    red_modulos: modulos('muro', 'marketplace', 'votaciones', 'reservas', 'cobros', 'invitaciones_qr', 'administrador_externo'),
    espacios_comunes: [espacio(1, 1, 'Quincho', 25, 'Se entrega limpio. Viernes y sábado hasta la 01:00.', BLOQUES_QUINCHO)],
  },
  {
    id_red: 2, nombre: 'Villa Los Copihues', tipo: 'Villa', direccion: 'Calle Los Copihues s/n, Padre Las Casas',
    banco: 'Banco Estado', tipo_cuenta: 'Cuenta de ahorro', numero_cuenta: '34871209', titular_cuenta: 'Junta de Vecinos Villa Los Copihues', rut_titular: '65.098.441-2', correo_pagos: 'tesoreria@loscopihues.cl',
    red_modulos: modulos('muro', 'marketplace', 'votaciones', 'reservas', 'cobros'),
    espacios_comunes: [
      espacio(2, 1, 'Sede vecinal', 60, 'Pedir la llave a la directiva el día anterior.', [['10:00', '14:00'], ['15:00', '20:00']]),
      espacio(2, 2, 'Multicancha', 20, 'Sin música después de las 22:00.', [['16:00', '18:00'], ['18:00', '20:00'], ['20:00', '22:00']]),
    ],
  },
  {
    id_red: 3, nombre: 'Edificio Torre Andes', tipo: 'Edificio', direccion: 'Av. Alemania 0890, Temuco',
    banco: 'Banco de Chile', tipo_cuenta: 'Cuenta corriente', numero_cuenta: '00-158-74123-09', titular_cuenta: 'Comunidad Edificio Torre Andes', rut_titular: '65.230.118-K', correo_pagos: 'pagos@torreandes.cl',
    red_modulos: modulos('muro', 'marketplace', 'votaciones', 'reservas', 'cobros', 'invitaciones_qr', 'conserjeria', 'administrador_externo'),
    espacios_comunes: [
      espacio(3, 1, 'Quincho', 20, 'Se retira y se devuelve en conserjería.', BLOQUES_QUINCHO),
      espacio(3, 2, 'Sala multiuso', 15, 'Se retira y se devuelve en conserjería.', BLOQUES_SALA),
      espacio(3, 3, 'Gimnasio', 4, 'Una hora por unidad al día.', [['07:00', '08:00'], ['08:00', '09:00'], ['19:00', '20:00'], ['20:00', '21:00']]),
    ],
  },
];

export const comunidadPorId = (id_red: number) => COMUNIDADES.find((c) => c.id_red === id_red);
export const tieneModulo = (c: Comunidad | null | undefined, m: Modulo) => !!c?.red_modulos.some((x) => x.modulo === m && x.activo);
export const tipoUnidad = (u: Unidad) => (comunidadPorId(u.id_red)?.tipo === 'Edificio' ? 'Departamento' : 'Casa');

// Hilera, torre o manzana de cada unidad de ejemplo (va en `calle_pasaje`)
const grupo = (id_red: number, n: number) => (
  id_red === 1 ? (n <= 7 ? 'Lado norte' : 'Lado sur') : id_red === 3 ? 'Torre A' : `Manzana ${'ABCD'[Math.floor((n - 1) / 24)]}`
);
const u = (id_red: number, numero: number): Unidad => ({ id_unidad: id_red * 1000 + numero, id_red, numero_identificador: String(numero), calle_pasaje: grupo(id_red, numero) });
export const UNIDADES: Record<number, Unidad> = Object.fromEntries([
  u(1, 1), u(1, 5), u(1, 15), u(1, 4), u(1, 7), u(1, 9), u(1, 13),
  u(3, 603), u(3, 502), u(3, 302), u(3, 404), u(3, 104),
  u(2, 27), u(2, 1), u(2, 26), u(2, 77),
].map((x) => [x.id_unidad, x]));

let siguiente = 1;
const residencia = (id_usuario: number, id_unidad: number, relacion: Residencia['relacion']): Residencia => ({
  id_residencia: siguiente++, id_usuario, id_unidad, relacion, estado: 'Activa',
});
const cuenta = (
  id_usuario: number, nombre: string, apellido_paterno: string, apellido_materno: string | null, rut: string, correo: string, telefono: string,
  viviendas: [number, Residencia['relacion']][], flujo: string, membresias: Membresia[] = [],
): Cuenta => ({
  id_usuario, rut, nombre, apellido_paterno, apellido_materno, correo, telefono, estado: 'Activo', flujo, membresias,
  residencias: viviendas.map(([id_unidad, relacion]) => residencia(id_usuario, id_unidad, relacion)),
});

// Los ids de usuario calzan con las cuentas de prueba del panel web
export const CUENTAS: Cuenta[] = [
  cuenta(110, 'Rosa', 'Díaz', 'Aguilera', '19.876.543-0', 'rosa.diaz@correo.cl', '+56961234510', [[1001, 'Propietario']], 'Casa 1, Las Palmas · al día'),
  cuenta(102, 'Luis', 'Muñoz', 'Saavedra', '15.678.234-3', 'luis.munoz@correo.cl', '+56961234502', [[1005, 'Propietario']], 'Casa 5, Las Palmas · pendiente · es Presidente',
    [{ id_membresia: 2, id_usuario: 102, id_red: 1, id_rol: 4, fecha_desde: '2026-03-01', fecha_hasta: '2028-02-28', estado: 'Vigente' }]),
  cuenta(111, 'Mónica', 'Sáez', null, '16.890.123-2', 'monica.saez@correo.cl', '+56961234603', [[3603, 'Arrendatario']], 'Depto 603, Torre Andes · con deuda'),
  cuenta(112, 'Andrés', 'Bravo', 'Leiva', '14.230.987-4', 'andres.bravo@correo.cl', '+56961234027', [[2027, 'Propietario']], 'Casa 27, Villa Los Copihues · sin QR'),
  cuenta(109, 'Usuario', 'Demo', null, '11.111.111-1', 'demo@entrecasas.cl', '+56961234509',
    [[1015, 'Propietario'], [3502, 'Arrendatario'], [2001, 'Propietario']], 'Una vivienda en cada comunidad, para cambiar entre ellas'),
];

// Cuentas que solo usan el panel web (personal sin vivienda en la comunidad)
export const SOLO_PANEL = ['12.345.678-5', '14.567.890-0', '18.234.765-5', '9.876.543-3', '16.234.567-2', '13.987.654-7', '10.456.789-4', '17.345.123-7'];

// ---------- Cobros y pagos ----------
// Filas de `cobros`, `gastos_comunes` y `pagos` (bd/entrecasas_db_v2.sql), las mismas que usa el
// panel web: mismos ids, montos y estados. La app solo lee las de la vivienda y crea pagos
// Pendiente cuando el residente avisa una transferencia.
export type Cobro = {
  id_cobro: number; id_red: number; id_categoria: number; concepto: string; monto_por_unidad: number; mes: number; anio: number;
  fecha_emision: string; fecha_vencimiento: string; es_extraordinario: 0 | 1; id_usuario_emite: number | null;
};
export type GastoComun = {
  id_gasto: number; id_cobro: number | null; id_unidad: number; mes: number; anio: number; monto_total: number;
  fecha_emision: string; fecha_vencimiento: string; estado_pago: 'Pendiente' | 'Pagado' | 'Atrasado' | 'Exento'; descripcion: string | null;
};
export type Pago = {
  id_pago: number; id_gasto: number; id_usuario: number | null; monto_pagado: number; fecha_pago: string; metodo_pago: 'Transferencia' | 'Efectivo';
  comprobante_url: string | null; observacion: string | null; estado_validacion: 'Pendiente' | 'Validado' | 'Rechazado';
  id_validador: number | null; fecha_validacion: string | null;
};

// Mes en curso de la demo. Los meses anteriores con gastos sin pagar quedan Atrasado.
export const PERIODO_ACTUAL = { mes: 10, anio: 2026 };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (mes: number) => MESES[mes - 1];
const dos = (n: number) => String(n).padStart(2, '0');

// Quien valida los pagos en cada comunidad y su nombre (con la API vendrá en un JOIN con `usuarios`)
const VALIDADOR: Record<number, number> = { 1: 101, 2: 106, 3: 107 };
export const NOMBRE_USUARIO: Record<number, string> = {
  101: 'Carlos Ibáñez · Administrador/a', 102: 'Luis Muñoz · Presidente/a', 103: 'Marta Rivas · Tesorero/a',
  106: 'Jorge Silva · Tesorero/a', 107: 'Patricia Olave · Administrador/a',
};

// Quién debe cada cobro, igual que en el panel. Las listas largas siguen la posición de la unidad.
const indiceCopihues = (id: number) => (id % 1000) - 1;
const indiceTorre = (id: number) => { const n = id % 1000; return (6 - Math.floor(n / 100)) * 4 + (n % 100) - 1; };
const LP_OCTUBRE = [1003, 1005, 1007, 1009, 1012, 1014];
type DefCobro = Pick<Cobro, 'id_categoria' | 'concepto' | 'monto_por_unidad' | 'mes'> & Partial<Pick<Cobro, 'fecha_emision' | 'es_extraordinario'>> & {
  debe: (id_unidad: number) => boolean; exentas?: number[];
};
const en = (lista: number[]) => (id: number) => lista.includes(id);
const DEF_COBROS: Record<number, DefCobro[]> = {
  1: [
    { id_categoria: 1, concepto: 'Gasto común agosto', monto_por_unidad: 68400, mes: 8, debe: en([1003, 1014]) },
    { id_categoria: 2, concepto: 'Fondo de reserva agosto', monto_por_unidad: 8000, mes: 8, debe: en([1003, 1014]) },
    { id_categoria: 1, concepto: 'Gasto común septiembre', monto_por_unidad: 68400, mes: 9, debe: en([1003, 1009, 1012]), exentas: [1013] },
    { id_categoria: 2, concepto: 'Fondo de reserva septiembre', monto_por_unidad: 8000, mes: 9, debe: en([1003, 1009]) },
    { id_categoria: 1, concepto: 'Gasto común octubre', monto_por_unidad: 68400, mes: 10, debe: en(LP_OCTUBRE) },
    { id_categoria: 2, concepto: 'Fondo de reserva octubre', monto_por_unidad: 8000, mes: 10, debe: en(LP_OCTUBRE) },
    { id_categoria: 3, concepto: 'Mantención portón eléctrico', monto_por_unidad: 28000, mes: 10, fecha_emision: '2026-10-12', es_extraordinario: 1, debe: en(LP_OCTUBRE) },
  ],
  2: [
    { id_categoria: 21, concepto: 'Cuota social agosto', monto_por_unidad: 5000, mes: 8, debe: en([2015]) },
    { id_categoria: 21, concepto: 'Cuota social septiembre', monto_por_unidad: 5000, mes: 9, debe: en([2015, 2033, 2058]) },
    { id_categoria: 21, concepto: 'Cuota social octubre', monto_por_unidad: 5000, mes: 10, debe: (id) => indiceCopihues(id) % 3 === 2 },
  ],
  3: [
    { id_categoria: 31, concepto: 'Gasto común agosto', monto_por_unidad: 95000, mes: 8, debe: en([3603]) },
    { id_categoria: 32, concepto: 'Fondo de reserva agosto', monto_por_unidad: 10000, mes: 8, debe: en([3603]) },
    { id_categoria: 31, concepto: 'Gasto común septiembre', monto_por_unidad: 95000, mes: 9, debe: en([3603]) },
    { id_categoria: 32, concepto: 'Fondo de reserva septiembre', monto_por_unidad: 10000, mes: 9, debe: en([3603]) },
    { id_categoria: 31, concepto: 'Gasto común octubre', monto_por_unidad: 95000, mes: 10, debe: (id) => indiceTorre(id) % 7 === 2 },
    { id_categoria: 32, concepto: 'Fondo de reserva octubre', monto_por_unidad: 10000, mes: 10, debe: (id) => indiceTorre(id) % 7 === 2 },
  ],
};

export const COBROS: Cobro[] = Object.entries(DEF_COBROS).flatMap(([red, lista]) => lista.map(({ debe: _d, exentas: _e, ...c }, i) => {
  const id_red = Number(red);
  return {
    id_cobro: id_red * 100 + i + 1, id_red, anio: 2026, es_extraordinario: 0 as const, id_usuario_emite: VALIDADOR[id_red],
    fecha_emision: `2026-${dos(c.mes)}-01`, fecha_vencimiento: `2026-${dos(c.mes + 1)}-05`, ...c,
  };
}));

// Filas de `gastos_comunes` y `pagos` de las viviendas de la demo. Ids fijos, como en el panel:
// id_gasto = id_cobro × 1000 + número de la unidad; el pago validado es id_gasto × 10 + 1.
export function cuentasIniciales(): { gastos_comunes: GastoComun[]; pagos: Pago[] } {
  const gastos_comunes: GastoComun[] = [];
  const pagos: Pago[] = [];
  Object.values(UNIDADES).forEach((u) => {
    DEF_COBROS[u.id_red].forEach((def, i) => {
      const c = COBROS.find((x) => x.id_cobro === u.id_red * 100 + i + 1)!;
      const id_gasto = c.id_cobro * 1000 + (u.id_unidad % 1000);
      const vencido = c.mes < PERIODO_ACTUAL.mes;
      const estado_pago = def.exentas?.includes(u.id_unidad) ? 'Exento' : def.debe(u.id_unidad) ? (vencido ? 'Atrasado' : 'Pendiente') : 'Pagado';
      gastos_comunes.push({
        id_gasto, id_cobro: c.id_cobro, id_unidad: u.id_unidad, mes: c.mes, anio: c.anio, monto_total: c.monto_por_unidad,
        fecha_emision: c.fecha_emision, fecha_vencimiento: c.fecha_vencimiento, estado_pago, descripcion: c.concepto,
      });
      if (estado_pago === 'Pagado') {
        const fecha = `${c.fecha_emision.slice(0, 8)}${dos(Number(c.fecha_emision.slice(8)) + 1 + (u.id_unidad % 6))}T10:30:00`;
        pagos.push({
          id_pago: id_gasto * 10 + 1, id_gasto, id_usuario: null, monto_pagado: c.monto_por_unidad, fecha_pago: fecha, metodo_pago: 'Transferencia',
          comprobante_url: null, observacion: null, estado_validacion: 'Validado', id_validador: VALIDADOR[u.id_red], fecha_validacion: fecha,
        });
      }
    });
  });
  // Luis Muñoz (Casa 5) ya avisó que transfirió octubre; el panel lo ve por validar
  gastos_comunes.filter((g) => g.id_unidad === 1005 && g.estado_pago === 'Pendiente').forEach((g) => {
    pagos.push({
      id_pago: g.id_gasto * 10 + 2, id_gasto: g.id_gasto, id_usuario: 102, monto_pagado: g.monto_total, fecha_pago: '2026-10-26T20:14:00', metodo_pago: 'Transferencia',
      comprobante_url: `comprobantes/1005-2026-10-26.jpg`, observacion: 'Transferencia desde Banco Estado', estado_validacion: 'Pendiente', id_validador: null, fecha_validacion: null,
    });
  });
  return { gastos_comunes, pagos };
}

// ---------- Portería: visitantes, invitaciones QR y registro de accesos ----------
// Filas de `visitantes`, `invitaciones` y `registro_accesos`, las mismas que usa la garita del panel.
export type Visitante = { id_visitante: number; rut: string | null; nombre: string; apellido: string; tipo: 'Frecuente' | 'Esporádico' };
export type Invitacion = {
  id_invitacion: number; codigo: string; id_unidad: number; id_usuario: number; id_visitante: number; tipo: 'Visita' | 'Proveedor' | 'Servicio';
  fecha_desde: string; fecha_hasta: string; patente: string | null; estado: 'Esperada' | 'Adentro' | 'Salió' | 'Cancelada'; fecha_creacion: string;
};
// Una visita en la garita. Sin invitación nace «Pendiente de Confirmación» y el residente responde en la app
// (o la garita le escribe por WhatsApp o le llama: `autorizado_via` = 'Teléfono').
export type RegistroAcceso = {
  id_acceso: number; id_visitante: number; id_unidad: number; id_invitacion: number | null; categoria: 'Visita' | 'Delivery' | 'Proveedor' | 'Servicio';
  patente: string | null; metodo: 'QR' | 'Manual'; fecha_ingreso: string; fecha_salida: string | null;
  estado_autorizacion: 'Aprobado' | 'Rechazado' | 'Pendiente de Confirmación'; autorizado_via: 'Invitación' | 'App' | 'Teléfono' | null;
  id_usuario_autoriza: number | null; id_usuario_registra: number | null; codigo_qr_validado: 0 | 1;
};
const pad2 = (n: number) => String(n).padStart(2, '0');
// DATETIME local, como lo guarda MariaDB
export const fechaHoraLocal = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const haceMin = (min: number) => fechaHoraLocal(new Date(Date.now() - min * 60000));
const diaA = (n: number, h: number, m = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return fechaHoraLocal(d); };

// Un delivery o una empresa sin apellido se guarda con apellido vacío
const visitante = (id_visitante: number, nombre: string, apellido = '', rut: string | null = null, tipo: Visitante['tipo'] = 'Esporádico'): Visitante => ({ id_visitante, rut, nombre, apellido, tipo });
const invitacion = (id_invitacion: number, codigo: string, id_unidad: number, id_usuario: number, id_visitante: number, tipo: Invitacion['tipo'], fecha_desde: string, fecha_hasta: string, patente: string | null, estado: Invitacion['estado']): Invitacion => ({
  id_invitacion, codigo, id_unidad, id_usuario, id_visitante, tipo, fecha_desde, fecha_hasta, patente, estado, fecha_creacion: fecha_desde,
});
const acceso = (id_acceso: number, id_visitante: number, id_unidad: number, categoria: RegistroAcceso['categoria'], fecha_ingreso: string, fecha_salida: string | null, extra: Partial<RegistroAcceso> = {}): RegistroAcceso => ({
  id_acceso, id_visitante, id_unidad, id_invitacion: null, categoria, patente: null, metodo: 'Manual', fecha_ingreso, fecha_salida,
  estado_autorizacion: 'Aprobado', autorizado_via: null, id_usuario_autoriza: null, id_usuario_registra: null, codigo_qr_validado: 0, ...extra,
});
const conQR = (id_invitacion: number, id_usuario_registra: number): Partial<RegistroAcceso> => ({
  id_invitacion, metodo: 'QR', autorizado_via: 'Invitación', codigo_qr_validado: 1, id_usuario_registra,
});

export function visitantesIniciales(): Visitante[] {
  return [
    visitante(101, 'Ignacio', 'Ruiz', '18.552.901-K'), visitante(102, 'Jardines del Sur', '', '76.111.222-3', 'Frecuente'), visitante(103, 'Marcela', 'Díaz'),
    visitante(301, 'Daniela', 'Pino', '17.654.321-6'), visitante(302, 'Gasfitería Lagos', '', '76.543.210-3'), visitante(303, 'Tomás', 'Herrera', '19.111.222-3'),
    visitante(304, 'Isidora', 'Tapia', '18.765.432-1', 'Frecuente'), visitante(305, 'Felipe', 'Navarro', '16.222.333-4'), visitante(306, 'Catalina', 'Núñez', '20.333.444-5'),
    visitante(307, 'Mudanzas Andes', '', '77.888.999-0'), visitante(308, 'Ignacio', 'Fuentes'), visitante(309, 'Carmen', 'Rojas', null, 'Frecuente'),
    visitante(310, 'Repartidor PedidosYa'), visitante(311, 'Sebastián', 'Rojas'), visitante(312, 'Repartidor Rappi'),
  ];
}

// Quien invita es el residente de la unidad (`id_usuario`, igual que en Residentes y cargos del panel)
export function invitacionesIniciales(): Invitacion[] {
  return [
    invitacion(101, 'EC-6L4S2', 1009, 1010, 101, 'Visita', haceMin(60), haceMin(-240), 'HJTR19', 'Esperada'),
    invitacion(102, 'EC-8D1F7', 1001, 110, 102, 'Proveedor', diaA(0, 9), diaA(0, 13), null, 'Salió'),
    invitacion(103, 'EC-3F9K7', 1001, 110, 103, 'Visita', diaA(0, 18), diaA(0, 22), 'PFGH62', 'Esperada'),
    invitacion(301, 'EC-4K7Q2', 3502, 3008, 301, 'Visita', haceMin(30), haceMin(-180), 'RTKD45', 'Esperada'),
    invitacion(302, 'EC-9P3M8', 3301, 3015, 302, 'Proveedor', haceMin(10), haceMin(-120), null, 'Esperada'),
    invitacion(303, 'EC-2H6W1', 3104, 3026, 303, 'Visita', haceMin(-90), haceMin(-300), null, 'Esperada'),
    invitacion(304, 'EC-7B5N3', 3602, 3004, 304, 'Visita', haceMin(120), haceMin(-60), 'KLPR12', 'Adentro'),
    invitacion(305, 'EC-1X8C4', 3203, 3021, 305, 'Visita', haceMin(600), haceMin(240), null, 'Esperada'),
    invitacion(306, 'EC-5T2R9', 3401, 3011, 306, 'Visita', haceMin(300), haceMin(120), null, 'Salió'),
    invitacion(307, 'EC-3V9J6', 3201, 3019, 307, 'Servicio', diaA(0, 9), diaA(0, 13), 'FHJK88', 'Cancelada'),
    invitacion(308, 'EC-7M2D4', 3502, 3008, 308, 'Visita', diaA(2, 19), diaA(2, 23), null, 'Esperada'),
    invitacion(309, 'EC-8R4Z1', 3502, 3008, 309, 'Visita', diaA(-3, 15), diaA(-3, 19), null, 'Salió'),
  ];
}

// 108 Héctor Lillo (conserje) registra en Torre Andes; en Las Palmas, el administrador 101
export function accesosIniciales(): RegistroAcceso[] {
  return [
    acceso(101, 102, 1001, 'Proveedor', haceMin(210), haceMin(40), conQR(102, 101)),
    acceso(301, 304, 3602, 'Visita', haceMin(115), null, { ...conQR(304, 108), patente: 'KLPR12' }),
    acceso(302, 306, 3401, 'Visita', haceMin(170), haceMin(48), conQR(306, 108)),
    acceso(303, 310, 3502, 'Delivery', haceMin(20), haceMin(16), { autorizado_via: 'App', id_usuario_autoriza: 3008, id_usuario_registra: 108 }),
    acceso(304, 309, 3502, 'Visita', diaA(-3, 15, 10), diaA(-3, 18, 40), conQR(309, 108)),
    acceso(305, 311, 3603, 'Visita', haceMin(2), null, { estado_autorizacion: 'Pendiente de Confirmación', id_usuario_registra: 108 }),
    acceso(306, 312, 3502, 'Delivery', haceMin(1), null, { estado_autorizacion: 'Pendiente de Confirmación', id_usuario_registra: 108 }),
  ];
}

// ---------- Reservas ----------
// Fila de `reservas`. La app la crea Aprobada (no hay paso de aprobación); conserjería la entrega y la recibe.
export type Reserva = {
  id_reserva: number; id_espacio: number; id_usuario: number; id_unidad: number; fecha_reserva: string; hora_inicio: string; hora_fin: string;
  cantidad_invitados: number; estado_reserva: 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Cancelada' | 'Entregado' | 'Devuelto';
  observacion: string | null; fecha_solicitud: string;
};
// Quien reserva es el residente de la unidad: ids de usuario iguales a Residentes y cargos del panel
const reserva = (id_reserva: number, id_espacio: number, id_usuario: number, id_unidad: number, fecha_reserva: string, inicio: string, fin: string, cantidad_invitados: number, estado_reserva: Reserva['estado_reserva'] = 'Aprobada', observacion: string | null = null): Reserva => ({
  id_reserva, id_espacio, id_usuario, id_unidad, fecha_reserva, hora_inicio: `${inicio}:00`, hora_fin: `${fin}:00`, cantidad_invitados, estado_reserva, observacion, fecha_solicitud: `${dia(0)}T09:00:00`,
});
const pad = (n: number) => String(n).padStart(2, '0');
export const diaISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dia = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return diaISO(d); };

// Espacios dados de alta y horas TIME (13:00:00) como se muestran (13:00)
export const espaciosActivos = (c: Comunidad | null) => (c?.espacios_comunes ?? []).filter((e) => e.estado);
export const hora = (t: string) => t.slice(0, 5);

export function reservasIniciales(): Reserva[] {
  return [
    reserva(301, 31, 3016, 3302, dia(0), '12:00', '17:00', 12, 'Devuelto', 'Sin novedades'),
    reserva(302, 31, 3010, 3504, dia(0), '18:00', '23:30', 15),
    reserva(303, 32, 3021, 3203, dia(0), '10:00', '13:00', 6, 'Devuelto', 'Sin novedades'),
    reserva(304, 32, 3014, 3404, dia(0), '18:00', '22:00', 8),
    reserva(305, 33, 3003, 3601, dia(0), '07:00', '08:00', 0, 'Devuelto', 'Sin novedades'),
    reserva(306, 31, 3026, 3104, dia(1), '12:00', '17:00', 10),
    reserva(307, 32, 3015, 3301, dia(2), '15:00', '18:00', 5),
    reserva(308, 31, 3004, 3602, dia(5), '12:00', '17:00', 20),
    reserva(309, 33, 3008, 3502, dia(1), '07:00', '08:00', 0),
    reserva(101, 11, 102, 1005, dia(2), '12:00', '17:00', 14),
    reserva(102, 11, 1013, 1012, dia(6), '18:00', '23:30', 8),
    reserva(103, 11, 110, 1001, dia(-9), '12:00', '17:00', 12, 'Devuelto', 'Sin novedades'),
    reserva(201, 21, 2026, 2026, dia(3), '10:00', '14:00', 30),
    reserva(202, 22, 2077, 2077, dia(1), '18:00', '20:00', 10),
  ];
}

// ---------- Muro y mercado ----------
// Filas de `muro_publicaciones`, `marketplace_publicaciones`, `reportes_publicacion` y
// `solicitudes_contacto`, las mismas que usa el panel web.
export type MuroPublicacion = {
  id_publicacion: number; id_red: number; id_usuario: number; id_unidad: number | null; tipo: 'Vecino' | 'Comunicado' | 'Norma';
  titulo: string | null; contenido: string; fecha_creacion: string;
  estado_aprobacion: 'Pendiente' | 'Aprobada' | 'Rechazada'; id_aprobador: number | null; fecha_aprobacion: string | null;
  estado: 0 | 1; id_moderador: number | null; fecha_moderacion: string | null;
};
export type CategoriaMarketplace = 'Vendo' | 'Servicio' | 'Busco';
export const CATEGORIAS_MARKETPLACE: Record<number, CategoriaMarketplace> = { 1: 'Vendo', 2: 'Servicio', 3: 'Busco' };
export const ID_CATEGORIA: Record<CategoriaMarketplace, number> = { Vendo: 1, Servicio: 2, Busco: 3 };
export type ProductoMarketplace = {
  id_producto: number; id_red: number; id_usuario: number; id_unidad: number | null; id_categoria: number; titulo: string;
  descripcion: string | null; precio: number | null; foto_url: string | null;
  telefono_contacto: string | null; // Solo se muestra a los vecinos cuya solicitud de contacto acepta quien publicó
  fecha_publicacion: string; estado: 0 | 1; id_moderador: number | null; fecha_moderacion: string | null;
};
export type ReportePublicacion = {
  id_reporte: number; tipo_publicacion: 'muro' | 'marketplace'; id_publicacion: number; id_usuario: number;
  motivo: string; fecha: string; estado: 'Pendiente' | 'Descartado' | 'Atendido';
};
// El interesado toca «Contactar» y quien publicó recibe la solicitud con su nombre y su vivienda.
// Si la acepta, el interesado ve su teléfono; si la rechaza, ve que el aviso ya no está disponible.
// `vista` indica si el interesado ya vio la respuesta (para el globo de la pestaña Mercado).
export type SolicitudContacto = {
  id_solicitud: number; id_producto: number; id_usuario: number; id_unidad: number | null;
  estado: 'Pendiente' | 'Aceptada' | 'Rechazada'; fecha_solicitud: string; fecha_respuesta: string | null; vista: 0 | 1;
};

// Nombre y cargo de quienes aparecen en el muro (con la API, un JOIN con `usuarios` y `membresias`)
export const PERSONAS: Record<number, { nombre: string; cargo?: Cargo }> = {
  101: { nombre: 'Carlos Ibáñez', cargo: 'administrador' }, 102: { nombre: 'Luis Muñoz', cargo: 'presidente' },
  104: { nombre: 'Andrea Lagos', cargo: 'secretario' }, 105: { nombre: 'Sonia Fuentealba', cargo: 'presidente' },
  107: { nombre: 'Patricia Olave', cargo: 'administrador' }, 2077: { nombre: 'Paula Reyes', cargo: 'secretario' },
  1004: { nombre: 'Francisca Lagos' }, 1005: { nombre: 'Felipe Navarro' }, 1008: { nombre: 'Valentina Castro' }, 1010: { nombre: 'Javiera Cortés' },
  1011: { nombre: 'Cristóbal Vargas' }, 1014: { nombre: 'Mónica Sáez' }, 2026: { nombre: 'Valentina Castro' }, 3016: { nombre: 'Sebastián Araya' }, 3026: { nombre: 'Cristóbal Vargas' },
};

// Lo de vecinos se publica directo (Aprobada, sin aprobador ni título)
const vecino = (id_publicacion: number, id_red: number, id_usuario: number, id_unidad: number, contenido: string, fecha_creacion: string, extra: Partial<MuroPublicacion> = {}): MuroPublicacion => ({
  id_publicacion, id_red, id_usuario, id_unidad, tipo: 'Vecino', titulo: null, contenido, fecha_creacion,
  estado_aprobacion: 'Aprobada', id_aprobador: null, fecha_aprobacion: null, estado: 1, id_moderador: null, fecha_moderacion: null, ...extra,
});
// Comunicados y normas: sin `id_aprobador` quedan esperando al Presidente (y la app no los muestra)
const oficial = (id_publicacion: number, id_red: number, id_usuario: number, tipo: 'Comunicado' | 'Norma', titulo: string, contenido: string, fecha_creacion: string, id_aprobador: number | null = null, fecha_aprobacion: string | null = null): MuroPublicacion => ({
  ...vecino(id_publicacion, id_red, id_usuario, 0, contenido, fecha_creacion),
  id_unidad: null, tipo, titulo, estado_aprobacion: id_aprobador ? 'Aprobada' : 'Pendiente', id_aprobador, fecha_aprobacion,
});
const producto = (id_producto: number, id_red: number, id_usuario: number, id_unidad: number, id_categoria: number, titulo: string, descripcion: string, precio: number | null, telefono_contacto: string, fecha_publicacion: string): ProductoMarketplace => ({
  id_producto, id_red, id_usuario, id_unidad, id_categoria, titulo, descripcion, precio, foto_url: null, telefono_contacto, fecha_publicacion,
  estado: 1, id_moderador: null, fecha_moderacion: null,
});

export function muroInicial(): MuroPublicacion[] {
  return [
    oficial(101, 1, 104, 'Norma', 'Tenencia responsable de mascotas', 'Las mascotas deben circular con correa por el pasaje y sus dueños deben recoger los desechos. Los reclamos se registran en el muro.', '2026-08-02T10:00:00', 102, '2026-08-03T09:00:00'),
    oficial(102, 1, 104, 'Comunicado', 'Poda de árboles del pasaje', 'El martes 14 se podarán los árboles del pasaje entre 9:00 y 13:00. Por favor no estacionar bajo los árboles ese día.', '2026-10-09T10:00:00', 102, '2026-10-09T18:30:00'),
    vecino(103, 1, 1010, 1009, 'Vendo entradas para el concierto del sábado.', '2026-10-25T18:00:00', { estado: 0, id_moderador: 101, fecha_moderacion: '2026-10-25T18:42:00' }),
    vecino(104, 1, 1005, 1004, '¿Alguien perdió un gato gris? Está en mi patio desde anoche.', '2026-10-25T21:10:00'),
    vecino(105, 1, 1008, 1007, 'Otra vez dejaron la basura fuera del contenedor. Así no se puede vivir, los de la casa 3 nunca respetan nada.', '2026-10-24T08:45:00'),
    vecino(106, 1, 1008, 1007, 'Gracias a quien dejó el paquete de Correos en mi puerta, llegó perfecto.', '2026-10-23T19:40:00'),
    oficial(107, 1, 104, 'Comunicado', 'Corte de agua programado el sábado 31', 'Aguas Andinas realizará trabajos en la matriz. El sábado 31 de octubre no habrá agua entre 9:00 y 15:00. Les recomendamos guardar agua el viernes.', '2026-10-25T11:00:00'),
    oficial(108, 1, 104, 'Norma', 'Horario de uso del quincho', 'El quincho se podrá usar de domingo a jueves hasta las 23:00 y viernes y sábado hasta la 01:00. Cada reserva debe dejar el espacio limpio para la entrega en conserjería.', '2026-10-24T16:00:00'),
    oficial(201, 2, 2077, 'Comunicado', 'Asamblea ordinaria de octubre', 'El acta de la asamblea del 4 de octubre ya está disponible. Se aprobó cotizar una alarma comunitaria; la votación está abierta en la app.', '2026-10-06T09:00:00', 105, '2026-10-06T12:00:00'),
    vecino(202, 2, 2026, 2026, 'Este sábado hacemos limpieza de la plaza de la manzana B. ¡Los esperamos a las 10!', '2026-10-24T10:00:00'),
    oficial(203, 2, 2077, 'Comunicado', 'Corte de agua el sábado', 'El sábado 31 no habrá agua entre 9:00 y 15:00 por trabajos en la matriz.', '2026-10-25T10:00:00'),
    oficial(301, 3, 107, 'Comunicado', 'Mantención de ascensores', 'El jueves de 10:00 a 13:00 el ascensor A estará detenido por mantención preventiva.', '2026-10-22T09:00:00', 107, '2026-10-22T09:00:00'),
    vecino(302, 3, 3026, 3104, 'Se encontró un juego de llaves en el gimnasio. Están en conserjería.', '2026-10-25T08:20:00'),
  ];
}

export function marketplaceInicial(): ProductoMarketplace[] {
  return [
    producto(101, 1, 1014, 1013, 1, 'Bicicleta aro 26', 'En buen estado. Se puede probar en el pasaje.', 45000, '+56957496502', '2026-10-23T17:30:00'),
    producto(102, 1, 1010, 1009, 2, 'Clases de matemáticas', 'Para básica y media. Primera clase sin costo.', null, '+56957466930', '2026-10-21T12:00:00'),
    producto(103, 1, 1005, 1004, 3, 'Escalera de 3 metros', 'Busco quien me la preste el fin de semana.', null, '+56957429965', '2026-10-24T09:15:00'),
    producto(104, 1, 102, 1005, 1, 'Coche de bebé plegable', 'Poco uso. Incluye cubre lluvia.', 60000, '+56961234502', '2026-10-25T11:00:00'),
    producto(105, 1, 1008, 1007, 1, 'Mesa de ping-pong plegable', 'Con paletas y pelotas.', 80000, '+56957452144', '2026-10-19T16:00:00'),
    producto(106, 1, 1010, 1009, 2, 'Préstamos rápidos', 'Préstamos rápidos sin papeleo, escríbeme al interno.', null, '+56957466930', '2026-10-22T12:00:00'),
    producto(201, 2, 2077, 2077, 1, 'Empanadas de pino', 'Los domingos. Pedidos hasta el sábado.', 3500, '+56965355261', '2026-10-22T18:00:00'),
    producto(301, 3, 3016, 3302, 1, 'Escritorio blanco de 120 cm', 'Con cajonera. Retiro en el depto.', 120000, '+56972297288', '2026-10-20T20:00:00'),
  ];
}

export function reportesIniciales(): ReportePublicacion[] {
  return [
    { id_reporte: 1, tipo_publicacion: 'muro', id_publicacion: 103, id_usuario: 104, motivo: 'Comercio fuera del marketplace', fecha: '2026-10-25T18:20:00', estado: 'Atendido' },
    { id_reporte: 2, tipo_publicacion: 'muro', id_publicacion: 105, id_usuario: 1004, motivo: 'Acusación personal', fecha: '2026-10-24T09:30:00', estado: 'Pendiente' },
    { id_reporte: 3, tipo_publicacion: 'muro', id_publicacion: 105, id_usuario: 1011, motivo: 'Lenguaje ofensivo', fecha: '2026-10-24T11:02:00', estado: 'Pendiente' },
    { id_reporte: 4, tipo_publicacion: 'marketplace', id_publicacion: 106, id_usuario: 110, motivo: 'Posible estafa', fecha: '2026-10-22T15:20:00', estado: 'Pendiente' },
  ];
}

const solicitud = (id_solicitud: number, id_producto: number, id_usuario: number, id_unidad: number, estado: SolicitudContacto['estado'], pedida: number, respondida?: number): SolicitudContacto => ({
  id_solicitud, id_producto, id_usuario, id_unidad, estado, fecha_solicitud: haceMin(pedida), fecha_respuesta: respondida ? haceMin(respondida) : null, vista: 0,
});
export function solicitudesIniciales(): SolicitudContacto[] {
  return [
    solicitud(1, 104, 110, 1001, 'Pendiente', 45),
    solicitud(2, 104, 1008, 1007, 'Pendiente', 180),
    solicitud(3, 102, 102, 1005, 'Aceptada', 1500, 1400),
    solicitud(4, 105, 102, 1005, 'Rechazada', 2900, 2600),
  ];
}

// ---------- Votaciones y directorio (las mismas filas del panel web) ----------
// Filas de `votaciones`, `votacion_opciones` y `votos`: un voto por unidad, lo emite un residente.
export type Votacion = {
  id_votacion: number; id_red: number; tipo: 'Votación' | 'Encuesta'; titulo: string; descripcion: string | null;
  fecha_inicio: string; fecha_cierre: string; quorum: number | null; estado: 'Abierta' | 'Cerrada'; id_usuario_crea: number | null;
};
export type VotacionOpcion = { id_opcion: number; id_votacion: number; texto: string };
export type Voto = { id_voto: number; id_votacion: number; id_opcion: number; id_unidad: number; id_usuario: number | null; fecha: string };
// Lo que devolverá la API con un JOIN: opciones con sus votos contados y cuántas unidades tiene la comunidad
export type VotacionDetalle = Votacion & { opciones: (VotacionOpcion & { votos: number })[]; total_unidades: number };

// Unidades de cada comunidad (la API las cuenta en `unidades`)
export const TOTAL_UNIDADES: Record<number, number> = { 1: 15, 2: 96, 3: 24 };

const votacion = (id_votacion: number, id_red: number, tipo: Votacion['tipo'], titulo: string, descripcion: string, fecha_inicio: string, fecha_cierre: string, quorum: number | null, estado: Votacion['estado'], id_usuario_crea: number): Votacion => ({
  id_votacion, id_red, tipo, titulo, descripcion, fecha_inicio, fecha_cierre, quorum, estado, id_usuario_crea,
});
export const VOTACIONES: Votacion[] = [
  votacion(101, 1, 'Votación', 'Cambio de empresa de seguridad', 'Reemplazar la ronda nocturna actual por Vigilancia Andina, con un costo adicional de $6.500 por casa al mes.', '2026-10-20', '2026-10-31', 60, 'Abierta', 104),
  votacion(102, 1, 'Encuesta', '¿Qué día prefieres para la próxima asamblea?', 'La usaremos para fijar la asamblea de noviembre.', '2026-10-23', '2026-11-03', null, 'Abierta', 104),
  votacion(103, 1, 'Votación', 'Poda de árboles del pasaje', 'Contratar la poda de los 12 árboles del pasaje por $260.000 con cargo al gasto común.', '2026-09-15', '2026-09-25', 60, 'Cerrada', 104),
  votacion(201, 2, 'Votación', 'Instalar alarma comunitaria', 'Alarma con botón en cada casa, financiada con una cuota extraordinaria de $15.000 por casa.', '2026-10-18', '2026-11-08', 50, 'Abierta', 2077),
];
const opciones = (id_votacion: number, ...textos: string[]): VotacionOpcion[] => textos.map((texto, i) => ({ id_opcion: id_votacion * 10 + i + 1, id_votacion, texto }));
export const VOTACION_OPCIONES: VotacionOpcion[] = [
  ...opciones(101, 'A favor', 'En contra', 'Abstención'),
  ...opciones(102, 'Martes 19:30', 'Jueves 19:30', 'Sábado 11:00'),
  ...opciones(103, 'A favor', 'En contra'),
  ...opciones(201, 'A favor', 'En contra'),
];

// `reparto`: votos de cada opción en orden; `unidades`: qué unidades votaron. No se guarda qué residente votó.
function votos(id_votacion: number, fecha_inicio: string, reparto: number[], unidades: number[]): Voto[] {
  const elegidas = reparto.flatMap((n, i) => Array<number>(n).fill(id_votacion * 10 + i + 1));
  const inicio = new Date(`${fecha_inicio}T20:00:00`).getTime();
  return elegidas.map((id_opcion, i) => ({
    id_voto: id_votacion * 100 + i + 1, id_votacion, id_opcion, id_unidad: unidades[i], id_usuario: null,
    fecha: fechaHoraLocal(new Date(inicio + Math.floor(i / 3) * 86400000 + i * 7 * 60000)),
  }));
}
const rango = (desde: number, hasta: number, sin: number[] = []) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).filter((n) => !sin.includes(n));
// Las casas 1, 5 y 15 de Las Palmas y la 27 de Los Copihues (cuentas de prueba) aún no votan en las abiertas
export function votosIniciales(): Voto[] {
  return [
    ...votos(101, '2026-10-20', [7, 2, 1], rango(1002, 1012, [1005])),
    ...votos(102, '2026-10-23', [3, 2, 1], [1002, 1004, 1007, 1009, 1012, 1014]),
    ...votos(103, '2026-09-15', [11, 1], rango(1001, 1012)),
    ...votos(201, '2026-10-18', [38, 9], rango(2001, 2048, [2027])),
  ];
}

// Filas de `actas` y `acta_acuerdos` (libro de actas de Secretaría). La app muestra solo las Publicada.
// Asistentes y temas van como texto, uno por línea.
export type Acta = {
  id_acta: number; id_red: number; numero: number; tipo: 'Reunión de directiva' | 'Asamblea ordinaria' | 'Asamblea extraordinaria';
  fecha: string; lugar: string | null; asistentes: string | null; unidades_presentes: number | null; temas: string | null;
  estado: 'Borrador' | 'Publicada'; id_redactor: number | null; fecha_publicacion: string | null;
};
export type ActaAcuerdo = { id_acuerdo: number; id_acta: number; texto: string; responsable: string | null; plazo: string | null };
const acta = (id_acta: number, id_red: number, numero: number, tipo: Acta['tipo'], fecha: string, lugar: string, asistentes: string[], temas: string[], id_redactor: number, fecha_publicacion: string | null = null, unidades_presentes: number | null = null): Acta => ({
  id_acta, id_red, numero, tipo, fecha, lugar, asistentes: asistentes.join('\n'), unidades_presentes, temas: temas.join('\n'),
  estado: fecha_publicacion ? 'Publicada' : 'Borrador', id_redactor, fecha_publicacion,
});
const acuerdos = (id_acta: number, ...filas: [string, string, string?][]): ActaAcuerdo[] => filas.map(([texto, responsable, plazo], i) => ({ id_acuerdo: id_acta * 10 + i + 1, id_acta, texto, responsable, plazo: plazo ?? null }));
export const ACTAS: Acta[] = [
  acta(103, 1, 14, 'Reunión de directiva', '2026-10-21', 'Sede social',
    ['Luis Muñoz (Presidente)', 'Marta Rivas (Tesorera)', 'Andrea Lagos (Secretaria)', 'Carlos Ibáñez (Administrador)'],
    ['Falla del portón eléctrico', 'Horario del quincho', 'Morosidad de octubre'], 104),
  acta(102, 1, 13, 'Asamblea ordinaria', '2026-09-28', 'Quincho',
    ['Directiva completa', 'Representantes de 11 casas'],
    ['Cuenta de la tesorería', 'Meta del fondo de reserva', 'Poda de árboles del pasaje'], 104, '2026-09-30T10:00:00', 11),
  acta(101, 1, 12, 'Reunión de directiva', '2026-09-09', 'Sede social',
    ['Luis Muñoz (Presidente)', 'Marta Rivas (Tesorera)', 'Andrea Lagos (Secretaria)'],
    ['Preparación de la asamblea de septiembre'], 104, '2026-09-11T18:00:00'),
  acta(201, 2, 31, 'Asamblea ordinaria', '2026-10-04', 'Sede vecinal',
    ['Directiva completa', 'Representantes de 41 casas'],
    ['Reparación del portón de acceso', 'Cuota social 2027'], 2077, '2026-10-06T12:00:00', 41),
];
export const ACTA_ACUERDOS: ActaAcuerdo[] = [
  ...acuerdos(103,
    ['Cotizar con dos proveedores la reparación del motor del portón.', 'Administración', '2026-10-28'],
    ['Enviar a aprobación la norma de horario del quincho.', 'Secretaría', '2026-10-25']),
  ...acuerdos(102,
    ['Mantener la cuota del fondo de reserva en $8.000 hasta llegar a $4.000.000.', 'Tesorería'],
    ['Aprobar la poda de árboles del pasaje por $260.000.', 'Administración', '2026-10-15']),
  ...acuerdos(101, ['Citar a asamblea ordinaria el 28 de septiembre.', 'Secretaría', '2026-09-14']),
  ...acuerdos(201, ['Pedir tres cotizaciones para el portón de acceso.', 'Tesorería', '2026-10-20']),
];

// Filas de `contactos`: el directorio que mantiene Secretaría. La app muestra solo los `visible = 1`.
export type Contacto = { id_contacto: number; id_red: number; nombre: string; detalle: string | null; telefono: string; horario: string | null; visible: 0 | 1 };
const contacto = (id_contacto: number, id_red: number, nombre: string, detalle: string | null, telefono: string, horario: string | null, visible: 0 | 1 = 1): Contacto => ({
  id_contacto, id_red, nombre, detalle, telefono, horario, visible,
});
export const CONTACTOS: Contacto[] = [
  contacto(101, 1, 'Administración Ibáñez y Cía.', 'Administración del condominio', '+56 2 2345 6789', 'Lunes a viernes, 9:00 a 18:00'),
  contacto(102, 1, 'Automatismos Sur SpA', 'Mantención del portón eléctrico', '+56 9 8765 4321', 'Urgencias 24 horas'),
  contacto(103, 1, 'Gasfitería Don Hugo', 'Gasfíter de confianza del condominio', '+56 9 5555 1212', 'Lunes a sábado', 0),
  contacto(201, 2, 'Plan Cuadrante 14', 'Carabineros del sector', '+56 9 8888 0014', '24 horas'),
  contacto(301, 3, 'Conserjería', 'Visitas, encomiendas y llaves de los espacios comunes', '+56 45 221 0890', 'Todos los días, 24 horas'),
  contacto(302, 3, 'Administración Olave', 'Administración del edificio', '+56 9 7123 4567', 'Lunes a viernes, 9:00 a 17:00'),
];

// Números que siempre aparecen en el directorio; no van en la base
export const EMERGENCIAS = [
  { nombre: 'Ambulancia (SAMU)', telefono: '131' },
  { nombre: 'Bomberos', telefono: '132' },
  { nombre: 'Carabineros', telefono: '133' },
  { nombre: 'PDI', telefono: '134' },
];
