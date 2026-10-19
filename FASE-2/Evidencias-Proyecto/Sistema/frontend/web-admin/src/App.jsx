import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/login'; // Asegúrate de que el archivo empiece con L mayúscula
import SolicitarAcceso from './pages/auth/SolicitarAcceso'; // Corregido a mayúsculas
import RecuperarPassword from './pages/auth/RecuperarPassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/solicitar-acceso" element={<SolicitarAcceso />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
      </Routes>
    </Router>
  );
}

export default App;