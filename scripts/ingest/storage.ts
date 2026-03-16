import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Faz upload do arquivo original para o bucket 'raw-files' no Supabase Storage.
 * Retorna o storage_path para armazenar em import_files.
 *
 * O bucket deve ser privado (criado no painel do Supabase) e
 * acessível apenas via service role.
 */
/** Remove acentos e caracteres inválidos para chaves do Supabase Storage */
export function sanitizeStorageKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos (ç→c, ã→a, etc.)
    .replace(/[^a-zA-Z0-9._\-]/g, '_'); // substitui o resto por underscore
}

export async function uploadOriginalFile(
  supabase: SupabaseClient,
  filePath: string,
  batchId: string
): Promise<string> {
  const fileName = path.basename(filePath);
  const safeFileName = sanitizeStorageKey(fileName);
  const storagePath = `${batchId}/${safeFileName}`;
  const fileBuffer = fs.readFileSync(filePath);

  const { error } = await supabase.storage
    .from('raw-files')
    .upload(storagePath, fileBuffer, { upsert: false });

  if (error) {
    throw new Error(`Storage upload failed for ${fileName}: ${error.message}`);
  }

  return storagePath;
}
