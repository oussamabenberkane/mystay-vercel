import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { ServiceWorkerRegister } from '@/components/shared/service-worker-register'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'My Stay',
  description: 'Hotel Guest Experience Platform',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'My Stay' },
}

export const viewport: Viewport = {
  themeColor: '#1B2D5B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable}`}>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  )
}
