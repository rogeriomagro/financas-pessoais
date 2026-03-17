/**
 * Script de extração de receita mensal (Salário Final) dos arquivos xlsx.
 *
 * Cobertura: 2024 (parcial) e 2025/2026 (completo).
 * 2023: campo "Salário Final" não existia — sem dados disponíveis.
 *
 * Execução:
 *   npx tsx scripts/ingest/extract-income.ts
 *
 * Fonte: Planilha1, header "Salário Final" (cols 8-15, linhas 0-4),
 *        valor na linha imediatamente abaixo do header.
 *
 * Precedência no dashboard:
 *   1. SUM(transactions WHERE kind = 'income') — quando existir
 *   2. monthly_income.amount_brl — este script (fallback explícito)
 *   3. 0 — sem dados de receita disponíveis
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';
import * as XLSX from 'xlsx';
import { supabase } from './supabase-client.js';

const EXCEL_DIR = process.env.EXCEL_DIR ?? 'C:/Users/User/Desktop/Finanças';

/** Mapeia nomes de mês em PT para índice 0-based */
const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, fervereiro: 1, março: 2, marco: 2,
  abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7,
  setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

interface ExtractedIncome {
  filePath: string;
  yearMonth: string;    // "YYYY-MM-01"
  amountBrl: number;
  sourceFile: string;
}

/**
 * Extrai o valor de "Salário Final" da Planilha1.
 * Procura o header "Salário Final" nas primeiras linhas/colunas da seção direita.
 * Retorna null se não encontrado.
 */
function extractSalarioFinal(filePath: string): number | null {
  const wb = XLSX.readFile(filePath);

  // Preferir Planilha1; fallback para o segundo sheet
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes('planilha1')) ??
    wb.SheetNames[1] ??
    wb.SheetNames[0];

  if (!sheetName) return null;

  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];

  // Procura nas primeiras 6 linhas, colunas 8 a 15
  for (let r = 0; r < Math.min(6, data.length); r++) {
    const row = Array.isArray(data[r]) ? data[r] as unknown[] : [];
    for (let c = 8; c <= 15; c++) {
      const cell = row[c];
      if (
        typeof cell === 'string' &&
        cell.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('salario final')
      ) {
        // Valor está na linha seguinte, mesma coluna
        const nextRow = Array.isArray(data[r + 1]) ? data[r + 1] as unknown[] : [];
        const val = nextRow[c];
        if (typeof val === 'number' && val > 0) return val;
      }
    }
  }

  return null;
}

/**
 * Extrai o mês de referência a partir do caminho do arquivo.
 * Usa o nome do diretório pai como ano e o nome do arquivo para o mês.
 * Ex: ".../2025/Controle de Gastos - Dezembro.xlsm" → "2025-12-01"
 */
function extractYearMonth(filePath: string): string | null {
  const parts   = filePath.replace(/\\/g, '/').split('/');
  const fileName = parts[parts.length - 1] ?? '';
  const dirName  = parts[parts.length - 2] ?? '';

  // Ano do diretório (ex: "2025")
  const dirYear = parseInt(dirName, 10);
  const year    = !isNaN(dirYear) && dirYear >= 2000 && dirYear <= 2100 ? dirYear : null;
  if (!year) return null;

  // Mês do nome do arquivo
  const normalized = fileName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [name, monthIndex] of Object.entries(MONTH_MAP)) {
    if (normalized.includes(name)) {
      const month = String(monthIndex + 1).padStart(2, '0');
      return `${year}-${month}-01`;
    }
  }

  return null;
}

async function main(): Promise<void> {
  console.log('\n=== Extração de receita mensal (Salário Final) ===\n');

  const files = await glob(['**/*.xlsm', '**/*.xlsx'], {
    cwd: EXCEL_DIR,
    absolute: true,
    ignore: ['**/financas-pessoais/**', '**/node_modules/**'],
  });

  const extracted: ExtractedIncome[] = [];
  const skipped: string[] = [];

  for (const filePath of files.sort()) {
    const fileName = path.basename(filePath);
    const yearMonth = extractYearMonth(filePath);

    if (!yearMonth) {
      skipped.push(`${fileName}: não foi possível extrair mês/ano`);
      continue;
    }

    let amount: number | null;
    try {
      amount = extractSalarioFinal(filePath);
    } catch (err) {
      skipped.push(`${fileName}: erro ao ler arquivo — ${(err as Error).message}`);
      continue;
    }

    if (amount === null) {
      skipped.push(`${fileName}: campo "Salário Final" não encontrado`);
      continue;
    }

    extracted.push({
      filePath,
      yearMonth,
      amountBrl: amount,
      sourceFile: fileName,
    });

    console.log(`  OK  | ${yearMonth.slice(0, 7)} | R$ ${amount.toFixed(2).padStart(10)} | ${fileName}`);
  }

  if (extracted.length === 0) {
    console.log('\nNenhum dado de receita encontrado.');
    return;
  }

  console.log(`\n${extracted.length} entradas extraídas. Inserindo no banco...\n`);

  // Upsert em monthly_income — ON CONFLICT por year_month, atualiza se valor diferente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('monthly_income') as any).upsert(
    extracted.map((e) => ({
      year_month:  e.yearMonth,
      amount_brl:  e.amountBrl,
      source:      'excel_salario_final',
      source_file: e.sourceFile,
    })),
    { onConflict: 'year_month' }
  );

  if (error) {
    console.error('Erro ao inserir:', error.message);
    process.exit(1);
  }

  console.log(`Inseridos/atualizados: ${extracted.length}`);

  if (skipped.length > 0) {
    console.log(`\nIgnorados (${skipped.length}):`);
    skipped.forEach((s) => console.log('  N/A |', s));
  }

  console.log('\n=== Concluído ===');
}

main().catch((err) => {
  console.error('\nERRO FATAL:', err);
  process.exit(1);
});
