import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Vistas de Autenticación
import Login from './pages/auth/login';
import SolicitarAcceso from './pages/auth/SolicitarAcceso';
import RecuperarPassword from './pages/auth/RecuperarPassword';

// Layout Principal
import PanelProtegido from './components/PanelProtegido';
import RedVecinal from './pages/admin/RedVecinal';
import Unidades from './pages/admin/Unidades';
import Residentes from './pages/admin/Residentes';
import Inicio from './pages/admin/Inicio';
import InicioTesorero from './pages/tesorero/InicioTesorero';
import Cobros from './pages/tesorero/Cobros';
import Morosidad from './pages/tesorero/Morosidad';
import Exenciones from './pages/tesorero/Exenciones';
import Categorias from './pages/tesorero/Categorias';
import Reportes from './pages/tesorero/Reportes';
import InicioPresidente from './pages/presidente/InicioPresidente';
import PorAprobar from './pages/presidente/PorAprobar';
import Bitacora from './pages/presidente/Bitacora';
import InicioSecretario from './pages/secretario/InicioSecretario';
import Actas from './pages/secretario/Actas';
import Votaciones from './pages/secretario/Votaciones';
import Directorio from './pages/secretario/Directorio';
import Modulos from './pages/admin/Modulos';
import Muro from './pages/comunidad/Muro';
import Porteria from './pages/conserjeria/Porteria';
import Espacios from './pages/conserjeria/Espacios';
import Reservas from './pages/admin/Reservas';
import VistaPendiente from './pages/VistaPendiente';
import PlataformaProtegida from './components/PlataformaProtegida';
import Comunidades from './pages/plataforma/Comunidades';
import NuevaComunidad from './pages/plataforma/NuevaComunidad';
import FichaComunidad from './pages/plataforma/FichaComunidad';
import Personas from './pages/plataforma/Personas';
import BitacoraPlataforma from './pages/plataforma/BitacoraPlataforma';
import { TODAS_LAS_RUTAS } from './config/navegacion';
import { useSesion } from './context/SesionContext';

// Cada ruta del menú con su vista; VistaPendiente queda para opciones nuevas sin pantalla.
const VISTAS = {
  '/panel/condominio': <RedVecinal />,
  '/panel/unidades': <Unidades />,
  '/panel/residentes': <Residentes />,
  '/panel/finanzas': <Cobros />,
  '/panel/morosidad': <Morosidad />,
  '/panel/exenciones': <Exenciones />,
  '/panel/categorias': <Categorias />,
  '/panel/reportes': <Reportes />,
  '/panel/aprobaciones': <PorAprobar />,
  '/panel/bitacora': <Bitacora />,
  '/panel/actas': <Actas />,
  '/panel/votaciones': <Votaciones />,
  '/panel/directorio': <Directorio />,
  '/panel/modulos': <Modulos />,
  '/panel/porteria': <Porteria />,
  '/panel/espacios': <Espacios />,
  '/panel/reservas': <Reservas />,
  '/panel/muro': <Muro key="muro" />,
  '/panel/marketplace': <Muro key="marketplace" lugar="marketplace" />,
};

function InicioPorCargo() {
  const { cargo } = useSesion();
  if (cargo === 'administrador') return <Inicio />;
  if (cargo === 'tesorero') return <InicioTesorero />;
  if (cargo === 'presidente') return <InicioPresidente />;
  if (cargo === 'secretario') return <InicioSecretario />;
  if (cargo === 'conserje') return <Porteria />;
  return null;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Flujo Público (Login) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/solicitar-acceso" element={<SolicitarAcceso />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />

        {/* Flujo Privado (Panel). El menú y el acceso a cada ruta dependen del cargo y los módulos. */}
        <Route path="/panel" element={<PanelProtegido />}>
          <Route index element={<InicioPorCargo />} />
          {TODAS_LAS_RUTAS.filter((i) => i.ruta !== '/panel').map((i) => (
            <Route key={i.ruta} path={i.ruta.replace('/panel/', '')} element={VISTAS[i.ruta] ?? <VistaPendiente />} />
          ))}
        </Route>

        {/* Panel del equipo EntreCasas: todas las comunidades */}
        <Route path="/plataforma" element={<PlataformaProtegida />}>
          <Route index element={<Comunidades />} />
          <Route path="nueva" element={<NuevaComunidad />} />
          <Route path="comunidades/:id" element={<FichaComunidad />} />
          <Route path="personas" element={<Personas />} />
          <Route path="bitacora" element={<BitacoraPlataforma />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
