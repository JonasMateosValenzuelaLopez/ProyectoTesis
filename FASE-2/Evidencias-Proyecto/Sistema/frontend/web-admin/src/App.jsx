import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Typography } from '@mui/material';

// Vistas de Autenticación
import Login from './pages/auth/login';
import SolicitarAcceso from './pages/auth/SolicitarAcceso';
import RecuperarPassword from './pages/auth/RecuperarPassword';

// Layout Principal
import DashboardLayout from './components/DashboardLayout';
import RedVecinal from './pages/admin/RedVecinal';
import Unidades from './pages/admin/Unidades';
import Residentes from './pages/admin/Residentes';
import GastosComunes from './pages/admin/GastosComunes';
import Inicio from './pages/admin/Inicio';
// Componentes temporales para probar la navegación
const VistaTemporal = ({ titulo }) => <Typography variant="h4" color="primary">{titulo}</Typography>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Flujo Público (Login) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/solicitar-acceso" element={<SolicitarAcceso />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />

        {/* Flujo Privado (Panel Administrativo) */}
        <Route path="/panel" element={<DashboardLayout />}>
          {/* Outlet renderizará esto cuando la ruta sea exactamente /panel */}
          <Route index element={<Inicio />} />
          {/* Outlet renderizará estas vistas según el menú lateral */}
          <Route path="condominio" element={<RedVecinal />} />
          <Route path="unidades" element={<Unidades />} />
          <Route path="residentes" element={<Residentes />} />
          <Route path="finanzas" element={<GastosComunes />} />

        </Route>
      </Routes>
    </Router>
  );
}

export default App;