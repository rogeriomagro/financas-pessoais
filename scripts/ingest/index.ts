/**
 * Script principal de ingestão.
 *
 * Uso:
 *   EXCEL_DIR="C:/Users/User/Desktop/Finanças" npx tsx scripts/ingest/index.ts
 *
 * Variáveis de ambiente necessárias (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   EXCEL_DIR (opcional, default: C:/Users/User/Desktop/Finanças)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';

import { supabase } from './supabase-client.js';
import { XlsxAdapter } from './adapters/xlsx.js';
import { CsvAdapter } from './adapters/csv.js';
import { OfxAdapter } from './adapters/ofx.js';
import { PdfTextAdapter } from './adapters/pdf-text.js';
import { PdfOcrAdapter } from './adapters/pdf-ocr.js';
import type { IAdapter } from './adapters/base.js';
import { computeFileHash, computeRawHash, computeTransactionFingerprint } from './hash.js';
import { uploadOriginalFile } from './storage.js';
import {
  detectMerchant,
  resolveCategoryId,
  inferKind,
  extractReferenceMonth,
  toIsoDate,
} from './normalize.js';
import type { CategoryRow, MerchantRow, IngestStats } from './types.js';

const EXCEL_DIR = process.env.EXCEL_DIR ?? 'C:/Users/User/Desktop/Finanças';

const ADAPTERS: IAdapter[] = [
  new XlsxAdapter(),
  new CsvAdapter(),
  new OfxAdapter(),
  new PdfTextAdapter(),
];
const PDF_OCR_ADAPTER = new PdfOcrAdapter();

async function main(): Promise<void> {
  console.log(`\n=== Ingestão iniciada ===`);
  console.log(`Diretório: ${EXCEL_DIR}\n`);

  // 1. Buscar categorias e merchants para resolução
  const categories = await fetchCategories();
  const merchants = await fetchMerchants();
  console.log(`Categorias carregadas: ${categories.length}`);
  console.log(`Merchants carregados: ${merchants.length}\n`);

  // 2. Criar batch de importação
  const { data: batch, error: batchError } = await supabase
    .from('import_batches')
    .insert({ status: 'running' })
    .select('id')
    .single();

  if (batchError || !batch) {
    throw new Error(`Falha ao criar import_batch: ${batchError?.message}`);
  }

  const batchId = batch.id;
  const globalStats: IngestStats = { totalRows: 0, inserted: 0, skipped: 0, errors: 0, reviewQueued: 0 };

  // 3. Encontrar todos os arquivos suportados
  // Usa cwd para evitar problemas com caracteres especiais (ç) no path no Windows.
  // Ignora o projeto Next.js e node_modules que podem estar em subpastas.
  const files = await glob(
    ['**/*.xlsx', '**/*.xlsm', '**/*.csv', '**/*.ofx', '**/*.qfx', '**/*.pdf'],
    {
      cwd: EXCEL_DIR,
      absolute: true,
      ignore: ['**/financas-pessoais/**', '**/node_modules/**', '**/.git/**'],
    }
  );

  console.log(`Arquivos encontrados: ${files.length}\n`);

  for (const filePath of files) {
    await processFile(filePath, batchId, categories, merchants, globalStats);
  }

  // 4. Atualizar batch com resultados
  await supabase.from('import_batches').update({
    finished_at: new Date().toISOString(),
    status: 'completed',
    total_files: files.length,
    total_rows: globalStats.totalRows,
    inserted: globalStats.inserted,
    skipped: globalStats.skipped,
    errors: globalStats.errors,
    notes: `review_queue: ${globalStats.reviewQueued}`,
  }).eq('id', batchId);

  console.log('\n=== Ingestão concluída ===');
  console.log(`Total rows:     ${globalStats.totalRows}`);
  console.log(`Inseridos:      ${globalStats.inserted}`);
  console.log(`Ignorados:      ${globalStats.skipped}`);
  console.log(`Erros:          ${globalStats.errors}`);
  console.log(`Review queue:   ${globalStats.reviewQueued}`);
}

async function processFile(
  filePath: string,
  batchId: string,
  categories: CategoryRow[],
  merchants: MerchantRow[],
  stats: IngestStats
): Promise<void> {
  const fileName = path.basename(filePath);
  console.log(`Processando: ${fileName}`);

  // Selecionar adaptador
  const adapter = ADAPTERS.find((a) => a.canHandle(filePath));
  if (!adapter) {
    console.log(`  → Sem adaptador para ${fileName}, ignorando.`);
    return;
  }

  // Dedup de arquivo via file_hash
  const fileBuffer = fs.readFileSync(filePath);
  const fileHash = computeFileHash(fileBuffer);

  // Fazer upload para Storage antes de registrar
  let storagePath: string;
  try {
    storagePath = await uploadOriginalFile(supabase, filePath, batchId);
  } catch (err) {
    console.error(`  → Falha no upload para Storage: ${(err as Error).message}`);
    storagePath = `(upload-failed)/${fileName}`;
  }

  // Inserir import_file (ON CONFLICT → arquivo já processado)
  const { data: importFile, error: fileError } = await supabase
    .from('import_files')
    .insert({
      batch_id: batchId,
      original_name: fileName,
      storage_path: storagePath,
      adapter: adapter.name,
      file_hash: fileHash,
      row_count: 0,
    })
    .select('id')
    .single();

  if (fileError) {
    if (fileError.code === '23505') {
      // file_hash já existe → arquivo já foi processado
      console.log(`  → Arquivo já importado (file_hash duplicado), pulando.`);
      return;
    }
    console.error(`  → Erro ao registrar arquivo: ${fileError.message}`);
    stats.errors++;
    return;
  }

  const importFileId = importFile!.id;

  // Parse
  let rows;
  try {
    rows = await adapter.parse(filePath);

    // PDF: tenta OCR se nenhuma transação foi extraída
    if (rows.length === 0 && adapter.name === 'pdf-text') {
      console.log(`  → PDF sem texto extraído, tentando OCR...`);
      rows = await PDF_OCR_ADAPTER.parse(filePath);
    }
  } catch (err) {
    console.error(`  → Erro ao parsear ${fileName}: ${(err as Error).message}`);
    stats.errors++;
    return;
  }

  console.log(`  → ${rows.length} linhas extraídas`);
  stats.totalRows += rows.length;

  // Atualizar row_count no import_file
  await supabase.from('import_files').update({ row_count: rows.length }).eq('id', importFileId);

  // Processar cada linha
  for (const row of rows) {
    try {
      await processRow(row, filePath, importFileId, categories, merchants, stats);
    } catch (err) {
      console.error(`  → Erro na linha ${row.rowIndex}: ${(err as Error).message}`);
      stats.errors++;
    }
  }
}

async function processRow(
  row: { date: Date; description: string; amount: number; rawData: Record<string, unknown>; rowIndex: number; sheetName?: string },
  filePath: string,
  importFileId: string,
  categories: CategoryRow[],
  merchants: MerchantRow[],
  stats: IngestStats
): Promise<void> {
  const fileName = path.basename(filePath);
  const sheetName = row.sheetName ?? '';

  // Camada 1: raw_hash (dedup intra-fonte)
  const rawHash = computeRawHash(fileName, sheetName, row.rowIndex, row.rawData);

  const { data: rawRow, error: rawError } = await supabase
    .from('raw_rows')
    .insert({
      import_file_id: importFileId,
      row_index: row.rowIndex,
      raw_data: row.rawData,
      raw_hash: rawHash,
    })
    .select('id')
    .single();

  if (rawError) {
    if (rawError.code === '23505') {
      stats.skipped++;
      return;
    }
    throw new Error(`raw_rows insert: ${rawError.message}`);
  }

  // Normalização
  const categoryName = String(row.rawData['Categoria'] ?? row.rawData['categoria'] ?? '');
  const merchant = detectMerchant(row.description, merchants);
  const categoryId = merchant?.category_id ?? resolveCategoryId(categoryName, categories);
  const categorySource = merchant ? 'merchant' : categoryName ? 'excel' : 'rule';
  const kind = inferKind(categoryName, row.amount);
  const refMonth = extractReferenceMonth(filePath, row.date);
  const amountBrl = Math.abs(row.amount);
  const isFixed = filePath.toLowerCase().includes('gastos fixos');

  // Camada 2: transaction_fingerprint (dedup entre fontes)
  const fingerprint = computeTransactionFingerprint(row.date, amountBrl, row.description);

  // Inserir transação
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      raw_row_id: rawRow!.id,
      kind,
      date: toIsoDate(row.date),
      description: row.description,
      category_id: categoryId,
      merchant_id: merchant?.id ?? null,
      account_id: null,
      amount_brl: amountBrl,
      is_fixed: isFixed,
      source_type: filePath.toLowerCase().includes('gastos fixos') ? 'fixed' : 'monthly',
      reference_month: toIsoDate(refMonth),
      transaction_fingerprint: fingerprint,
      category_source: categorySource,
    })
    .select('id')
    .single();

  if (txError) {
    if (txError.code === '23505' && fingerprint) {
      // transaction_fingerprint duplicado → enfileirar para revisão
      await supabase.from('review_queue').insert({
        transaction_id: rawRow!.id, // referência ao raw, transaction não foi inserida
        reason: 'duplicate_fingerprint',
        details: { fingerprint, fileName, rowIndex: row.rowIndex },
      });
      stats.reviewQueued++;
      stats.skipped++;
      return;
    }
    if (txError.code === '23505') {
      // raw_row_id unique → já havia transação para esta linha
      stats.skipped++;
      return;
    }
    throw new Error(`transactions insert: ${txError.message}`);
  }

  // Audit log de ingestão
  await supabase.from('audit_log').insert({
    table_name: 'transactions',
    row_id: tx!.id,
    action: 'ingest',
    actor: 'ingest_script',
    new_value: { fileName, rowIndex: row.rowIndex, raw_hash: rawHash, kind, category_source: categorySource },
  });

  // Audit log de merchant detection
  if (merchant) {
    await supabase.from('audit_log').insert({
      table_name: 'transactions',
      row_id: tx!.id,
      action: 'merchant_linked',
      actor: 'ingest_script',
      new_value: { merchant_id: merchant.id, merchant_name: merchant.name },
    });
  }

  stats.inserted++;
}

async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from('categories').select('id, name, slug');
  if (error) throw new Error(`Falha ao buscar categorias: ${error.message}`);
  return data ?? [];
}

async function fetchMerchants(): Promise<MerchantRow[]> {
  const { data, error } = await supabase
    .from('merchants')
    .select('id, name, display_name, category_id, match_patterns');
  if (error) throw new Error(`Falha ao buscar merchants: ${error.message}`);
  return data ?? [];
}

main().catch((err) => {
  console.error('\nERRO FATAL:', err);
  process.exit(1);
});
