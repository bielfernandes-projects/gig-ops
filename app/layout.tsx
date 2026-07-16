import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemeToaster } from '@/components/theme-toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Minha Banda',
  description: 'Gestão Logística e Financeira Musical',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Minha Banda',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var d = document.documentElement;
            try {
              var saved = localStorage.getItem('theme');
              if (saved === 'light') {
                d.classList.remove('dark');
              } else if (saved === 'dark') {
                d.classList.add('dark');
              } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                d.classList.remove('dark');
              } else {
                d.classList.add('dark');
              }
            } catch(e) {
              d.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col antialiased select-none overscroll-y-auto`}>
        <ThemeToggle />
        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:flex fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-950 z-50 dark:bg-zinc-950">
          <Navigation isMobile={false} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 md:pl-64 w-full flex flex-col pb-20 md:pb-0 select-text overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <div className="mobile-nav md:hidden fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 z-50 pb-safe">
          <Navigation isMobile={true} />
        </div>

        <ThemeToaster />
      </body>
    </html>
  );
}
