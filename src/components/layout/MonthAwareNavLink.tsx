'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Link de navegação que preserva o parâmetro ?month= na URL.
 * Garante que ao navegar entre Dashboard e Transações o mês selecionado persista.
 */
export function MonthAwareNavLink({ href, children, className, style }: Props) {
  const searchParams = useSearchParams();
  const month        = searchParams.get('month');
  const finalHref    = month ? `${href}?month=${month}` : href;

  return (
    <Link href={finalHref} className={className} style={style}>
      {children}
    </Link>
  );
}
