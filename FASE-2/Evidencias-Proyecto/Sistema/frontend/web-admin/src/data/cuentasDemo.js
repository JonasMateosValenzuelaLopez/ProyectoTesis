// Cuentas de prueba para recorrer cada flujo por separado. Simulan la tabla usuarios
// con sus membresias (cargo por comunidad). Cuando exista la API, el login la consultará.
// Todas usan la misma clave y el mismo código de un solo uso.
export const CLAVE_PRUEBA = 'EntreCasas2026';
export const CODIGO_PRUEBA = '246810';

export const CUENTAS = [
  {
    id: 100, nombre: 'Valentina', apellido: 'Ortiz', rut: '9.876.543-3', correo: 'valentina@entrecasas.cl',
    flujo: 'Administración de la plataforma: crear y supervisar comunidades',
    plataforma: true, membresias: [],
  },
  {
    id: 101, nombre: 'Carlos', apellido: 'Ibáñez', rut: '12.345.678-5', correo: 'carlos.ibanez@correo.cl',
    flujo: 'Administración de un condominio',
    membresias: [{ idRed: 1, cargo: 'administrador' }],
  },
  {
    id: 102, nombre: 'Luis', apellido: 'Muñoz', rut: '15.678.234-3', correo: 'luis.munoz@correo.cl',
    flujo: 'Presidente con administrador externo',
    membresias: [{ idRed: 1, cargo: 'presidente' }],
  },
  {
    id: 103, nombre: 'Marta', apellido: 'Rivas', rut: '16.234.567-2', correo: 'marta.rivas@correo.cl',
    flujo: 'Tesorería',
    membresias: [{ idRed: 1, cargo: 'tesorero' }],
  },
  {
    id: 104, nombre: 'Andrea', apellido: 'Lagos', rut: '13.987.654-7', correo: 'andrea.lagos@correo.cl',
    flujo: 'Secretaría',
    membresias: [{ idRed: 1, cargo: 'secretario' }],
  },
  {
    id: 105, nombre: 'Sonia', apellido: 'Fuentealba', rut: '10.456.789-4', correo: 'sonia.fuentealba@correo.cl',
    flujo: 'Presidenta de una villa sin administrador',
    membresias: [{ idRed: 2, cargo: 'presidente' }],
  },
  {
    id: 106, nombre: 'Jorge', apellido: 'Silva', rut: '17.345.123-7', correo: 'jorge.silva@correo.cl',
    flujo: 'Tesorero de una villa',
    membresias: [{ idRed: 2, cargo: 'tesorero' }],
  },
  {
    id: 107, nombre: 'Patricia', apellido: 'Olave', rut: '14.567.890-0', correo: 'patricia.olave@correo.cl',
    flujo: 'Administración de un edificio con conserjería',
    membresias: [{ idRed: 3, cargo: 'administrador' }],
  },
  {
    id: 108, nombre: 'Héctor', apellido: 'Lillo', rut: '18.234.765-5', correo: 'hector.lillo@correo.cl',
    flujo: 'Conserjería (garita)',
    membresias: [{ idRed: 3, cargo: 'conserje' }],
  },
  {
    id: 109, nombre: 'Usuario', apellido: 'Demo', rut: '11.111.111-1', correo: 'demo@entrecasas.cl',
    flujo: 'Todos los cargos, para cambiar de uno a otro',
    membresias: [
      { idRed: 1, cargo: 'administrador' }, { idRed: 1, cargo: 'presidente' }, { idRed: 1, cargo: 'tesorero' }, { idRed: 1, cargo: 'secretario' },
      { idRed: 2, cargo: 'presidente' }, { idRed: 2, cargo: 'tesorero' },
      { idRed: 3, cargo: 'administrador' }, { idRed: 3, cargo: 'conserje' },
    ],
  },
  {
    id: 110, nombre: 'Rosa', apellido: 'Díaz', rut: '19.876.543-0', correo: 'rosa.diaz@correo.cl',
    flujo: 'Residente: el panel lo deriva a la app móvil',
    membresias: [],
  },
];
