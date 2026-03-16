import * as xlsx from 'xlsx';
import path from 'path';
import type { IAdapter, ParsedRow } from './base.js';

/**
 * Adaptador para arquivos .xlsx e .xlsm do sistema de finanças.
 *
 * Detecta automaticamente a aba com dados de transações procurando
 * pelo cabeçalho que contém "Data" e "Valor". Suporta:
 * - Controle de Gastos - *.xlsm (colunas: Data, Local do Gasto, Categoria, Valor)
 * - Gastos Fixos.xlsx (múltiplas abas por mês)
 */
export class XlsxAdapter implements IAdapter {
  readonly name = 'xlsx' as const;

  canHandle(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.xlsx' || ext === '.xlsm';
  }

  async parse(filePath: string): Promise<ParsedRow[]> {
    const workbook = xlsx.readFile(filePath, {
      type: 'file',
      cellDates: false,
      cellNF: false,
      sheetStubs: false,
    });

    const results: ParsedRow[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      }) as unknown[][];

      const headerRowIndex = findHeaderRow(rows);
      if (headerRowIndex === -1) continue;

      const headers = (rows[headerRowIndex] as unknown[]).map((h) =>
        h != null ? String(h).trim() : ''
      );

      const dataRows = rows.slice(headerRowIndex + 1);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as unknown[];
        const rawData: Record<string, unknown> = {};
        headers.forEach((h, j) => {
          if (h) rawData[h] = row[j] ?? null;
        });

        const parsed = tryParseRow(rawData, sheetName, headerRowIndex + 2 + i);
        if (parsed) results.push(parsed);
      }
    }

    return results;
  }
}

/** Encontra a linha de cabeçalho que contém "Data" e "Valor" */
function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    if (!Array.isArray(row)) return false;
    const cells = row.map((c) => (c != null ? String(c).toLowerCase() : ''));
    return cells.some((c) => c === 'data') && cells.some((c) => c.includes('valor'));
  });
}

function tryParseRow(
  raw: Record<string, unknown>,
  sheetName: string,
  rowIndex: number
): ParsedRow | null {
  const dateRaw = raw['Data'] ?? raw['data'];
  const amountRaw = raw['Valor'] ?? raw['valor'];

  if (dateRaw == null || amountRaw == null) return null;

  const amount = toNumber(amountRaw);
  if (isNaN(amount) || amount === 0) return null;

  const date = parseExcelDate(dateRaw);
  if (!date || isNaN(date.getTime())) return null;

  const description =
    String(raw['Local do Gasto'] ?? raw['Descrição'] ?? raw['Descricao'] ?? raw['descricao'] ?? '').trim() ||
    String(raw['Categoria'] ?? raw['categoria'] ?? 'Sem descrição').trim();

  return {
    date,
    description,
    amount,
    rawData: raw,
    rowIndex,
    sheetName,
  };
}

function parseExcelDate(value: unknown): Date | null {
  if (value == null) return null;

  // Número serial do Excel (ex: 45678)
  if (typeof value === 'number') {
    const date = xlsx.SSF.parse_date_code(value);
    if (!date) return null;
    return new Date(date.y, date.m - 1, date.d);
  }

  // String DD/MM/YYYY ou YYYY-MM-DD
  const str = String(value).trim();
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s]/g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
  return NaN;
}
