import React from 'react';

/**
 * Gráfico de funil simples, em CSS/HTML (sem biblioteca), para manter
 * o carregamento rápido. Recebe etapas no formato:
 * [{ id, label, color, count }]
 */
export default function FunnelChart({ etapas }) {
  const max = Math.max(1, ...etapas.map((e) => e.count));

  return (
    <div className="funnel-stages">
      {etapas.map((e) => {
        const largura = 14 + (e.count / max) * 86;
        return (
          <div className="funnel-row" key={e.id}>
            <div className="funnel-legend">
              <span className="sw" style={{ background: e.color }} />
              {e.label}
            </div>
            <div className="funnel-bar" style={{ width: `${largura}%`, background: e.color }} />
            <span className="funnel-count">{e.count}</span>
          </div>
        );
      })}
    </div>
  );
}
