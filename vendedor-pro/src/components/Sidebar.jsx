import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const IC = {
  dashboard: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="11" width="7" height="9" rx="1"/><rect x="3" y="14" width="7" height="6" rx="1"/></svg>,
  clientes: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2"/><path d="M16 14c2.3.3 4 2.3 4.5 5"/></svg>,
  prospeccao: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 4h18l-7 9v6l-4-2v-4L3 4z"/></svg>,
  negociacoes: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h9m-9 6h4"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>,
  tarefas: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 9h8M8 13h6M8 17h4"/></svg>,
  vendas: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 17 9 11 13 14 21 6"/><polyline points="14 6 21 6 21 13"/></svg>,
  produtos: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>,
  agenda: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>,
  relatorios: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20V8M9 20V4M14 20v-8M19 20v-4"/></svg>,
  importar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 19h16"/></svg>,
  exportar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15V3m0 0l-4 4m4-4l4 4"/><path d="M4 19h16"/></svg>,
  backup: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 3v5h-5"/></svg>,
  config: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 000-3l1.8-1.4-2-3.3-2.1.6A7.4 7.4 0 0014.5 4.9L14 2h-4l-.5 2.4a7.4 7.4 0 00-2.6 1.5l-2.1-.6-2 3.3L4.6 10.5a7.6 7.6 0 000 3l-1.8 1.4 2 3.3 2.1-.6c.76.66 1.64 1.17 2.6 1.5L10 22h4l.5-2.4c.96-.33 1.84-.84 2.6-1.5l2.1.6 2-3.3-1.8-1.4z"/></svg>,
  logout: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>,
  wifi: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>,
};

const NAV_PRINCIPAL = [
  ['/dashboard','Dashboard','dashboard'],
  ['/clientes','Clientes','clientes'],
  ['/prospeccao','Prospecção','prospeccao'],
  ['/negociacoes','Negociações','negociacoes'],
  ['/tarefas','Tarefas','tarefas'],
  ['/vendas','Vendas','vendas'],
  ['/produtos','Produtos','produtos'],
  ['/agenda','Agenda','agenda'],
  ['/relatorios','Relatórios','relatorios'],
];

export default function Sidebar() {
  const { perfil, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="sidebar">
      <div className="logo">
        <span className="v1">VENDEDOR</span><span className="v2"> PRO</span>
      </div>

      <div className="nav-section">Principal</div>
      {NAV_PRINCIPAL.map(([to, label, icon]) => (
        <NavLink key={to} to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          {IC[icon]}<span>{label}</span>
        </NavLink>
      ))}

      <div className="nav-section">Extras</div>
      <button className="nav-item" style={{border:'none',width:'100%',textAlign:'left'}} onClick={()=>navigate('/relatorios')}>{IC.importar}<span>Importar Contatos</span></button>
      <button className="nav-item" style={{border:'none',width:'100%',textAlign:'left'}} onClick={()=>navigate('/relatorios')}>{IC.exportar}<span>Exportar Relatórios</span></button>
      <button className="nav-item" style={{border:'none',width:'100%',textAlign:'left'}} onClick={()=>navigate('/relatorios')}>{IC.backup}<span>Backup de Dados</span></button>
      <NavLink to="/configuracoes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>{IC.config}<span>Configurações</span></NavLink>

      <div className="sidebar-bottom">
        <div className="offline-banner">
          {IC.wifi}
          <span style={{marginLeft:6,fontSize:11,color:'var(--green-light)'}}>Online · Sincronizado</span>
        </div>
        <button className="nav-item" style={{border:'none',width:'100%',textAlign:'left',marginTop:4}} onClick={signOut}>
          {IC.logout}<span>Sair</span>
        </button>
      </div>
    </div>
  );
}
