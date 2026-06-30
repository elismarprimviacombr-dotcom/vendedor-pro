import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { perfil, signOut } = useAuth();
  const navigate = useNavigate();
  const inicial = (nome) => (nome || '?').charAt(0).toUpperCase();

  return (
    <div className="topbar">
      <div className="search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input placeholder="Buscar clientes, empresas, oportunidades..." />
        <span className="kbd">Ctrl + K</span>
      </div>

      <div className="topbar-right">
        <button className="icon-btn" onClick={() => navigate('/tarefas')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 00-12 0c0 4-2 5-2 7h16c0-2-2-3-2-7z"/><path d="M10 20a2 2 0 004 0"/></svg>
          <span className="notif-badge">3</span>
        </button>
        <button className="icon-btn" onClick={() => navigate('/agenda')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>
        </button>
        <button className="icon-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 1c0 1.5-2.5 1.7-2.5 3.5"/><circle cx="12" cy="17.3" r=".3" fill="currentColor"/></svg>
        </button>

        <button className="user-chip" onClick={() => navigate('/configuracoes')}>
          <div className="avatar">{inicial(perfil?.nome)}</div>
          <div>
            <div className="user-name">{perfil?.nome || 'Usuário'}</div>
            <div className="user-role">{perfil?.papel === 'admin' ? 'Administrador' : 'Vendedor'}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
    </div>
  );
}
