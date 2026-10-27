// Datos de ejemplo mientras la API REST no está lista.
// Siguen la forma del modelo propuesto: redes_vecinales, red_modulos, membresias,
// unidades (con torre/piso/manzana) y cobro_unidades.
import { MODULOS_POR_TIPO } from '../config/modulos';

const casas = (desde, hasta, extra = {}) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => ({
    id: `c${desde + i}`, tipo: 'Casa', numero: String(desde + i), ...extra,
  }));

// Condominio: dos hileras de casas a lo largo de un pasaje
const unidadesLasPalmas = [
  ...casas(1, 7, { sector: 'norte' }),
  ...casas(8, 15, { sector: 'sur' }),
].map((u, i) => ({ ...u, orden: i }));

// Edificio: torre por pisos
const unidadesTorreAndes = [6, 5, 4, 3, 2, 1].flatMap((piso) =>
  [1, 2, 3, 4].map((n) => ({
    id: `d${piso}0${n}`, tipo: 'Departamento', numero: `${piso}0${n}`, torre: 'A', piso,
  }))
);

// Villa: manzanas separadas por calles
const unidadesCopihues = ['A', 'B', 'C', 'D'].flatMap((manzana, m) =>
  Array.from({ length: 24 }, (_, i) => ({
    id: `v${manzana}${i + 1}`, tipo: 'Casa', numero: String(m * 24 + i + 1), manzana,
  }))
);

export const comunidades = [
  {
    id: 1, nombre: 'Condominio Las Palmas', tipo: 'Condominio',
    calle: 'Pasaje Los Aromos', direccion: 'Pasaje Los Aromos 1450, Temuco', modulos: MODULOS_POR_TIPO.Condominio,
    unidades: unidadesLasPalmas,
    espaciosComunes: ['Quincho'],
    estado: 'activa', creadaEn: '2025-01-10', ultimaActividad: '2026-10-25T18:42:00',
  },
  {
    id: 2, nombre: 'Villa Los Copihues', tipo: 'Villa',
    calles: ['Calle Los Copihues', 'Calle Las Azucenas', 'Pasaje El Roble'], direccion: 'Calle Los Copihues s/n, Padre Las Casas', modulos: MODULOS_POR_TIPO.Villa,
    unidades: unidadesCopihues,
    espaciosComunes: ['Sede vecinal', 'Multicancha'],
    estado: 'activa', creadaEn: '2025-05-02', ultimaActividad: '2026-10-24T10:00:00',
  },
  {
    id: 3, nombre: 'Edificio Torre Andes', tipo: 'Edificio', direccion: 'Av. Alemania 0890, Temuco',
    modulos: MODULOS_POR_TIPO.Edificio,
    unidades: unidadesTorreAndes,
    espaciosComunes: ['Quincho', 'Sala multiuso', 'Gimnasio'],
    estado: 'activa', creadaEn: '2024-06-01', ultimaActividad: '2026-10-26T08:00:00',
  },
];
