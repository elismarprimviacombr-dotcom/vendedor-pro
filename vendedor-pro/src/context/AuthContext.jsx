import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSession, onAuthStateChange, getPerfil, signOut as signOutService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  async function carregarPerfil(sessaoAtual) {
    if (!sessaoAtual) {
      setPerfil(null);
      return;
    }
    try {
      const dados = await getPerfil(sessaoAtual.user.id);
      setPerfil(dados);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Não foi possível carregar o perfil do usuário:', err.message);
      setPerfil(null);
    }
  }

  useEffect(() => {
    getSession().then(async (s) => {
      setSession(s);
      await carregarPerfil(s);
      setCarregando(false);
    });

    const subscription = onAuthStateChange(async (s) => {
      setSession(s);
      await carregarPerfil(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await signOutService();
    setSession(null);
    setPerfil(null);
  }

  const value = {
    session,
    perfil,
    carregando,
    autenticado: !!session,
    isAdmin: perfil?.papel === 'admin',
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de <AuthProvider>');
  return ctx;
}
