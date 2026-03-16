import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface PreferencesBody {
  hide_internal_transfers?: boolean;
  hide_investments?: boolean;
  default_month_offset?: number;
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: PreferencesBody;
  try {
    body = await request.json() as PreferencesBody;
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.hide_internal_transfers === 'boolean') {
    updates['hide_internal_transfers'] = body.hide_internal_transfers;
  }
  if (typeof body.hide_investments === 'boolean') {
    updates['hide_investments'] = body.hide_investments;
  }
  if (typeof body.default_month_offset === 'number') {
    updates['default_month_offset'] = body.default_month_offset;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('dashboard_preferences')
    .update(updates)
    .not('id', 'is', null)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('dashboard_preferences')
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
