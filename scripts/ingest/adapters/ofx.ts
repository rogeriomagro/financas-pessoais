import fs from 'fs';
import path from 'path';
import type { IAdapter, ParsedRow } from './base.js';

/**
 * Adaptador para arquivos OFX/QIF — extratos de bancos tradicionais.
 * Parse manual de OFX (SGML/XML) sem dependência externa pesada.
 */
export class OfxAdapter implements IAdapter {
  readonly name = 'ofx' as const;

  canHandle(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.ofx' || ext === '.qfx';
  }

  async parse(filePath: string): Promise<ParsedRow[]> {
    const content = fs.readFileSync(filePath, 'latin1');
    return parseOfxContent(content);
  }
}

function parseOfxContent(content: string): ParsedRow[] {
  const results: ParsedRow[] = [];
  // Extrai blocos <STMTTRN>...</STMTTRN>
  const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = stmtRegex.exec(content)) !== null) {
    const block = match[1];
    const row = parseStmtTrn(block, index + 1);
    if (row) {
      results.push(row);
      index++;
    }
  }

  return results;
}

function parseStmtTrn(block: string, rowIndex: number): ParsedRow | null {
  const get = (tag: string): string | null => {
    const m = block.match(new RegExp(`<${tag}>([^<\\n]+)`, 'i'));
    return m ? m[1].trim() : null;
  };

  const dateStr = get('DTPOSTED');
  const amountStr = get('TRNAMT');
  const memo = get('MEMO') ?? get('NAME') ?? 'Sem descrição';

  if (!dateStr || !amountStr) return null;

  const date = parseOfxDate(dateStr);
  if (!date) return null;

  const amount = parseFloat(amountStr.replace(',', '.'));
  if (isNaN(amount)) return null;

  const rawData: Record<string, unknown> = {
    TRNTYPE: get('TRNTYPE'),
    DTPOSTED: dateStr,
    TRNAMT: amountStr,
    FITID: get('FITID'),
    MEMO: memo,
    NAME: get('NAME'),
  };

  return {
    date,
    // OFX: negativo = débito (gasto), positivo = crédito
    // Inverte para nossa convenção: positivo = gasto
    amount: -amount,
    description: memo,
    rawData,
    rowIndex,
  };
}

/** OFX date format: YYYYMMDD ou YYYYMMDDHHMMSS */
function parseOfxDate(str: string): Date | null {
  const m = str.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
