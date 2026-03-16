import { createHash } from 'crypto';

/**
 * raw_hash: identifica uma linha bruta dentro de uma fonte.
 * Previne duplicatas ao re-importar o mesmo arquivo.
 */
export function computeRawHash(
  sourceFile: string,
  sheetName: string,
  rowIndex: number,
  rawData: Record<string, unknown>
): string {
  const sortedData = JSON.stringify(
    Object.fromEntries(Object.entries(rawData).sort(([a], [b]) => a.localeCompare(b)))
  );
  const canonical = `${sourceFile}|${sheetName}|${rowIndex}|${sortedData}`;
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * file_hash: identifica o arquivo binário inteiro.
 * Previne reprocessar o mesmo arquivo mesmo com nome diferente.
 */
export function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * transaction_fingerprint: identifica uma transação normalizada.
 * Permite detectar duplicatas entre fontes distintas
 * (ex: mesmo gasto no Excel e num OFX).
 *
 * Retorna null se os dados forem insuficientes para uma fingerprint confiável.
 */
export function computeTransactionFingerprint(
  date: Date,
  amountBrl: number,
  description: string
): string | null {
  if (!date || isNaN(date.getTime()) || isNaN(amountBrl)) return null;

  const normalizedDesc = normalizeDescription(description);
  if (!normalizedDesc) return null;

  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const amountStr = Math.abs(amountBrl).toFixed(2);

  const canonical = `${dateStr}|${amountStr}|${normalizedDesc}`;
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** Remove acentos, pontuação e normaliza espaços para comparação entre fontes */
function normalizeDescription(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100); // limita tamanho para evitar colisões por ruído
}
