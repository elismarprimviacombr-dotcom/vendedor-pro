export function numeroOuNull(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
export function textoOuNull(v) {
  if (v === '' || v === undefined) return null;
  return v;
}
export function dataOuNull(v) {
  if (!v || v.trim() === '') return null;
  return v;
}
export function normalizarNumeros(obj, campos) {
  const copia = { ...obj };
  campos.forEach((campo) => { copia[campo] = numeroOuNull(copia[campo]); });
  return copia;
}
