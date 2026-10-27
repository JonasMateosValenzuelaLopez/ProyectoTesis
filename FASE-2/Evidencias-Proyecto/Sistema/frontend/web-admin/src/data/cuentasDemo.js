// Cuentas de prueba para recorrer cada flujo por separado. Cada una es una fila de `usuarios`
// con sus `membresias` (cargo por comunidad, con `id_rol` de la tabla `roles`). Cuando exista
// la API, el login la consultará. `flujo` es solo para la pantalla de cuentas de prueba.
// Todas usan la misma clave y el mismo código de un solo uso.
import { ID_ROL } from '../config/roles';

export const CLAVE_PRUEBA = 'EntreCasas2026';
export const CODIGO_PRUEBA = '246810';

let siguiente = 1;
// Fila de `membresias`. Sin `fecha_hasta`, el cargo sigue hasta que alguien lo quite.
export const membresia = (id_usuario, id_red, cargo, fecha_desde, fecha_hasta = null) => ({
  id_membresia: siguiente++, id_usuario, id_red, id_rol: ID_ROL[cargo], fecha_desde, fecha_hasta, estado: 'Vigente',
});

const cuenta = (id_usuario, nombre, apellido_paterno, apellido_materno, rut, correo, telefono, flujo, cargos) => ({
  id_usuario, rut, nombre, apellido_paterno, apellido_materno, correo, telefono, estado: 'Activo', fecha_registro: '2025-01-01T12:00:00',
  flujo, membresias: cargos.map(([id_red, cargo, desde, hasta]) => membresia(id_usuario, id_red, cargo, desde, hasta)),
});

// Periodos de la directiva de cada comunidad
const LP = ['2026-03-01', '2028-02-28'];
const LC = ['2025-05-01', '2027-04-30'];

export const CUENTAS = [
  cuenta(100, 'Valentina', 'Ortiz', 'Reyes', '9.876.543-3', 'valentina@entrecasas.cl', '+56961234500',
    'Administración de la plataforma: crear y supervisar comunidades', [[null, 'plataforma', '2024-01-01']]),
  cuenta(101, 'Carlos', 'Ibáñez', 'Torres', '12.345.678-5', 'carlos.ibanez@correo.cl', '+56961234501',
    'Administración de un condominio', [[1, 'administrador', '2025-01-01']]),
  cuenta(102, 'Luis', 'Muñoz', 'Saavedra', '15.678.234-3', 'luis.munoz@correo.cl', '+56961234502',
    'Presidente con administrador externo', [[1, 'presidente', ...LP]]),
  cuenta(103, 'Marta', 'Rivas', 'Cáceres', '16.234.567-2', 'marta.rivas@correo.cl', '+56961234503',
    'Tesorería', [[1, 'tesorero', '2026-10-22', LP[1]]]),
  cuenta(104, 'Andrea', 'Lagos', 'Medina', '13.987.654-7', 'andrea.lagos@correo.cl', '+56961234504',
    'Secretaría', [[1, 'secretario', ...LP]]),
  cuenta(105, 'Sonia', 'Fuentealba', 'Riquelme', '10.456.789-4', 'sonia.fuentealba@correo.cl', '+56961234505',
    'Presidenta de una villa sin administrador', [[2, 'presidente', ...LC]]),
  cuenta(106, 'Jorge', 'Silva', 'Henríquez', '17.345.123-7', 'jorge.silva@correo.cl', '+56961234506',
    'Tesorero de una villa', [[2, 'tesorero', ...LC]]),
  cuenta(107, 'Patricia', 'Olave', 'Sandoval', '14.567.890-0', 'patricia.olave@correo.cl', '+56961234507',
    'Administración de un edificio con conserjería', [[3, 'administrador', '2024-06-01']]),
  cuenta(108, 'Héctor', 'Lillo', 'Parra', '18.234.765-5', 'hector.lillo@correo.cl', '+56961234508',
    'Conserjería (garita)', [[3, 'conserje', '2023-09-01']]),
  cuenta(109, 'Usuario', 'Demo', null, '11.111.111-1', 'demo@entrecasas.cl', '+56961234509',
    'Todos los cargos, para cambiar de uno a otro', [
      [1, 'administrador', '2025-01-01'], [1, 'presidente', ...LP], [1, 'tesorero', ...LP], [1, 'secretario', ...LP],
      [2, 'presidente', ...LC], [2, 'tesorero', ...LC],
      [3, 'administrador', '2024-06-01'], [3, 'conserje', '2023-09-01'],
    ]),
  cuenta(110, 'Rosa', 'Díaz', 'Aguilera', '19.876.543-0', 'rosa.diaz@correo.cl', '+56961234510',
    'Residente: el panel lo deriva a la app móvil', []),
];
