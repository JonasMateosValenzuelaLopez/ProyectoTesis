import {
  SpaceDashboardOutlined as InicioIcon,
  QrCodeScannerOutlined as PorteriaIcon,
  EventAvailableOutlined as EspaciosIcon,
  ReceiptLongOutlined as CobrosIcon,
  WarningAmberOutlined as MorosidadIcon,
  PaymentsOutlined as EgresosIcon,
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
  ExploreOutlined as GuiaIcon,
  PrivacyTipOutlined as ConservacionIcon,
} from '@mui/icons-material';
import { tieneModulo } from './modulos';
import { RolUsuario as R, rolesEfectivos } from './roles';

// Menú del panel. Cada opción declara qué cargos la ven (`cargos`) y qué módulo
// de la comunidad necesita (`modulo`). `pendiente` es la clave del contador que arma DashboardLayout.
// `fase`: en qué fase de la conexión con la API se conecta la vista; `sinBackend`: la API aún no la tiene.
export const SECCIONES = [
  {
    titulo: 'Hoy',
    items: [
      { texto: 'Inicio', ruta: '/panel', icono: <InicioIcon />, fase: 9, cargos: [R.ADMINISTRADOR, R.PRESIDENTE, R.TESORERO, R.SECRETARIO, R.CONSERJE] },
      // Para Conserjería la garita es su Inicio. La API la exige con el módulo de conserjería (porteria.controller.ts)
      { texto: 'Portería y visitas', ruta: '/panel/porteria', icono: <PorteriaIcon />, fase: 8, cargos: [R.ADMINISTRADOR], modulo: 'conserjeria', pendiente: 'porteria' },
      { texto: 'Espacios del día', ruta: '/panel/espacios', icono: <EspaciosIcon />, fase: 5, cargos: [R.CONSERJE], modulo: 'reservas' },
      { texto: 'Por aprobar', ruta: '/panel/aprobaciones', icono: <AprobarIcon />, fase: 4, cargos: [R.PRESIDENTE], pendiente: 'aprobaciones' },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      { texto: 'Cobros', ruta: '/panel/finanzas', icono: <CobrosIcon />, fase: 4, cargos: [R.TESORERO, R.ADMINISTRADOR], modulo: 'cobros' },
      { texto: 'Morosidad', ruta: '/panel/morosidad', icono: <MorosidadIcon />, fase: 4, cargos: [R.TESORERO, R.ADMINISTRADOR, R.PRESIDENTE], modulo: 'cobros', pendiente: 'morosidad' },
      { texto: 'Egresos', ruta: '/panel/egresos', icono: <EgresosIcon />, fase: 4, cargos: [R.TESORERO, R.ADMINISTRADOR, R.PRESIDENTE], modulo: 'cobros' },
      { texto: 'Exenciones', ruta: '/panel/exenciones', icono: <ExencionIcon />, fase: 4, cargos: [R.TESORERO, R.PRESIDENTE], modulo: 'cobros', pendiente: 'exenciones' },
      { texto: 'Categorías de cobro', ruta: '/panel/categorias', icono: <CategoriaIcon />, fase: 4, cargos: [R.TESORERO], modulo: 'cobros' },
      { texto: 'Reportes', ruta: '/panel/reportes', icono: <ReportesIcon />, fase: 4, cargos: [R.TESORERO, R.PRESIDENTE], modulo: 'cobros' },
    ],
  },
  {
    titulo: 'Directiva',
    items: [
      { texto: 'Libro de actas', ruta: '/panel/actas', icono: <ActasIcon />, fase: 7, cargos: [R.SECRETARIO, R.PRESIDENTE], modulo: 'votaciones' },
      { texto: 'Votaciones y encuestas', ruta: '/panel/votaciones', icono: <VotacionIcon />, fase: 7, cargos: [R.SECRETARIO, R.PRESIDENTE], modulo: 'votaciones' },
      { texto: 'Directorio oficial', ruta: '/panel/directorio', icono: <DirectorioIcon />, fase: 3, cargos: [R.SECRETARIO, R.PRESIDENTE] },
      // Solo tiene sentido auditar al administrador si la comunidad tiene uno
      { texto: 'Bitácora del administrador', ruta: '/panel/bitacora', icono: <BitacoraIcon />, fase: 9, cargos: [R.PRESIDENTE], modulo: 'administrador_externo' },
    ],
  },
  {
    titulo: 'Comunidad',
    items: [
      { texto: 'Muro y comunicados', ruta: '/panel/muro', icono: <MuroIcon />, fase: 6, cargos: [R.ADMINISTRADOR, R.PRESIDENTE, R.SECRETARIO], modulo: 'muro', pendiente: 'reportes' },
      { texto: 'Marketplace', ruta: '/panel/marketplace', icono: <MarketIcon />, fase: 6, cargos: [R.ADMINISTRADOR], modulo: 'marketplace', pendiente: 'reportesMarket' },
      { texto: 'Reservas', ruta: '/panel/reservas', icono: <ReservasIcon />, fase: 5, cargos: [R.ADMINISTRADOR], modulo: 'reservas' },
      { texto: 'Residentes y cargos', ruta: '/panel/residentes', icono: <ResidentesIcon />, fase: 3, cargos: [R.ADMINISTRADOR], pendiente: 'solicitudes' },
      { texto: 'Unidades', ruta: '/panel/unidades', icono: <UnidadesIcon />, fase: 3, cargos: [R.ADMINISTRADOR] },
      // Lo que ven los residentes nuevos en la app (P8). Sin administrador externo, la edita el Presidente
      { texto: 'Guía de bienvenida', ruta: '/panel/guia', icono: <GuiaIcon />, fase: 3, cargos: [R.ADMINISTRADOR, R.SECRETARIO] },
    ],
  },
  {
    titulo: 'Configuración',
    items: [
      // La directiva los ve en modo lectura (como la API); solo la administración los edita
      { texto: 'Datos de la comunidad', ruta: '/panel/condominio', icono: <ComunidadIcon />, fase: 3, cargos: [R.ADMINISTRADOR, R.PRESIDENTE, R.TESORERO, R.SECRETARIO] },
      { texto: 'Módulos', ruta: '/panel/modulos', icono: <ModulosIcon />, cargos: [R.ADMINISTRADOR] },
      // Ley 21.719: retener registros de visitas por un incidente (la API lo exige con conserjería)
      { texto: 'Conservación de datos', ruta: '/panel/conservacion', icono: <ConservacionIcon />, fase: 8, cargos: [R.ADMINISTRADOR], modulo: 'conserjeria' },
    ],
  },
];

export function puedeVer(item, cargo, comunidad) {
  const cargos = rolesEfectivos(cargo, comunidad);
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
