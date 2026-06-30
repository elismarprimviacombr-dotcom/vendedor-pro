import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Prospeccao from './pages/Prospeccao';
import Negociacoes from './pages/Negociacoes';
import Tarefas from './pages/Tarefas';
import Vendas from './pages/Vendas';
import Produtos from './pages/Produtos';
import Agenda from './pages/Agenda';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import VendasPerdidasAuto from './pages/VendasPerdidasAuto';
import Compras from './pages/Compras';
import Metas from './pages/Metas';
import FechamentoDiario from './pages/FechamentoDiario';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="prospeccao" element={<Prospeccao />} />
            <Route path="negociacoes" element={<Negociacoes />} />
            <Route path="tarefas" element={<Tarefas />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="vendas-perdidas-auto" element={<VendasPerdidasAuto />} />
            <Route path="compras" element={<Compras />} />
            <Route path="metas" element={<Metas />} />
            <Route path="fechamento-diario" element={<FechamentoDiario />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
