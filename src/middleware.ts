import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPER_ADMIN_DISCORD_ID = '949760812518617138'

export default withAuth(
  async function middleware(req) {
    // Verifica maintenance mode
    try {
      const configRes = await fetch(`${req.nextUrl.origin}/api/maintenance`)
      const config    = await configRes.json()

      if (config.maintenance) {
        const token = (req as any).nextauth?.token
        const discordId = token?.discordId as string | undefined

        // Super admin trece mereu
        if (discordId === SUPER_ADMIN_DISCORD_ID) {
          return NextResponse.next()
        }

        // Redirectioneaza la pagina maintenance
        return NextResponse.redirect(new URL('/maintenance', req.url))
      }
    } catch {}

    return NextResponse.next()
  },
  {
    pages: { signIn: '/auth/login' },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*'],
}
