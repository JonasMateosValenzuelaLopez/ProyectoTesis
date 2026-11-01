import {
  SpaceDashboardOutlined as InicioIcon,
  QrCodeScannerOutlined as PorteriaIcon,
  EventAvailableOutlined as EspaciosIcon,
  ReceiptLongOutlined as CobrosIcon,
  WarningAmberOutlined as MorosidadIcon,
  HandshakeOutlined as ExencionIcon,
  CategoryOutlined as CategoriaIcon,
  AssessmentOutlined as ReportesIcon,
  TaskAltOutlined as AprobarIcon,
  HistoryOutlined as BitacoraIcon,
  MenuBookOutlined as ActasIcon,
  HowToVoteOutlined as VotacionIcon,
  CampaignOutlined as MuroIcon,
  StorefrontOutlined as MarketIcon,
  CalendarMonthOutlined as ReservasIcon,
  PeopleAltOutlined as ResidentesIcon,
  HomeWorkOutlined as UnidadesIcon,
  DomainOutlined as ComunidadIcon,
  ToggleOnOutlined as ModulosIcon,
  ContactPhoneOutlined as DirectorioIcon,
} from '@mui/icons-material';
import { tieneModulo } from './modulos';

// Menú del panel. Cada opción declara qué cargos la ven (`cargos`) y qué módulo
// de la comunidad necesita (`modulo`). `pendiente` es la clave del contador que arma DashboardLayout.
export const SECCIONES = [
  {
    titulo: 'Hoy',
    items: [
      { texto: 'Inicio', ruta: '/panel', icono: <InicioIcon />, cargos: ['administrador', 'presidente', 'tesorero', 'secretario', 'conserje'] },
      // Para Conserjería la garita es su Inicio
      { texto: 'Portería y visitas', ruta: '/panel/porteria', icono: <PorteriaIcon />, cargos: ['administrador'], modulo: 'invitaciones_qr', pendiente: 'porteria' },
      { texto: 'Espacios del día', ruta: '/panel/espacios', icono: <EspaciosIcon />, cargos: ['conserje'], modulo: 'reservas' },
      { texto: 'Por aprobar', ruta: '/panel/aprobaciones', icono: <AprobarIcon />, cargos: ['presidente'], pendiente: 'aprobaciones' },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      { texto: 'Cobros', ruta: '/panel/finanzas', icono: <CobrosIcon />, cargos: ['tesorero', 'administrador'], modulo: 'cobros' },
      { texto: 'Morosidad', ruta: '/panel/morosidad', icono: <MorosidadIcon />, cargos: ['tesorero', 'administrador', 'presidente'], modulo: 'cobros', pendiente: 'morosidad' },
      { texto: 'Exenciones', ruta: '/panel/exenciones', icono: <ExencionIcon />, cargos: ['tesorero', 'presidente'], modulo: 'cobros', pendiente: 'exenciones' },
      { texto: 'Categorías de cobro', ruta: '/panel/categorias', icono: <CategoriaIcon />, cargos: ['tesorero'], modulo: 'cobros' },
      { texto: 'Reportes', ruta: '/panel/reportes', icono: <ReportesIcon />, cargos: ['tesorero', 'presidente'], modulo: 'cobros' },
    ],
  },
  {
    titulo: 'Directiva',
    items: [
      { texto: 'Libro de actas', ruta: '/panel/actas', icono: <ActasIcon />, cargos: ['secretario', 'presidente'], modulo: 'votaciones' },
      { texto: 'Votaciones y encuestas', ruta: '/panel/votaciones', icono: <VotacionIcon />, cargos: ['secretario', 'presidente'], modulo: 'votaciones' },
      { texto: 'Directorio oficial', ruta: '/panel/directorio', icono: <DirectorioIcon />, cargos: ['secretario', 'presidente'] },
      // Solo tiene sentido auditar al administrador si la comunidad tiene uno
      { texto: 'Bitácora del administrador', ruta: '/panel/bitacora', icono: <BitacoraIcon />, cargos: ['presidente'], modulo: 'administrador_externo' },
    ],
  },
  {
    titulo: 'Comunidad',
    items: [
      { texto: 'Muro y comunicados', ruta: '/panel/muro', icono: <MuroIcon />, cargos: ['administrador', 'presidente', 'secretario'], modulo: 'muro', pendiente: 'reportes' },
      { texto: 'Marketplace', ruta: '/panel/marketplace', icono: <MarketIcon />, cargos: ['administrador'], modulo: 'marketplace' },
      { texto: 'Reservas', ruta: '/panel/reservas', icono: <ReservasIcon />, cargos: ['administrador'], modulo: 'reservas' },
      { texto: 'Residentes y cargos', ruta: '/panel/residentes', icono: <ResidentesIcon />, cargos: ['administrador'], pendiente: 'solicitudes' },
      { texto: 'Unidades', ruta: '/panel/unidades', icono: <UnidadesIcon />, cargos: ['administrador'] },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      { texto: 'Datos de la comunidad', ruta: '/panel/condominio', icono: <ComunidadIcon />, cargos: ['administrador'] },
      { texto: 'Módulos', ruta: '/panel/modulos', icono: <ModulosIcon />, cargos: ['administrador'] },
    ],
  },
];

// Sin administrador externo (típico en villas), el Presidente administra la comunidad.
export function cargosEfectivos(cargo, comunidad) {
  if (cargo === 'presidente' && !tieneModulo(comunidad, 'administrador_externo')) {
    return ['presidente', 'administrador'];
  }
  return [cargo];
}

export function puedeVer(item, cargo, comunidad) {
  const cargos = cargosEfectivos(cargo, comunidad);
  const tieneCargo = item.cargos.some((c) => cargos.includes(c));
  const conModulo = !item.modulo || tieneModulo(comunidad, item.modulo);
  return tieneCargo && conModulo;
}

export function menuPara(cargo, comunidad) {
  return SECCIONES
    .map((s) => ({ ...s, items: s.items.filter((i) => puedeVer(i, cargo, comunidad)) }))
    .filter((s) => s.items.length > 0);
}

export const TODAS_LAS_RUTAS = SECCIONES.flatMap((s) => s.items);
