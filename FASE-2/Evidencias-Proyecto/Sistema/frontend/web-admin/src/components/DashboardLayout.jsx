import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Logout as LogoutIcon, ManageAccountsOutlined as CuentaIcon } from '@mui/icons-material';
import { useSesion } from '../context/SesionContext';
import { menuPara, puedeVer, TODAS_LAS_RUTAS } from '../config/navegacion';
import MarcoPanel from './MarcoPanel';
import SelectorTema from './SelectorTema';
import PasoSesion from './marca/PasoSesion';
import BotonTutorial from './tutorial/BotonTutorial';
import SelectorContexto from './SelectorContexto';
import { nombreCorto } from '../utils/formato';
import { RolUsuario, rolesEfectivos } from '../config/roles';
import { listarSolicitudes } from '../api/admin';
import { estado as estadoFinanzas, listarExenciones } from '../api/finanzas';
import { listarOficiales, moderacionMarketplace, moderacionMuro } from '../api/muro';
import { resumen as resumenPorteria } from '../api/porteria';
import { tieneModulo } from '../config/modulos';
import { leeFinanzas } from '../utils/permisos';
import { useConsulta } from '../api/useConsulta';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, comunidad, cargo, cerrarSesion } = useSesion();
  const [saliendo, setSaliendo] = useState(false);

  const secciones = menuPara(cargo, comunidad);
  // Contadores del menú (`pendiente`): cada módulo agrega el suyo al conectarse con la API.
  // Solicitudes de acceso: solo la administración las ve (GET solicitudes-acceso); se vuelven a contar al cambiar de página.
  const administra = rolesEfectivos(cargo, comunidad).includes(RolUsuario.ADMINISTRADOR);
  const { datos: solicitudes } = useConsulta(
    () => (administra ? listarSolicitudes('Pendiente') : Promise.resolve([])),
    [comunidad?.idRed, administra, location.pathname],
  );
  // Finanzas (con el módulo «cobros»): unidades con cobros vencidos y lo que espera a cada cargo.
  // Exenciones: Tesorería revisa las «Pendiente» y la Presidencia decide las «Por aprobar».
  const conFinanzas = leeFinanzas(cargo, comunidad) && tieneModulo(comunidad, 'cobros');
  const decideExenciones = cargo === RolUsuario.TESORERO || cargo === RolUsuario.PRESIDENTE;
  const { datos: fin } = useConsulta(
    () => (conFinanzas
      ? Promise.all([estadoFinanzas(), decideExenciones ? listarExenciones() : Promise.resolve([])])
      : Promise.resolve(null)),
    [comunidad?.idRed, cargo, conFinanzas, location.pathname],
  );
  const exencionesMias = fin ? fin[1].filter((e) => e.estado === (cargo === RolUsuario.PRESIDENTE ? 'Por aprobar' : 'Pendiente')).length : 0;
  // Muro y marketplace: publicaciones con reportes pendientes (Administración, en las últimas 50)
  // y comunicados que esperan a la Presidencia.
  const conMuro = tieneModulo(comunidad, 'muro');
  const conMarket = tieneModulo(comunidad, 'marketplace');
  const presidente = cargo === RolUsuario.PRESIDENTE;
  const { datos: com } = useConsulta(
    () => Promise.all([
      administra && conMuro ? moderacionMuro().then((r) => r.publicaciones) : Promise.resolve([]),
      administra && conMarket ? moderacionMarketplace().then((r) => r.avisos) : Promise.resolve([]),
      presidente && conMuro ? listarOficiales() : Promise.resolve([]),
    ]),
    [comunidad?.idRed, administra, presidente, conMuro, conMarket, location.pathname],
  );
  // Garita: llegadas sin invitación que esperan al residente (Administración ve el contador en «Portería y visitas»)
  const conGarita = administra && tieneModulo(comunidad, 'conserjeria');
  const { datos: garita } = useConsulta(
    () => (conGarita ? resumenPorteria() : Promise.resolve(null)),
    [comunidad?.idRed, conGarita, location.pathname],
  );
  const reportadas = (lista) => lista.filter((p) => p.estadoModeracion === 'Publicada' && p.reportes?.length).length;
  const comunicadosPorAprobar = com ? com[2].filter((x) => x.estadoAprobacion === 'Pendiente').length : 0;
  const contadores = {
    solicitudes: solicitudes?.length ?? 0,
    morosidad: fin ? fin[0].morosos.length : 0,
    exenciones: exencionesMias,
    aprobaciones: presidente ? (fin ? fin[0].resumen.egresosPorVisar + exencionesMias : 0) + comunicadosPorAprobar : 0,
    reportes: com ? reportadas(com[0]) : 0,
    reportesMarket: com ? reportadas(com[1]) : 0,
    porteria: garita?.porAutorizar.length ?? 0,
  };

  // Si la ruta actual no corresponde al cargo o a los módulos activos, volver al inicio.
  const rutaActual = TODAS_LAS_RUTAS.find((i) => i.ruta === location.pathname);
  if (rutaActual && !puedeVer(rutaActual, cargo, comunidad)) {
    return <Navigate to="/panel" replace />;
  }

  const handleLogout = () => setSaliendo(true);
  const salir = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <>
    {saliendo && <PasoSesion tipo="salir" nombre={usuario.nombre} alTerminar={salir} />}
    <MarcoPanel
      secciones={secciones}
      contadores={contadores}
      etiquetaMenu="Menú del panel"
      barra={(
        <>
          <SelectorContexto />
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', md: 'block' } }}>
            {nombreCorto(usuario)}
          </Typography>
          <Tooltip title="Mi cuenta">
            <IconButton aria-label="Mi cuenta" onClick={() => navigate('/panel/mi-cuenta')} sx={{ color: 'text.secondary' }}>
              <CuentaIcon />
            </IconButton>
          </Tooltip>
          <BotonTutorial cargo={cargo} />
          <SelectorTema />
          <Tooltip title="Cerrar sesión">
            <IconButton aria-label="Cerrar sesión" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
    />
    </>
  );
}
