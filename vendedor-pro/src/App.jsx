import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Carteira from './pages/Carteira';
import CRM from './pages/CRM';
import Agenda from './pages/Agenda';
import Vendas from './pages/Vendas';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="carteira" element={<Carteira />} />
            <Route path="crm" element={<CRM />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
