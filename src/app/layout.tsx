import type { Metadata } from 'next'
import { Inter, Bangers } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const bangers = Bangers({ subsets: ['latin'], weight: '400', variable: '--font-bangers' })

export const metadata: Metadata = {
  title: 'Bratkov Legacy — Dashboard',
  description: 'Platforma organizației Bratkov Legacy pe FiveM',
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
