import fs from 'fs';
import path from 'path';
import type { IAdapter, ParsedRow } from './base.js';

/**
 * Adaptador para CSV genérico — exportações de Nubank, Itaú, etc.
 * Usa parse manual (sem PapaParse) para evitar problemas de tipagem.
 */
export class CsvAdapter implements IAdapter {
  readonly name = 'csv' as const;

  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.csv';
  }

  async parse(filePath: string): Promise<ParsedRow[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseCsvContent(content);
  }
}

function parseCsvContent(content: string): ParsedRow[] {
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const results: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      if (h) row[h] = values[j] ?? '';
    });

    const parsed = tryParseRow(row, i + 1);
    if (parsed) results.push(parsed);
  }

  return results;
}

/** Divide linha CSV respeitando aspas */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const DATE_KEYS = ['data', 'date', 'Data', 'Date', 'DT_LANCAMENTO', 'dt_lancamento'];
const AMOUNT_KEYS = ['valor', 'value', 'Valor', 'amount', 'Amount', 'VL_LANCAMENTO', 'vl_lancamento'];
const DESC_KEYS = ['descricao', 'description', 'Descricao', 'Descrição', 'Description', 'titulo', 'Titulo', 'memo'];

function findKey(row: Record<string, string>, candidates: string[]): string | null {
  return candidates.find((k) => k in row) ?? null;
}

function tryParseRow(row: Record<string, string>, rowIndex: number): ParsedRow | null {
  const dateKey = findKey(row, DATE_KEYS);
  const amountKey = findKey(row, AMOUNT_KEYS);
  const descKey = findKey(row, DESC_KEYS);

  if (!dateKey || !amountKey) return null;

  const dateStr = row[dateKey]?.trim();
  const amountStr = row[amountKey]?.trim();

  if (!dateStr || !amountStr) return null;

  const date = parseDate(dateStr);
  if (!date) return null;

  const amount = parseAmount(amountStr);
  if (isNaN(amount) || amount === 0) return null;

  const description = descKey ? (row[descKey]?.trim() ?? 'Sem descrição') : 'Sem descrição';

  return {
    date,
    description,
    amount,
    rawData: row as Record<string, unknown>,
    rowIndex,
  };
}

function parseDate(str: string): Date | null {
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));

  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  return null;
}

function parseAmount(str: string): number {
  const cleaned = str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}
