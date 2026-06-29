import React, { useEffect, useState } from 'react';
import { listarCarteira } from '../services/clientesService';
import { exportarExcel } from '../services/exportExcel';
import { useToast } from '../context/ToastContext';

const CORES_POTENCIAL = {
  Alto: { bg: 'var(--green-dim)', cor: 'var(--green)' },
  Médio: { bg: '#4a3a1130', cor: 'var(--gold)' },
  Baixo: { bg: '#3a1c1c', cor: 'var(--red)' },
  Novo: { bg: '#1f2f4a', cor: 'var(--blue)' },
};

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Carteira() {
  const { notifyError } = useToast();
  const [carteira, setCarteira] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroPotencial, setFiltroPotencial] = useState('todos');

  useEffect(() => {
    listarCarteira()
      .then((dados) => dados.sort((a, b) => (b.diasSemComprar ?? 9999) - (a.diasSemComprar ?? 9999)))
      .then(setCarteira)
      .catch((err) => notifyError(err, 'Não foi possível carregar a carteira'))
      .finally(() => setCarregando(false));
  }, []);

  const filtrada = carteira.filter((c) => filtroPotencial === 'todos' || c.potencial === filtroPotencial);

  function exportar() {
    exportarExcel('carteira-clientes.xlsx', [
      {
        nomeAba: 'Carteira',
        linhas: filtrada.map((c) => ({
          Cliente: c.nome,
          Empresa: c.empresa,
          'Última compra': c.ultimaCompra || 'Nunca comprou',
          'Dias sem comprar': c.diasSemComprar ?? '—',
          'Valor médio': c.valorMedio,
          Potencial: c.potencial,
        })),
      },
    ]);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Carteira de Clientes</h1>
          <p>Quem comprou, quando comprou, e quem está esfriando</p>
        </div>
        <button className="btn btn-primary" onClick={exportar}>Exportar Excel</button>
      </div>

      <div className="field" style={{ maxWidth: 220, marginBottom: 14 }}>
        <select value={filtroPotencial} onChange={(e) => setFiltroPotencial(e.target.value)}>
          <option value="todos">Todos os potenciais</option>
          <option value="Alto">Alto</option>
          <option value="Médio">Médio</option>
          <option value="Baixo">Baixo</option>
          <option value="Novo">Novo</option>
        </select>
      </div>

      <div className="panel">
        {carregando ? (
          <p className="help-text">Carregando carteira...</p>
        ) : filtrada.length === 0 ? (
          <div className="empty-state"><h3>Nenhum cliente nesse filtro</h3></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Última compra</th>
                <th>Dias sem comprar</th>
                <th>Valor médio</th>
                <th>Potencial</th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((c) => {
                const cor = CORES_POTENCIAL[c.potencial];
                return (
                  <tr key={c.id}>
                    <td><strong>{c.nome}</strong><br /><span style={{ color: 'var(--muted)', fontSize: 11 }}>{c.empresa}</span></td>
                    <td className="mono">{c.ultimaCompra || 'Nunca comprou'}</td>
                    <td className="mono" style={{ color: c.diasSemComprar > 45 ? 'var(--red)' : 'inherit' }}>
                      {c.diasSemComprar ?? '—'}
                    </td>
                    <td className="mono">{formatarMoeda(c.valorMedio)}</td>
                    <td><span className="badge" style={{ background: cor.bg, color: cor.cor }}>{c.potencial}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
