import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId     = session!.user.id
  const roleIds    = session!.user.roleIds || []
  const isLeader   = roleIds.some((r: string) => LEADERSHIP_ROLES.includes(r))

  // Lider/Co-Lider vad toate, restul doar ale lor
  const demisii = await prisma.resignation.findMany({
    where:   isLeader ? {} : { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      user:     { select: { username: true, avatar: true, discordId: true } },
      approver: { select: { username: true } },
    },
  })
  return NextResponse.json({ demisii })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { reason } = await req.json()
  if (!reason) {
    return NextResponse.json({ error: 'Motivul este obligatoriu' }, { status: 400 })
  }

  const demisie = await prisma.resignation.create({
    data: { userId: session!.user.id, reason },
    include: { user: { select: { username: true, avatar: true } } },
  })

  // Notifica doar liderii
  const lideri = await prisma.user.findMany({
    where:  { roleIds: { hasSome: LEADERSHIP_ROLES } },
    select: { id: true },
  })
  await Promise.all(lideri.map(l => notify({
    userId:  l.id,
    type:    'resignation',
    title:   '🚪 Cerere Demisie Nouă',
    message: `${session!.user.name} a depus o cerere de demisie. Verifică și acționează!`,
  })))

  return NextResponse.json({ demisie })
}
