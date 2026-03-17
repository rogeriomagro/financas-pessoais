import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TransactionKind } from '@/types/database';

const ALLOWED_KINDS: TransactionKind[] = [
  'expense', 'income', 'internal_transfer', 'savings', 'investment',
];

interface UpdateBody {
  kind?: TransactionKind;
  category_id?: string | null;
  merchant_id?: string | null;
  account_id?: string | null;
  description?: string;
  amount_brl?: number;
  date?: string;
  is_fixed?: boolean;
  reason?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  let body: UpdateBody;
  try {
    body = await request.json() as UpdateBody;
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  if (body.kind && !ALLOWED_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: 'kind inválido' }, { status: 400 });
  }

  if (body.description !== undefined && typeof body.description !== 'string') {
    return NextResponse.json({ error: 'description deve ser string' }, { status: 400 });
  }

  if (body.amount_brl !== undefined && (typeof body.amount_brl !== 'number' || body.amount_brl <= 0)) {
    return NextResponse.json({ error: 'amount_brl deve ser número positivo' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Lê estado atual para audit log
  const { data: current, error: fetchError } = await supabase
    .from('transactions')
    .select('id, kind, category_id, merchant_id, account_id, description, is_fixed, category_source')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
  }

  const currentRow = current as Record<string, unknown>;

  // Constrói o objeto de updates
  const updates: Record<string, unknown> = {};

  if (body.kind !== undefined) updates['kind'] = body.kind;
  if (body.category_id !== undefined) updates['category_id'] = body.category_id;
  if (body.merchant_id !== undefined) updates['merchant_id'] = body.merchant_id;
  if (body.account_id !== undefined) updates['account_id'] = body.account_id;
  if (body.description !== undefined) updates['description'] = body.description.trim();
  if (body.is_fixed !== undefined)    updates['is_fixed']    = body.is_fixed;
  if (body.amount_brl !== undefined)  updates['amount_brl']  = body.amount_brl;
  if (body.date !== undefined)        updates['date']        = body.date;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  if ('category_id' in updates || 'kind' in updates) {
    updates['category_source'] = 'manual';
  }

  // Atualiza transação
  const { data: updated, error: updateError } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit log
  const oldValue = Object.fromEntries(
    Object.keys(updates).map((k) => [k, currentRow[k]])
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('audit_log') as any).insert({
    table_name: 'transactions',
    row_id: id,
    action: 'category_id' in updates ? 'category_changed' : 'field_updated',
    actor: 'user',
    old_value: oldValue,
    new_value: updates,
    reason: body.reason ?? null,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
