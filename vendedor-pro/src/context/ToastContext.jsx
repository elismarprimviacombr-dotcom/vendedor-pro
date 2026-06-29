import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let proximoId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remover = useCallback((id) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback((mensagem, tipo = 'info') => {
    const id = proximoId++;
    setToasts((atual) => [...atual, { id, mensagem, tipo }]);
    timers.current[id] = setTimeout(() => remover(id), 4500);
  }, [remover]);

  // Atalho para erros: aceita tanto uma string quanto um objeto Error do Supabase
  const notifyError = useCallback((erro, prefixo = 'Não foi possível concluir a ação') => {
    const mensagem = typeof erro === 'string' ? erro : erro?.message || 'erro desconhecido';
    // eslint-disable-next-line no-console
    console.error(prefixo, erro);
    notify(`${prefixo}: ${mensagem}`, 'erro');
  }, [notify]);

  return (
    <ToastContext.Provider value={{ notify, notifyError }}>
      {children}
      <div style={{ position: 'fixed', bottom: 22, right: 22, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 99 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{
              position: 'static',
              borderColor: t.tipo === 'erro' ? 'var(--red)' : 'var(--border)',
              cursor: 'pointer',
              maxWidth: 360,
            }}
            onClick={() => remover(t.id)}
            title="Clique para fechar"
          >
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa ser usado dentro de <ToastProvider>');
  return ctx;
}
