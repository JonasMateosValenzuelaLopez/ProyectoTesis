// Datos de ejemplo mientras la API REST no está lista. Cada objeto es una fila de la base
// (bd/entrecasas_db_v2.sql) con sus columnas tal cual; las listas anidadas (`red_modulos`,
// `unidades`) son lo que devolverá la API al pedir una comunidad.
// Ids de unidad: id_red × 1000 + número (Casa 5 de Las Palmas = 1005, Depto 603 = 3603).
import { MODULOS_POR_TIPO } from '../config/modulos';
import { registrarRed } from '../utils/unidades';

const unidad = (id_red, numero, calle_pasaje) => ({
  id_unidad: id_red * 1000 + Number(numero), id_red, numero_identificador: String(numero), calle_pasaje,
});
const desde = (id_red, inicio, fin, calle_pasaje) =>
  Array.from({ length: fin - inicio + 1 }, (_, i) => unidad(id_red, inicio + i, calle_pasaje));

// Condominio: dos hileras de casas, una a cada lado del pasaje
const unidadesLasPalmas = [...desde(1, 1, 7, 'Lado norte'), ...desde(1, 8, 15, 'Lado sur')];

// Edificio: torre A, pisos 6 a 1, cuatro deptos por piso
const unidadesTorreAndes = [6, 5, 4, 3, 2, 1].flatMap((piso) => [1, 2, 3, 4].map((n) => unidad(3, piso * 100 + n, 'Torre A')));

// Villa: cuatro manzanas de 24 casas
const unidadesCopihues = ['A', 'B', 'C', 'D'].flatMap((m, i) => desde(2, i * 24 + 1, i * 24 + 24, `Manzana ${m}`));

// Fila de `espacios_comunes` con sus `espacios_bloques` (horarios que se pueden reservar).
// Ids: id_red × 10 + n para el espacio y id_espacio × 10 + n para el bloque, iguales en la app.
const espacio = (id_red, n, nombre, capacidad, descripcion, bloques) => {
  const id_espacio = id_red * 10 + n;
  return {
    id_espacio, id_red, nombre, descripcion, capacidad, estado: 1,
    espacios_bloques: bloques.map(([inicio, fin], i) => ({ id_bloque: id_espacio * 10 + i + 1, id_espacio, hora_inicio: `${inicio}:00`, hora_fin: `${fin}:00` })),
  };
};
const QUINCHO = [['12:00', '17:00'], ['18:00', '23:30']];

const modulos = (tipo) => MODULOS_POR_TIPO[tipo].map((modulo) => ({ modulo, activo: 1 }));

export const comunidades = [
  {
    id_red: 1, nombre: 'Condominio Las Palmas', tipo: 'Condominio', direccion: 'Pasaje Los Aromos 1450, Temuco',
    banco: 'Banco Estado', tipo_cuenta: 'Cuenta corriente', numero_cuenta: '62900145872', titular_cuenta: 'Comunidad Condominio Las Palmas',
    rut_titular: '65.142.380-6', correo_pagos: 'pagos@laspalmas.cl', umbral_visado: 300000,
    fecha_registro: '2025-01-10T12:00:00', estado: 'Activa', motivo_suspension: null,
    red_modulos: modulos('Condominio'),
    unidades: unidadesLasPalmas,
    espacios_comunes: [espacio(1, 1, 'Quincho', 25, 'Se entrega limpio. Viernes y sábado hasta la 01:00.', QUINCHO)],
    // Calculada por la API desde `bitacora`
    ultima_actividad: '2026-10-25T18:42:00',
  },
  {
    id_red: 2, nombre: 'Villa Los Copihues', tipo: 'Villa', direccion: 'Calle Los Copihues s/n, Padre Las Casas',
    banco: 'Banco Estado', tipo_cuenta: 'Cuenta de ahorro', numero_cuenta: '34871209', titular_cuenta: 'Junta de Vecinos Villa Los Copihues',
    rut_titular: '65.098.441-2', correo_pagos: 'tesoreria@loscopihues.cl', umbral_visado: 300000,
    fecha_registro: '2025-05-02T12:00:00', estado: 'Activa', motivo_suspension: null,
    red_modulos: modulos('Villa'),
    unidades: unidadesCopihues,
    espacios_comunes: [
      espacio(2, 1, 'Sede vecinal', 60, 'Pedir la llave a la directiva el día anterior.', [['10:00', '14:00'], ['15:00', '20:00']]),
      espacio(2, 2, 'Multicancha', 20, 'Sin música después de las 22:00.', [['16:00', '18:00'], ['18:00', '20:00'], ['20:00', '22:00']]),
    ],
    ultima_actividad: '2026-10-24T10:00:00',
  },
  {
    id_red: 3, nombre: 'Edificio Torre Andes', tipo: 'Edificio', direccion: 'Av. Alemania 0890, Temuco',
    banco: 'Banco de Chile', tipo_cuenta: 'Cuenta corriente', numero_cuenta: '00-158-74123-09', titular_cuenta: 'Comunidad Edificio Torre Andes',
    rut_titular: '65.230.118-K', correo_pagos: 'pagos@torreandes.cl', umbral_visado: 300000,
    fecha_registro: '2024-06-01T12:00:00', estado: 'Activa', motivo_suspension: null,
    red_modulos: modulos('Edificio'),
    unidades: unidadesTorreAndes,
    espacios_comunes: [
      espacio(3, 1, 'Quincho', 20, 'Se retira y se devuelve en conserjería.', QUINCHO),
      espacio(3, 2, 'Sala multiuso', 15, 'Se retira y se devuelve en conserjería.', [['10:00', '13:00'], ['15:00', '18:00'], ['18:00', '22:00']]),
      espacio(3, 3, 'Gimnasio', 4, 'Una hora por unidad al día.', [['07:00', '08:00'], ['08:00', '09:00'], ['19:00', '20:00'], ['20:00', '21:00']]),
    ],
    ultima_actividad: '2026-10-26T08:00:00',
  },
];

comunidades.forEach(registrarRed);

// Atajo para los datos de ejemplo: id de unidad a partir de la comunidad y el número
export const idUnidad = (id_red, numero) => id_red * 1000 + Number(numero);
