import * as XLSX from 'xlsx';

/**
 * Exporta uma ou mais listas como abas de um único arquivo .xlsx.
 * @param {string} nomeArquivo ex: "vendedor-pro-relatorio.xlsx"
 * @param {Array<{ nomeAba: string, linhas: object[] }>} abas
 */
export function exportarExcel(nomeArquivo, abas) {
  const livro = XLSX.utils.book_new();

  abas.forEach(({ nomeAba, linhas }) => {
    const planilha = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{}]);
    XLSX.utils.book_append_sheet(livro, planilha, nomeAba.slice(0, 31));
  });

  XLSX.writeFile(livro, nomeArquivo);
}
