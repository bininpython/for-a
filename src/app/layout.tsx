import type { Metadata, Viewport } from 'next';
import { Inter, Barlow_Condensed } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'HPE — Patrick Personal · Treinamento personalizado em Coronel Fabriciano',
    template: '%s · HPE — Patrick Personal',
  },
  description:
    'Treinamento personalizado, acompanhamento profissional e evolução constante. ' +
    'Atendimento presencial na ALP FIT, Coronel Fabriciano/MG.',
  applicationName: 'HPE — Patrick Personal',
  keywords: [
    'personal trainer',
    'Coronel Fabriciano',
    'ALP FIT',
    'hipertrofia',
    'emagrecimento',
    'treinamento de força',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'HPE — Patrick Personal',
    title: 'HPE — Patrick Personal',
    description:
      'Supere seus limites. Construa sua melhor versão. Treinamento personalizado na ALP FIT, Coronel Fabriciano/MG.',
  },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh bg-hpe-black">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
