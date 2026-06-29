import React from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="11" width="8" height="10" rx="1.5" /><rect x="3" y="14" width="8" height="7" rx="1.5" /></svg>,
  clientes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16 14.2c2.6.3 4.5 2.4 4.8 5.3" /></svg>,
  carteira: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  crm: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z" /></svg>,
  agenda: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  vendas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17l5-6 4 3 6-8" /><path d="M14 6h4v4" /></svg>,
  relatorios: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5M10 19V9M16 19v-6M21 19H3" /></svg>,
  config: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 000-3l1.8-1.4-2-3.3-2.1.6a7.4 7.4 0 00-2.6-1.5L14 2h-4l-.5 2.4a7.4 7.4 0 00-2.6 1.5l-2.1-.6-2 3.3L4.6 10.5a7.6 7.6 0 000 3l-1.8 1.4 2 3.3 2.1-.6c.76.66 1.64 1.17 2.6 1.5L10 22h4l.5-2.4c.96-.33 1.84-.84 2.6-1.5l2.1.6 2-3.3-1.8-1.4z" /></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>,
};

const ITENS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/clientes', label: 'Clientes', icon: 'clientes' },
  { to: '/carteira', label: 'Carteira', icon: 'carteira' },
  { to: '/crm', label: 'CRM', icon: 'crm' },
  { to: '/agenda', label: 'Agenda', icon: 'agenda' },
  { to: '/vendas', label: 'Vendas', icon: 'vendas' },
  { to: '/relatorios', label: 'Relatórios', icon: 'relatorios' },
  { to: '/configuracoes', label: 'Configurações', icon: 'config' },
];

export default function Sidebar() {
  const { perfil, signOut } = useAuth();

  return (
    <div className="sidebar">
      <div className="logo">
        <img src={logo} alt="Vendedor Pro" />
        <span className="v1">VENDEDOR</span>
        <span className="v2">PRO</span>
      </div>

      {ITENS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          {ICONS[item.icon]}
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '0 11px 8px' }}>
          {perfil?.nome} · {perfil?.papel === 'admin' ? 'Administrador' : 'Vendedor'}
        </div>
        <button className="nav-item" onClick={signOut} style={{ width: '100%', border: 'none', background: 'none' }}>
          {ICONS.logout}
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
