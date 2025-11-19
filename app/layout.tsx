export const metadata = {
  title: 'Meta Campaign Logo Agent',
  description: 'Generate smart logos for Meta campaigns',
};

import './globals.css';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold tracking-tight">
                <span className="text-brand-400">Agentic</span> Logo Maker
              </h1>
              <nav className="text-sm text-slate-300">
                Create logos for Meta campaigns
              </nav>
            </div>
          </header>
          {children}
          <footer className="mt-12 text-center text-xs text-slate-400">
            Built for speed. Export-ready assets in seconds.
          </footer>
        </div>
      </body>
    </html>
  );
}
