import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (sessao) => {
    if (!sessao) { setPerfil(null); return; }
    try {
      const { data } = await supabase.from('usuarios').select('*').eq('id', sessao.user.id).single();
      setPerfil(data ? { ...data, email: sessao.user.email } : null);
    } catch (e) {
      setPerfil({ email: sessao.user.email, papel: 'vendedor', nome: sessao.user.email.split('@')[0] });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      carregarPerfil(s).finally(() => setCarregando(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      carregarPerfil(s);
    });

    return () => subscription.unsubscribe();
  }, [carregarPerfil]);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
  }

  return (
    <AuthContext.Provider value={{ session, perfil, carregando, autenticado: !!session, isAdmin: perfil?.papel === 'admin', signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
