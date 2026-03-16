import path from 'path';
import type { IAdapter, ParsedRow } from './base.js';

/**
 * Adaptador para PDFs escaneados (imagens) via OCR com Tesseract.js.
 *
 * NOTA: Requer tesseract.js instalado e o pacote de linguagem português.
 * Resultados são heurísticos e enfileirados na review_queue.
 *
 * Uso: apenas quando pdf-text não extrair texto suficiente.
 * O canHandle não é chamado diretamente — o index.ts tenta pdf-text
 * primeiro e usa pdf-ocr como fallback se nenhuma transação for extraída.
 */
export class PdfOcrAdapter implements IAdapter {
  readonly name = 'pdf-ocr' as const;

  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.pdf';
  }

  async parse(filePath: string): Promise<ParsedRow[]> {
    const { createWorker } = await import('tesseract.js');

    const worker = await createWorker('por');

    try {
      const { data: { text } } = await worker.recognize(filePath);
      return extractTransactionsFromOcrText(text);
    } finally {
      await worker.terminate();
    }
  }
}

function extractTransactionsFromOcrText(text: string): ParsedRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: ParsedRow[] = [];

  const lineRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(.+?)\s+([\d.,]+)/;

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
      rawData: { raw_line: lines[i], line_index: i, source: 'ocr' },
      rowIndex: i + 1,
    });
  }

  return results;
}

function parseDate(str: string): Date | null {
  const m = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}
