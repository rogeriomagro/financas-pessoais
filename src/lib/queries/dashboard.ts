import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  CategoryTotal,
  MonthlyTrend,
  DashboardPreferences,
  CashflowSummary,
  GroupTotal,
  FixedVarSummary,
} from '@/types/app';
import type { TransactionKind } from '@/types/database';

export async function getDashboardPreferences(): Promise<DashboardPreferences> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('dashboard_preferences')
    .select('*')
    .single();

  if (error || !data) {
    return { id: '', hideInternalTransfers: true, hideInvestments: false, defaultMonthOffset: 0 };
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
 * Fluxo de caixa completo do mês.
 * internal_transfer NUNCA entra no cálculo.
 *
 * Precedência da receita (incomeBrl):
 *   1. SUM(transactions WHERE kind = 'income') — fonte explícita e correta
 *   2. monthly_income.amount_brl              — fallback: "Salário Final" do xlsx
 *      (cobertura: 2024 parcial, 2025/2026 completo; 2023 sem dados)
 *   3. 0                                      — sem dados de receita disponíveis
 */
export async function getMonthlyCashflow(yearMonth: string): Promise<CashflowSummary> {
  const supabase = await createSupabaseServerClient();
  const monthStart = `${yearMonth}-01`;

  const [{ data: txData, error: txError }, { data: miData }] = await Promise.all([
    supabase
      .from('transactions')
      .select('kind, amount_brl')
      .eq('reference_month', monthStart)
      .neq('kind', 'internal_transfer'),
    supabase
      .from('monthly_income')
      .select('amount_brl, source')
      .eq('year_month', monthStart)
      .maybeSingle(),
  ]);

  if (txError) throw new Error(`getMonthlyCashflow: ${txError.message}`);

  let incomeBrl = 0, expenseBrl = 0, savingsBrl = 0, investmentBrl = 0;
  let incomeCount = 0, expenseCount = 0;

  for (const row of (txData ?? []) as Array<{ kind: string; amount_brl: number }>) {
    const amount = Number(row.amount_brl);
    switch (row.kind) {
      case 'income':     incomeBrl     += amount; incomeCount++;  break;
      case 'expense':    expenseBrl    += amount; expenseCount++; break;
      case 'savings':    savingsBrl    += amount;                 break;
      case 'investment': investmentBrl += amount;                 break;
    }
  }

  // Fallback: usa monthly_income se não houver transactions de income
  if (incomeBrl === 0 && miData) {
    incomeBrl = Number((miData as { amount_brl: number }).amount_brl);
  }

  const netBrl = incomeBrl - expenseBrl;

  return {
    incomeBrl,
    expenseBrl,
    savingsBrl,
    investmentBrl,
    netBrl,
    savingsRate: incomeBrl > 0 ? ((incomeBrl - expenseBrl) / incomeBrl) * 100 : null,
    incomeCount,
    expenseCount,
  };
}

/**
 * Totais por categoria para um mês (apenas expenses).
 */
export async function getMonthlyTotals(
  yearMonth: string,
  prefs: DashboardPreferences
): Promise<CategoryTotal[]> {
  const supabase = await createSupabaseServerClient();
  const monthStart = `${yearMonth}-01`;

  const excludedKinds: TransactionKind[] = ['internal_transfer', 'income'];
  if (prefs.hideInvestments) excludedKinds.push('investment', 'savings');

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
    if (excludedKinds.includes(row.kind as TransactionKind)) continue;

    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    if (!cat) continue;

    const existing = totalsMap.get(cat.id);
    if (existing) {
      existing.totalBrl        += Number(row.amount_brl);
      existing.transactionCount += 1;
    } else {
      totalsMap.set(cat.id, {
        categoryId:       cat.id,
        categoryName:     cat.name,
        categorySlug:     cat.slug,
        colorHex:         cat.color_hex,
        totalBrl:         Number(row.amount_brl),
        transactionCount: 1,
      });
    }
  }

  return [...totalsMap.values()].sort((a, b) => b.totalBrl - a.totalBrl);
}

/**
 * Totais por grupo analítico (apenas expenses).
 * Requer migration 0004. Retorna [] com graceful fallback se tabela não existir.
 */
