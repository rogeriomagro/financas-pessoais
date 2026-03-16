import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TransactionRow } from '@/types/app';
import type { TransactionKind } from '@/types/database';

export interface TransactionFilters {
  yearMonth?: string;
  kind?: TransactionKind;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getTransactions(
  filters: TransactionFilters = {}
): Promise<{ rows: TransactionRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const { yearMonth, kind, categoryId, search, page = 1, pageSize = 50 } = filters;

  type RawRow = {
    id: string;
    date: string;
    description: string;
    kind: string;
    amount_brl: number;
    is_fixed: boolean;
    category_source: string;
    categories: Array<{ name: string; slug: string; color_hex: string }>;
    merchants: Array<{ display_name: string }>;
  };

  let query = supabase
    .from('transactions')
    .select(`
      id,
      date,
      description,
      kind,
      amount_brl,
      is_fixed,
      category_source,
      categories (name, slug, color_hex),
      merchants (display_name)
    `, { count: 'exact' })
    .order('date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (yearMonth) {
    query = query.eq('reference_month', `${yearMonth}-01`);
  }
  if (kind) {
    query = query.eq('kind', kind);
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  if (search) {
    query = query.ilike('description', `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`getTransactions: ${error.message}`);

  const rows: TransactionRow[] = ((data as unknown as RawRow[]) ?? []).map((row) => {
    const cat = Array.isArray(row.categories) ? row.categories[0] : null;
    const merchant = Array.isArray(row.merchants) ? row.merchants[0] : null;
    return {
      id: row.id,
      date: row.date,
      description: row.description,
      kind: row.kind as TransactionKind,
      amountBrl: Number(row.amount_brl),
      isFixed: row.is_fixed,
      categoryName: cat?.name ?? null,
      categorySlug: cat?.slug ?? null,
      colorHex: cat?.color_hex ?? null,
      merchantName: merchant?.display_name ?? null,
      categorySource: row.category_source,
    };
  });

  return { rows, total: count ?? 0 };
}

export async function getTransactionById(id: string) {
  const supabase = await createSupabaseServerClient();

  const [txResult, auditResult] = await Promise.all([
    supabase
      .from('transactions')
      .select(`
        id,
        date,
        description,
        kind,
        amount_brl,
        is_fixed,
        source_type,
        category_source,
        categories (id, name, slug, color_hex),
        merchants (id, name, display_name),
        accounts (id, name, type)
      `)
      .eq('id', id)
      .single(),

    supabase
      .from('audit_log')
      .select('id, action, actor, reason, old_value, new_value, created_at')
      .eq('row_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (txResult.error) throw new Error(`getTransactionById: ${txResult.error.message}`);

  return {
    transaction: txResult.data as Record<string, unknown>,
    auditLog: (auditResult.data ?? []) as Array<{
      id: string;
      action: string;
      actor: string;
      reason: string | null;
      old_value: unknown;
      new_value: unknown;
      created_at: string;
    }>,
  };
}
