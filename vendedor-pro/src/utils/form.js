/**
 * Converte string vazia em null antes de mandar pro banco. Campos
 * numéricos e de data no Postgres rejeitam "" (string vazia) — só
 * aceitam um número/data válido ou null. Sem isso, salvar um
 * formulário com um campo numérico opcional em branco falha.
 */
export function numeroOuNull(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function textoOuNull(v) {
  if (v === '' || v === undefined) return null;
  return v;
}

/**
 * Aplica numeroOuNull em uma lista de campos de um objeto, retornando
 * uma cópia nova (não modifica o original).
 */
export function normalizarNumeros(obj, campos) {
  const copia = { ...obj };
  campos.forEach((campo) => {
    copia[campo] = numeroOuNull(copia[campo]);
  });
  return copia;
}