export async function getGroupTotals(yearMonth: string): Promise<GroupTotal[]> {
  const supabase = await createSupabaseServerClient();
  const monthStart = `${yearMonth}-01`;

  try {
    const [
      { data: txData,    error: txError    },
      { data: catData,   error: catError   },
      { data: groupData, error: groupError },
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount_brl, category_id')
        .eq('reference_month', monthStart)
        .eq('kind', 'expense')
        .not('category_id', 'is', null),
      supabase
        .from('categories')
        .select('id, group_id'),
      supabase
        .from('category_groups')
        .select('id, name, slug, color_hex, kind')
        .order('sort_order'),
    ]);

    if (txError || catError || groupError) return [];

    // Mapa: category_id → group_id
    const catGroupMap = new Map<string, string>();
    for (const cat of (catData ?? []) as Array<{ id: string; group_id: string | null }>) {
      if (cat.group_id) catGroupMap.set(cat.id, cat.group_id);
    }

    // Agrega por grupo
    const groupAccum = new Map<string, { totalBrl: number; txCount: number }>();
    for (const tx of (txData ?? []) as Array<{ amount_brl: number; category_id: string | null }>) {
      if (!tx.category_id) continue;
      const groupId = catGroupMap.get(tx.category_id);
      if (!groupId) continue;

      const existing = groupAccum.get(groupId);
      if (existing) {
        existing.totalBrl += Number(tx.amount_brl);
        existing.txCount  += 1;
      } else {
        groupAccum.set(groupId, { totalBrl: Number(tx.amount_brl), txCount: 1 });
      }
    }

    const totalExpenses = [...groupAccum.values()].reduce((s, g) => s + g.totalBrl, 0);

    return ((groupData ?? []) as Array<{
      id: string; name: string; slug: string; color_hex: string; kind: string;
    }>)
      .filter((g) => groupAccum.has(g.id))
      .map((g) => {
        const { totalBrl, txCount } = groupAccum.get(g.id)!;
        return {
          groupId:          g.id,
          groupName:        g.name,
          groupSlug:        g.slug,
          colorHex:         g.color_hex,
          groupKind:        g.kind as GroupTotal['groupKind'],
          totalBrl,
          pct:              totalExpenses > 0 ? (totalBrl / totalExpenses) * 100 : 0,
          transactionCount: txCount,
        };
      })
      .sort((a, b) => b.totalBrl - a.totalBrl);
  } catch {
    return [];
  }
}

/**
 * Fixo vs variável do mês (apenas expenses).
 */
export async function getFixedVsVariable(yearMonth: string): Promise<FixedVarSummary> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('transactions')
    .select('amount_brl, is_fixed')
    .eq('reference_month', `${yearMonth}-01`)
    .eq('kind', 'expense');

  if (error) throw new Error(`getFixedVsVariable: ${error.message}`);

  let fixedBrl = 0, variableBrl = 0, fixedCount = 0, variableCount = 0;

  for (const row of (data ?? []) as Array<{ amount_brl: number; is_fixed: boolean }>) {
    const amount = Number(row.amount_brl);
    if (row.is_fixed) { fixedBrl    += amount; fixedCount++;    }
    else              { variableBrl += amount; variableCount++; }
  }

  const total = fixedBrl + variableBrl;

  return {
    fixedBrl,
    variableBrl,
    fixedPct:    total > 0 ? (fixedBrl    / total) * 100 : 0,
    variablePct: total > 0 ? (variableBrl / total) * 100 : 0,
    fixedCount,
    variableCount,
  };
}

/**
 * Tendência mensal dos últimos N meses — income + expense + net.
 *
 * Precedência idêntica a getMonthlyCashflow:
 *   1. transactions kind=income
 *   2. monthly_income (fallback "Salário Final")
 *   3. 0
 */
export async function getMonthlyTrend(monthsBack: number): Promise<MonthlyTrend[]> {
  const supabase = await createSupabaseServerClient();

  const now      = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
  const fromStr  = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-01`;

  const [{ data: txData, error: txError }, { data: miData }] = await Promise.all([
    supabase
      .from('transactions')
      .select('reference_month, amount_brl, kind')
      .gte('reference_month', fromStr)
      .in('kind', ['income', 'expense']),
    supabase
      .from('monthly_income')
      .select('year_month, amount_brl')
      .gte('year_month', fromStr),
  ]);

  if (txError) throw new Error(`getMonthlyTrend: ${txError.message}`);

  // Índice fallback: year_month → amount_brl
  const miMap = new Map<string, number>();
  for (const row of (miData ?? []) as Array<{ year_month: string; amount_brl: number }>) {
    const key = row.year_month.slice(0, 7);
    miMap.set(key, Number(row.amount_brl));
  }

  const monthMap = new Map<string, { incomeBrl: number; expenseBrl: number; count: number }>();

  for (const row of (txData ?? []) as unknown as Array<{
    reference_month: string;
    amount_brl: number;
    kind: string;
  }>) {
    const month    = row.reference_month.slice(0, 7);
    const existing = monthMap.get(month) ?? { incomeBrl: 0, expenseBrl: 0, count: 0 };

    if (row.kind === 'income')  existing.incomeBrl  += Number(row.amount_brl);
    if (row.kind === 'expense') existing.expenseBrl += Number(row.amount_brl);
    existing.count += 1;

    monthMap.set(month, existing);
  }

  // Garante que todos os meses com dados de expense também apareçam no mapa
  // e aplica o fallback de income onde não há transactions de income
  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { incomeBrl, expenseBrl, count }]) => {
      const resolvedIncome = incomeBrl > 0 ? incomeBrl : (miMap.get(month) ?? 0);
      return {
        month,
        incomeBrl:        resolvedIncome,
        expenseBrl,
        netBrl:           resolvedIncome - expenseBrl,
        transactionCount: count,
      };
    });
}

export async function getMonthSummary(
  yearMonth: string,
  prefs: DashboardPreferences
): Promise<{ total: number; count: number; topCategory: CategoryTotal | null }> {
  const totals = await getMonthlyTotals(yearMonth, prefs);
  const total  = totals.reduce((sum, t) => sum + t.totalBrl, 0);
  const count  = totals.reduce((sum, t) => sum + t.transactionCount, 0);

  return { total, count, topCategory: totals[0] ?? null };
}
