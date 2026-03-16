import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTransactionById } from '@/lib/queries/transactions';
import { formatBRL, formatDate } from '@/lib/formatters';
import { TRANSACTION_KIND_LABELS } from '@/lib/constants';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: Props) {
  const { id } = await params;

  let result: Awaited<ReturnType<typeof getTransactionById>> | null = null;
  try {
    result = await getTransactionById(id);
  } catch {
    notFound();
  }

  if (!result) notFound();

  const { transaction: tx, auditLog } = result;
  const cat = tx['categories'] as { name: string; color_hex: string } | null;
  const merchant = tx['merchants'] as { display_name: string } | null;
  const account = tx['accounts'] as { name: string } | null;

  const kind = String(tx['kind'] ?? '');
  const kindLabel = TRANSACTION_KIND_LABELS[kind as keyof typeof TRANSACTION_KIND_LABELS] ?? kind;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/transactions" className="text-sm text-blue-600 hover:underline">
        ← Transações
      </Link>

      {/* Detalhe da transação */}
      <div className="rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {String(tx['description'] ?? '')}
            </h1>
            {merchant && (
              <p className="text-sm text-gray-500 mt-0.5">{merchant.display_name}</p>
            )}
          </div>
          <span className="text-2xl font-bold text-gray-900 whitespace-nowrap">
            {formatBRL(Number(tx['amount_brl'] ?? 0))}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Data</dt>
            <dd className="font-medium text-gray-900">{formatDate(String(tx['date'] ?? ''))}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tipo</dt>
            <dd className="font-medium text-gray-900">{kindLabel}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Categoria</dt>
            <dd className="font-medium text-gray-900 flex items-center gap-1.5">
              {cat ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color_hex }}
                  />
                  {cat.name}
                </>
              ) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Conta</dt>
            <dd className="font-medium text-gray-900">{account?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Origem da categoria</dt>
            <dd className="font-medium text-gray-900 capitalize">
              {String(tx['category_source'] ?? '')}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Gasto fixo</dt>
            <dd className="font-medium text-gray-900">{tx['is_fixed'] ? 'Sim' : 'Não'}</dd>
          </div>
        </dl>
      </div>

      {/* Audit Trail */}
      {auditLog.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Histórico de alterações</h2>
          <ol className="space-y-3">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex gap-3 text-sm">
                <span className="text-gray-300 select-none">•</span>
                <div>
                  <span className="font-medium text-gray-700 capitalize">
                    {entry.action.replace(/_/g, ' ')}
                  </span>
                  {' por '}
                  <span className="text-gray-600">{entry.actor}</span>
                  {entry.reason && (
                    <span className="text-gray-500"> — {entry.reason}</span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(entry.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </main>
  );
}
