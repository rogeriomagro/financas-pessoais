'use client';

import { useRouter } from 'next/navigation';
import { LancamentoForm } from './LancamentoForm';

interface Category {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
}

interface Props {
  categories: Category[];
  defaultMonth: string;
}

export function LancamentosRefresher({ categories, defaultMonth }: Props) {
  const router = useRouter();
  return (
    <LancamentoForm
      categories={categories}
      defaultMonth={defaultMonth}
      onSuccess={() => router.refresh()}
    />
  );
}
