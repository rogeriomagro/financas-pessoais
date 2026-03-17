import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import Link from 'next/link';
import { MonthAwareNavLink } from '@/components/layout/MonthAwareNavLink';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finanças Pessoais',
  description: 'Controle pessoal de gastos',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className} suppressHydrationWarning>
        <nav
          className="border-b h-14 flex items-center px-6"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <div className="max-w-screen-2xl w-full mx-auto flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'var(--accent-blue)' }}
              >
                F
              </div>
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Finanças
              </span>
            </div>

            <Suspense
              fallback={
                <Link href="/dashboard" className="text-sm font-medium opacity-50 hover:opacity-100" style={{ color: 'var(--text-primary)' }}>
                  Dashboard
                </Link>
              }
            >
              <MonthAwareNavLink
                href="/dashboard"
                className="text-sm font-medium transition-opacity hover:opacity-100 opacity-50"
                style={{ color: 'var(--text-primary)' }}
              >
                Dashboard
              </MonthAwareNavLink>
            </Suspense>
            <Suspense
              fallback={
                <Link href="/transactions" className="text-sm font-medium opacity-50 hover:opacity-100" style={{ color: 'var(--text-primary)' }}>
                  Transações
                </Link>
              }
            >
              <MonthAwareNavLink
                href="/transactions"
                className="text-sm font-medium transition-opacity hover:opacity-100 opacity-50"
                style={{ color: 'var(--text-primary)' }}
              >
                Transações
              </MonthAwareNavLink>
            </Suspense>
            <Suspense
              fallback={
                <Link href="/lancamentos" className="text-sm font-medium opacity-50 hover:opacity-100" style={{ color: 'var(--text-primary)' }}>
                  Lançamentos
                </Link>
              }
            >
              <MonthAwareNavLink
                href="/lancamentos"
                className="text-sm font-medium transition-opacity hover:opacity-100 opacity-50"
                style={{ color: 'var(--text-primary)' }}
              >
                Lançamentos
              </MonthAwareNavLink>
            </Suspense>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
