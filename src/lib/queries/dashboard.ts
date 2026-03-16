import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CategoryTotal, MonthlyTrend, DashboardPreferences } from '@/types/app';
import type { TransactionKind } from '@/types/database';

export async function getDashboardPreferences(): Promise<DashboardPreferences> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('dashboard_preferences')
    .select('*')
    .single();

  if (error || !data) {
    return {
      id: '',
      hideInternalTransfers: true,
      hideInvestments: false,
      defaultMonthOffset: 0,
    };
  }

  const row = data as {
    id: string;
    hide_internal_transfers: boolean;
    hide_investments: boolean;
    default_month_offset: number;
  };

  return {
    id: row.id,
    hideInternalTransfers: row.hide_internal_transfers,
    hideInvestments: row.hide_investments,
    defaultMonthOffset: row.default_month_offset,
  };
}

/**
 * Totais por categoria para um mês específico.
 * internal_transfer NUNCA entra nos totais.
 */
export async function getMonthlyTotals(
  yearMonth: string,
  prefs: DashboardPreferences
): Promise<CategoryTotal[]> {
  const supabase = await createSupabaseServerClient();
  const monthStart = `${yearMonth}-01`;

  const excludedKinds: TransactionKind[] = ['internal_transfer', 'income'];
  if (prefs.hideInvestments) {
    excludedKinds.push('investment', 'savings');
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      amount_brl,
      kind,
      categories (
        id,
        name,
        slug,
        color_hex
      )
    `)
    .eq('reference_month', monthStart)
    .eq('kind', 'expense')
    .not('category_id', 'is', null);

  if (error) throw new Error(`getMonthlyTotals: ${error.message}`);

  const totalsMap = new Map<string, CategoryTotal>();

  type RawRow = {
    id: string;
    amount_brl: number;
    kind: string;
    categories: Array<{ id: string; name: string; slug: string; color_hex: string }>;
  };

  for (const row of (data as unknown as RawRow[]) ?? []) {
    // Filtro adicional de kinds excluídos
    if (excludedKinds.includes(row.kind as TransactionKind)) continue;

    // Supabase retorna join como array
    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    if (!cat) continue;

    const existing = totalsMap.get(cat.id);
    if (existing) {
      existing.totalBrl += Number(row.amount_brl);
      existing.transactionCount += 1;
    } else {
      totalsMap.set(cat.id, {
        categoryId: cat.id,
        categoryName: cat.name,
        categorySlug: cat.slug,
        colorHex: cat.color_hex,
        totalBrl: Number(row.amount_brl),
        transactionCount: 1,
      });
    }
  }

  return [...totalsMap.values()].sort((a, b) => b.totalBrl - a.totalBrl);
}

export async function getMonthlyTrend(
  monthsBack: number,
  prefs: DashboardPreferences
): Promise<MonthlyTrend[]> {
  const supabase = await createSupabaseServerClient();

  const excludedKinds: TransactionKind[] = ['internal_transfer', 'income'];
  if (prefs.hideInvestments) excludedKinds.push('investment', 'savings');

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
  const fromStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('transactions')
    .select('reference_month, amount_brl, kind')
    .gte('reference_month', fromStr)
    .eq('kind', 'expense');

  if (error) throw new Error(`getMonthlyTrend: ${error.message}`);

  const monthMap = new Map<string, { totalBrl: number; count: number }>();

  for (const row of (data ?? []) as unknown as Array<{
    reference_month: string;
    amount_brl: number;
    kind: string;
  }>) {
    if (excludedKinds.includes(row.kind as TransactionKind)) continue;

    const month = row.reference_month.slice(0, 7);
    const existing = monthMap.get(month);
    if (existing) {
      existing.totalBrl += Number(row.amount_brl);
      existing.count += 1;
    } else {
      monthMap.set(month, { totalBrl: Number(row.amount_brl), count: 1 });
    }
  }

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { totalBrl, count }]) => ({
      month,
      totalBrl,
      transactionCount: count,
    }));
}

export async function getMonthSummary(
  yearMonth: string,
  prefs: DashboardPreferences
): Promise<{ total: number; count: number; topCategory: CategoryTotal | null }> {
  const totals = await getMonthlyTotals(yearMonth, prefs);
  const total = totals.reduce((sum, t) => sum + t.totalBrl, 0);
  const count = totals.reduce((sum, t) => sum + t.transactionCount, 0);

  return {
    total,
    count,
    topCategory: totals[0] ?? null,
  };
}
