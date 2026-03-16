import path from 'path';
import type { IAdapter, ParsedRow } from './base.js';

export class PdfTextAdapter implements IAdapter {
  readonly name = 'pdf-text' as const;

  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.pdf';
  }

  async parse(filePath: string): Promise<ParsedRow[]> {
    const fs = await import('fs');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);

    return extractTransactionsFromText(data.text);
  }
}

function extractTransactionsFromText(text: string): ParsedRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: ParsedRow[] = [];

  const lineRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)$/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(lineRegex);
    if (!m) continue;

    const [, dateStr, description, amountStr] = m;

    const date = parseDate(dateStr);
    if (!date) continue;

    const amount = parseFloat(amountStr.replace('.', '').replace(',', '.'));
    if (isNaN(amount)) continue;

    results.push({
      date,
      description: description.trim(),
      amount,
      rawData: { raw_line: lines[i], line_index: i },
      rowIndex: i + 1,
    });
  }

  return results;
}

function parseDate(str: string): Date | null {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}
