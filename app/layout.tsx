import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Minha Banda',
  description: 'Plataforma de gestão logística e financeira para a sua banda',
  manifest: '/manifest.json',
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
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b', // zinc-950
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-50 flex flex-col antialiased select-none overscroll-y-auto`}>
        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:flex fixed inset-y-0 left-0 w-64 border-r border-zinc-800 bg-zinc-950 z-50">
          <Navigation isMobile={false} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 md:ml-64 w-full flex flex-col pb-20 md:pb-0 select-text">
          {children}
        </main>

        {/* Mobile Bottom Navigation (hidden on desktop) */}
        <div className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 z-50 pb-safe">
          <Navigation isMobile={true} />
        </div>

        <Toaster 
          theme="dark" 
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#18181b', // zinc-900
              border: '1px solid #27272a', // zinc-800
              color: '#fafafa', // zinc-50
            }
          }} 
        />
      </body>
    </html>
  );
}
