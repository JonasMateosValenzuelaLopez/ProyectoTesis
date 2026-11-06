import { Navigate } from 'react-router-dom';
import { useSesion } from '../context/SesionContext';
import { FinanzasProvider } from '../context/FinanzasContext';
import { AdminProvider } from '../context/AdminContext';
import { MuroProvider } from '../context/MuroContext';
import { DirectivaProvider } from '../context/DirectivaContext';
import { ConserjeriaProvider } from '../context/ConserjeriaContext';
import DashboardLayout from './DashboardLayout';
import { esPlataforma } from '../config/roles';

// Sin sesión no hay panel. Los datos de cada área se cargan solo dentro del panel,
// y se reinician al cerrar sesión (como pasará al volver a pedirlos a la API).
export default function PanelProtegido() {
  const { usuario, comunidad, porComunidad } = useSesion();
  if (esPlataforma(usuario) && !comunidad) return <Navigate to="/plataforma" replace />;
  // Con cargos en varias comunidades, primero elige con cuál trabajar
  if (usuario && !comunidad && porComunidad.length > 1) return <Navigate to="/elegir-comunidad" replace />;
  if (!usuario || !comunidad) return <Navigate to="/login" replace />;
  return (
    <FinanzasProvider>
      <AdminProvider>
        <MuroProvider>
          <DirectivaProvider>
            <ConserjeriaProvider>
              <DashboardLayout />
            </ConserjeriaProvider>
          </DirectivaProvider>
        </MuroProvider>
      </AdminProvider>
    </FinanzasProvider>
  );
}
