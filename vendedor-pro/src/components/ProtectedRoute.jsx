import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { autenticado, carregando } = useAuth();

  if (carregando) {
    return <div style={{ padding: 40, color: 'var(--muted)' }}>Carregando...</div>;
  }
  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
