import {
  DomainOutlined as ComunidadesIcon,
  AddHomeWorkOutlined as NuevaIcon,
  PersonSearchOutlined as PersonasIcon,
  HistoryOutlined as BitacoraIcon,
} from '@mui/icons-material';

// Menú del panel de plataforma (equipo EntreCasas). No depende de cargos ni de módulos.
// `fase` y `sinBackend` funcionan igual que en el menú de las comunidades.
export const SECCIONES_PLATAFORMA = [
  {
    titulo: 'Plataforma',
    items: [
      { texto: 'Comunidades', ruta: '/plataforma', icono: <ComunidadesIcon />, fase: 2 },
      { texto: 'Nueva comunidad', ruta: '/plataforma/nueva', icono: <NuevaIcon />, fase: 2 },
      { texto: 'Personas', ruta: '/plataforma/personas', icono: <PersonasIcon /> },
      { texto: 'Bitácora', ruta: '/plataforma/bitacora', icono: <BitacoraIcon />, fase: 2 },
    ],
  },
];

// La ficha de una comunidad marca "Comunidades" en el menú
export const activoPlataforma = (item, ruta) => item.ruta === ruta
  || (item.ruta === '/plataforma' && ruta.startsWith('/plataforma/comunidades/'));
