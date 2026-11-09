import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Vistas de autenticación
import Login from './pages/auth/login';
import SolicitarAcceso from './pages/auth/SolicitarAcceso';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import RestablecerPassword from './pages/auth/RestablecerPassword';
import ElegirComunidad from './pages/auth/ElegirComunidad';

// Armazones del panel y de Plataforma
import PanelProtegido from './components/PanelProtegido';
import PlataformaProtegida from './components/PlataformaProtegida';
import MiCuenta from './pages/MiCuenta';
import VistaPendiente from './pages/VistaPendiente';
import { TODAS_LAS_RUTAS } from './config/navegacion';
import { SECCIONES_PLATAFORMA } from './config/plataforma';

// Administración (fase 3)
import RedVecinal from './pages/admin/RedVecinal';
import Unidades from './pages/admin/Unidades';
import Residentes from './pages/admin/Residentes';
import GuiaBienvenida from './pages/comunidad/GuiaBienvenida';
import Directorio from './pages/secretario/Directorio';

// Finanzas (fase 4)
import Cobros from './pages/tesorero/Cobros';
import Morosidad from './pages/tesorero/Morosidad';
import Egresos from './pages/tesorero/Egresos';
import Exenciones from './pages/tesorero/Exenciones';
import Categorias from './pages/tesorero/Categorias';
import Reportes from './pages/tesorero/Reportes';
import PorAprobar from './pages/presidente/PorAprobar';

// Reservas (fase 5)
import Reservas from './pages/admin/Reservas';
import Espacios from './pages/conserjeria/Espacios';

// Muro y Marketplace (fase 6)
import Muro from './pages/comunidad/Muro';
import Marketplace from './pages/comunidad/Marketplace';

// Votaciones y Actas (fase 7)
import Votaciones from './pages/secretario/Votaciones';
import Actas from './pages/secretario/Actas';

// Plataforma (fase 2)
import Comunidades from './pages/plataforma/Comunidades';
import NuevaComunidad from './pages/plataforma/NuevaComunidad';
import FichaComunidad from './pages/plataforma/FichaComunidad';
import BitacoraPlataforma from './pages/plataforma/BitacoraPlataforma';

// Vistas conectadas con la API. Las demás rutas del menú muestran VistaPendiente:
// «En conexión» hasta su fase, o «Próximamente» si la API aún no tiene esa función.
const VISTAS = {
  '/panel/condominio': <RedVecinal />,
  '/panel/unidades': <Unidades />,
  '/panel/residentes': <Residentes />,
  '/panel/guia': <GuiaBienvenida />,
  '/panel/directorio': <Directorio />,
  '/panel/finanzas': <Cobros />,
  '/panel/morosidad': <Morosidad />,
  '/panel/egresos': <Egresos />,
  '/panel/exenciones': <Exenciones />,
  '/panel/categorias': <Categorias />,
  '/panel/reportes': <Reportes />,
  '/panel/aprobaciones': <PorAprobar />,
  '/panel/reservas': <Reservas />,
  '/panel/espacios': <Espacios />,
  '/panel/muro': <Muro />,
  '/panel/marketplace': <Marketplace />,
  '/panel/votaciones': <Votaciones />,
  '/panel/actas': <Actas />,
};
const VISTAS_PLATAFORMA = {
  '/plataforma': <Comunidades />,
  '/plataforma/nueva': <NuevaComunidad />,
  '/plataforma/bitacora': <BitacoraPlataforma />,
};
const RUTAS_PLATAFORMA = SECCIONES_PLATAFORMA.flatMap((s) => s.items);

function App() {
  return (
    <Router>
      <Routes>
        {/* Flujo público */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/solicitar-acceso" element={<SolicitarAcceso />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        {/* Enlace de los correos de recuperación y de activación de cuentas invitadas */}
        <Route path="/restablecer-password" element={<RestablecerPassword />} />
        <Route path="/elegir-comunidad" element={<ElegirComunidad />} />

        {/* Panel de una comunidad. El menú y el acceso a cada ruta dependen del cargo y los módulos. */}
        <Route path="/panel" element={<PanelProtegido />}>
          <Route index element={VISTAS['/panel'] ?? <VistaPendiente />} />
          <Route path="mi-cuenta" element={<MiCuenta />} />
          {TODAS_LAS_RUTAS.filter((i) => i.ruta !== '/panel').map((i) => (
            <Route key={i.ruta} path={i.ruta.replace('/panel/', '')} element={VISTAS[i.ruta] ?? <VistaPendiente />} />
          ))}
        </Route>

        {/* Panel del equipo EntreCasas: todas las comunidades */}
        <Route path="/plataforma" element={<PlataformaProtegida />}>
          <Route index element={VISTAS_PLATAFORMA['/plataforma'] ?? <VistaPendiente />} />
          <Route path="mi-cuenta" element={<MiCuenta />} />
          <Route path="comunidades/:id" element={<FichaComunidad />} />
          {RUTAS_PLATAFORMA.filter((i) => i.ruta !== '/plataforma').map((i) => (
            <Route key={i.ruta} path={i.ruta.replace('/plataforma/', '')} element={VISTAS_PLATAFORMA[i.ruta] ?? <VistaPendiente />} />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
