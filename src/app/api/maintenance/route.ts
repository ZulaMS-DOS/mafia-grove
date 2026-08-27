import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SUPER_ADMIN_DISCORD_ID = '949760812518617138'

export async function GET() {
  const config = await (prisma as any).siteConfig.findUnique({ where: { id: 'main' } })
  return NextResponse.json({ maintenance: config?.maintenance ?? false, message: config?.message ?? '' })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.discordId !== SUPER_ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })
  }

  const { maintenance, message } = await req.json()

  const config = await (prisma as any).siteConfig.upsert({
    where:  { id: 'main' },
    update: { maintenance, ...(message !== undefined && { message }) },
    create: { id: 'main', maintenance, message: message || 'Site-ul este în mentenanță. Revenim în curând!' },
  })

  return NextResponse.json({ config })
}
