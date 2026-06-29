import React from 'react';

/**
 * Gráfico de rosca via CSS conic-gradient — sem biblioteca, leve e rápido.
 * segmentos: [{ label, value, color }]
 */
export default function DonutChart({ segmentos, totalLabel = 'Total' }) {
  const total = segmentos.reduce((s, seg) => s + seg.value, 0);

  if (!total) {
    return <p className="help-text">Sem dados suficientes ainda.</p>;
  }

  let acumulado = 0;
  const stops = segmentos
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct = (s.value / total) * 100;
      const trecho = `${s.color} ${acumulado}% ${acumulado + pct}%`;
      acumulado += pct;
      return trecho;
    });

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${stops.join(',')})` }}>
        <div className="donut-hole">
          <div className="n">{total}</div>
          <div className="l">{totalLabel}</div>
        </div>
      </div>
      <div className="legend-list">
        {segmentos.filter((s) => s.value > 0).map((s) => (
          <div className="legend-row" key={s.label}>
            <span className="sw" style={{ background: s.color }} />
            {s.label}
            <span className="n">{s.value} ({Math.round((s.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
