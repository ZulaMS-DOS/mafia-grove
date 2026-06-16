import type { Metadata } from 'next'
import { Inter, Bangers } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const bangers = Bangers({ subsets: ['latin'], weight: '400', variable: '--font-bangers' })

export const metadata: Metadata = {
  title: 'Grove Street — Dashboard',
  description: 'Platforma organizației Grove Street pe FiveM',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className={`${inter.className} ${bangers.variable} bg-black text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
