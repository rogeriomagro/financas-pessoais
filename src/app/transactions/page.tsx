import { getTransactions } from '@/lib/queries/transactions';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { currentYearMonth } from '@/lib/formatters';
import Link from 'next/link';

interface Props {
  searchParams: Promise<{
    month?: string;
    kind?: string;
    page?: string;
    search?: string;
  }>;
}

const PAGE_SIZE = 50;

export default async function TransactionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = params.month ?? currentYearMonth();
  const page = Number(params.page ?? 1);
  const kind = params.kind as import('@/types/database').TransactionKind | undefined;
  const search = params.search;

  const { rows, total } = await getTransactions({
    yearMonth: month,
    kind,
    search,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <Link
          href="/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-gray-500">{total} transações</span>
        {kind && (
          <Link href={`?month=${month}`} className="text-blue-600 hover:underline">
            Limpar filtro
          </Link>
        )}
      </div>

      <TransactionTable
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
