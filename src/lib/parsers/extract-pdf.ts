import crypto from 'crypto';

export type ParsedKind = 'expense' | 'income' | 'investment' | 'savings' | 'internal_transfer';

export interface ParsedTransaction {
  date: string;        // "YYYY-MM-DD"
  description: string;
  amountBrl: number;   // always positive
  kind: ParsedKind;
  fingerprint: string;
}

export interface ParseResult {
  bank: string;
  period: string;
  transactions: ParsedTransaction[];
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

export function computeFingerprint(date: string, amountBrl: number, description: string): string {
  const str = `${date}|${Math.round(amountBrl * 100)}|${normalize(description)}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

function parseBRL(str: string): number {
  return parseFloat(str.replace(/\./g, '').replace(',', '.'));
}

// ── Sicredi ──────────────────────────────────────────────────────────────────
// Formato A (1 linha): "DD/MM/YYYYdescricao- R$ X,XX"  (sem espaço data↔desc)
// Formato B (multi):   "DD/MM/YYYY" sozinho, depois desc(s), depois "[+-] R$ X,XX"

const SICREDI_OWN_CPF  = '08301240636';
const SICREDI_OWN_NAME = /ROGERIO MAGRO DIAS|RogÃ.rio Magro Dias/i;

const SICREDI_SKIP = /^(Saldo (do dia|anterior|em conta|bloqueado)|Movimenta|DataDescri|Titular|Dados|Cooperativa|Per[íi]odo|Momento|Cheque|Fim |Central|SAC|Ouvidoria|ola@|0800|Este produto|Lan[çc]amento a|Bloqueio|N[ãa]o est[áa])/i;

function parseSicredi(text: string): ParsedTransaction[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results: ParsedTransaction[] = [];

  // A: data colada na descrição
  const singleRe = /^(\d{2}\/\d{2}\/\d{4})(.*?)\s*([+-])\s*R\$\s*([\d.]+,\d{2})\s*$/;
  // B: apenas a data na linha
  const dateOnlyRe = /^(\d{2}\/\d{2}\/\d{4})\s*$/;
  // linha de valor para formato B
  const amountLineRe = /^([+-])\s*R\$\s*([\d.]+,\d{2})\s*$/;

  const makeKind = (sign: string, desc: string): ParsedKind => {
    const isSelf = desc.includes(SICREDI_OWN_CPF) || SICREDI_OWN_NAME.test(desc);
    if (isSelf) return 'internal_transfer';
    return sign === '+' ? 'income' : 'expense';
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Formato A
    const sm = line.match(singleRe);
    if (sm) {
      const [, dateStr, rawDesc, sign, amountStr] = sm;
      const desc = rawDesc.trim();
      if (desc && !/^Saldo (do dia|anterior)/i.test(desc)) {
        const [dd, mm, yyyy] = dateStr.split('/');
        const date = `${yyyy}-${mm}-${dd}`;
        const amountBrl = parseBRL(amountStr);
        results.push({ date, description: desc, amountBrl, kind: makeKind(sign, desc), fingerprint: computeFingerprint(date, amountBrl, desc) });
      }
      i++;
      continue;
    }

    // Formato B
    const dm = line.match(dateOnlyRe);
    if (dm) {
      const descLines: string[] = [];
      let j = i + 1;
      let sign = '', amountStr = '', found = false;

      while (j < lines.length && j < i + 10) {
        const next = lines[j];
        if (next.match(dateOnlyRe) || next.match(singleRe)) break;
        const am = next.match(amountLineRe);
        if (am) { sign = am[1]; amountStr = am[2]; found = true; j++; break; }
        if (!SICREDI_SKIP.test(next)) descLines.push(next);
        j++;
      }

      if (found && descLines.length > 0) {
        const [dd, mm, yyyy] = dm[1].split('/');
        const date = `${yyyy}-${mm}-${dd}`;
        const description = descLines.join(' ').trim();
        const amountBrl = parseBRL(amountStr);
        results.push({ date, description, amountBrl, kind: makeKind(sign, description), fingerprint: computeFingerprint(date, amountBrl, description) });
      }
      i = found ? j : i + 1;
      continue;
    }

    i++;
  }

  return results;
}

// ── Nubank ────────────────────────────────────────────────────────────────────
// Formato: data "DD MMM YYYY", seção "Total de entradas/saídas[+-]X",
// transações: desc (multi-linha) + valor sozinho, OU desc+valor mesclados na mesma linha

const NUBANK_MONTHS: Record<string, string> = {
  jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
  jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
};

const NUBANK_SKIP = /^(Rogério|Rogerio|•••|Tem alguma|Caso |Extrato gerado|\d+ de \d+|Nu Financeira|Nu Pagamentos|CNPJ:|Atendimento|Asseguramos|Não nos|O saldo|fala com|Ouvidoria:|Deficiência|Movimentações|VALORES EM|Saldo (final|inicial|líquido|bloqueado)|Rendimento|a \d{2} DE|disponível|bloqueado:|\d{5,}-\d+)/i;

function parseNubank(text: string): ParsedTransaction[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  const dateRe      = /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(\d{4})$/i;
  const totalRe     = /^Total de (?:entradas|saídas|saidas)([+-])/i;
  const amountOnlyRe = /^([\d.]+,\d{2})$/;
  const endAmountRe  = /^(.+?)([\d.]+,\d{2})\s*$/;

  let currentDate = '';
  let currentSign: '+' | '-' = '+';
  let pendingDesc: string[] = [];

  const pushTx = (desc: string, amountBrl: number) => {
    desc = desc.replace(/\s+/g, ' ').trim();
    if (!currentDate || !desc) return;
    const dl = desc.toLowerCase();
    let kind: ParsedKind;
    if (dl.includes('resgate') || dl.includes('rdb') || dl.includes('cdb')) kind = 'investment';
    else kind = currentSign === '+' ? 'income' : 'expense';
    results.push({ date: currentDate, description: desc, amountBrl, kind, fingerprint: computeFingerprint(currentDate, amountBrl, desc) });
  };

  for (const line of lines) {
    const dm = line.match(dateRe);
    if (dm) {
      pendingDesc = [];
      const mm = NUBANK_MONTHS[dm[2].toLowerCase()];
      if (mm) currentDate = `${dm[3]}-${mm}-${dm[1].padStart(2, '0')}`;
      continue;
    }

    if (!currentDate) continue;

    const tm = line.match(totalRe);
    if (tm) {
      pendingDesc = [];
      currentSign = tm[1] === '+' ? '+' : '-';
      continue;
    }

    if (NUBANK_SKIP.test(line)) continue;

    // Valor sozinho → flush desc acumulado
    const sam = line.match(amountOnlyRe);
    if (sam) {
      if (pendingDesc.length > 0) {
        pushTx(pendingDesc.join(' '), parseBRL(sam[1]));
        pendingDesc = [];
      }
      continue;
    }

    // Linha terminando em valor (desc+valor mesclados) → transação completa em si só
    const em = line.match(endAmountRe);
    if (em && em[1].trim() && !/^[\d.\s]+$/.test(em[1])) {
      pendingDesc = [];
      pushTx(em[1].trim(), parseBRL(em[2]));
      continue;
    }

    pendingDesc.push(line);
  }

  return results;
}

// ── Banco Inter ───────────────────────────────────────────────────────────────
// Cada transação numa linha: Descrição[-]R$ valor[-]R$ saldo
// Data: "D de Mês de YYYY Saldo do dia: R$ X"

const INTER_MONTHS: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07', agosto: '08',
  setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
};

const INTER_OWN = /Rogerio Magro|08301240636|cp\s*:\s*(?:87900601|18236120)/i;

function parseInter(text: string): ParsedTransaction[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  // Data: "2 de Janeiro de 2026 Saldo do dia: ..."
  const dateRe = /^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i;
  // Linha de transação: desc + valor + saldo (dois R$ ao final, sem espaço entre eles)
  const txRe = /^(.+?)\s*(-?R\$\s*[\d.]+,\d{2})\s*(-?R\$\s*[\d.]+,\d{2})\s*$/;

  let currentDate = '';

  for (const line of lines) {
    const dm = line.match(dateRe);
    if (dm) {
      const monNorm = dm[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const mm = INTER_MONTHS[monNorm];
      if (mm) currentDate = `${dm[3]}-${mm}-${dm[1].padStart(2, '0')}`;
      continue;
    }

    if (!currentDate) continue;

    const tm = line.match(txRe);
    if (!tm) continue;

    const [, rawDesc, amountPart] = tm;

    // Parse valor (primeiro R$)
    const negative  = amountPart.trimStart().startsWith('-');
    const amountBrl = parseBRL(amountPart.replace(/[^0-9,.]/g, ''));

    // Limpa descrição
    let desc = rawDesc
      .replace(/"([^"]+)"/g, '$1')           // remove aspas
      .replace(/No estabelecimento\s*/i, '')
      .replace(/\s+BRA\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!desc) continue;

    const dl = desc.toLowerCase();
    let kind: ParsedKind;
    if (INTER_OWN.test(desc)) {
      kind = 'internal_transfer';
    } else if (dl.includes('aplicac') || dl.includes('aplicaç') || (dl.includes('cdb') && negative)) {
      kind = 'investment';
    } else if (dl.includes('resgate') || (dl.includes('cdb') && !negative)) {
      kind = 'investment';
    } else {
      kind = negative ? 'expense' : 'income';
    }

    results.push({ date: currentDate, description: desc, amountBrl, kind, fingerprint: computeFingerprint(currentDate, amountBrl, desc) });
  }

  return results;
}

// ── Bank detection ────────────────────────────────────────────────────────────

function detectBank(text: string, filename: string): 'sicredi' | 'nubank' | 'inter' | 'unknown' {
  const t = text.toLowerCase().slice(0, 2000);
  const f = filename.toLowerCase();
  if (f.includes('sicredi') || t.includes('sicredi') || t.includes('cooperativa:')) return 'sicredi';
  if (f.startsWith('nu_') || t.includes('nubank') || t.includes('nu financeira')) return 'nubank';
  if (f.includes('inter') || t.includes('banco inter') || t.includes('bancointer')) return 'inter';
  return 'unknown';
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseExtract(buffer: Buffer, filename: string): Promise<ParseResult> {
  // Use internal path to avoid pdf-parse/index.js loading its test PDF file at startup
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js');
  const { text } = await pdfParse(buffer);

  const bank = detectBank(text, filename);

  let transactions: ParsedTransaction[] = [];
  let bankLabel = 'Banco desconhecido';

  switch (bank) {
    case 'sicredi': transactions = parseSicredi(text); bankLabel = 'Sicredi'; break;
    case 'nubank':  transactions = parseNubank(text);  bankLabel = 'Nubank';  break;
    case 'inter':   transactions = parseInter(text);   bankLabel = 'Banco Inter'; break;
    default:        bankLabel = 'Não reconhecido'; break;
  }

  const dates  = transactions.map(t => t.date).sort();
  const period = dates.length > 0
    ? dates.length === 1 ? dates[0] : `${dates[0]} → ${dates[dates.length - 1]}`
    : '—';

  return { bank: bankLabel, period, transactions };
}
