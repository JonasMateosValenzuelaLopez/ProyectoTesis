import {
  DomainOutlined as ComunidadesIcon,
  AddHomeWorkOutlined as NuevaIcon,
  PersonSearchOutlined as PersonasIcon,
  HistoryOutlined as BitacoraIcon,
} from '@mui/icons-material';

// Menú del panel de plataforma (equipo EntreCasas). No depende de cargos ni de módulos.
export const SECCIONES_PLATAFORMA = [
  {
    titulo: 'Plataforma',
    items: [
      { texto: 'Comunidades', ruta: '/plataforma', icono: <ComunidadesIcon /> },
      { texto: 'Nueva comunidad', ruta: '/plataforma/nueva', icono: <NuevaIcon /> },
      { texto: 'Personas', ruta: '/plataforma/personas', icono: <PersonasIcon />, pendiente: 'bloqueados' },
      { texto: 'Bitácora', ruta: '/plataforma/bitacora', icono: <BitacoraIcon /> },
    ],
  },
];

// La ficha de una comunidad marca "Comunidades" en el menú
export const activoPlataforma = (item, ruta) => item.ruta === ruta
  || (item.ruta === '/plataforma' && ruta.startsWith('/plataforma/comunidades/'));
