import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { MobileNav } from '@/components/mobile-nav';
import { OfflineSetup } from '@/components/offline-setup';
import { ThemeToaster } from '@/components/theme-toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://gigueiros.com.br'),
  title: { default: 'Gigueiros', template: '%s' },
  description: 'Gestão Logística e Financeira Musical',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gigueiros',
  },
  formatDetection: {
    telephone: false,
  },
  robots: { index: true, follow: true },
  openGraph: {
    siteName: 'Gigueiros',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
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
            // Public pages (landing, login, onboarding, legal, auth) always render dark;
            // the theme choice only applies once inside the app.
            var p = location.pathname;
            var forcedDark = ['/', '/login', '/onboarding', '/termos', '/privacidade'].indexOf(p) !== -1 || p.indexOf('/auth') === 0;
            try {
              if (!forcedDark && localStorage.getItem('theme') === 'light') d.classList.remove('dark');
              else d.classList.add('dark');
            } catch(e) {
              d.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col antialiased select-none overscroll-y-auto`}>
        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:flex print:!hidden fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-950 z-50 dark:bg-zinc-950">
          <Navigation />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 md:pl-64 print:!pl-0 print:!pb-0 w-full flex flex-col select-text overflow-x-hidden">
          {children}
        </main>

        <MobileNav />

        <ThemeToaster />
        <OfflineSetup />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
