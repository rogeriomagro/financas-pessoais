import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

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
      <body className={inter.className}>
        <nav
          className="border-b h-14 flex items-center px-6"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
        >
          <div className="max-w-7xl w-full mx-auto flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                style={{ background: 'var(--accent-green)', color: '#070E1C' }}
              >
                F
              </div>
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Finanças
              </span>
            </div>

            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors hover:opacity-100 opacity-60"
              style={{ color: 'var(--text-primary)' }}
            >
              Dashboard
            </Link>
            <Link
              href="/transactions"
              className="text-sm font-medium transition-colors hover:opacity-100 opacity-60"
              style={{ color: 'var(--text-primary)' }}
            >
              Transações
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
