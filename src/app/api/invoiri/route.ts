import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES = ['955126889171804170', '955126890472022066']

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const invoiri = await prisma.leaveRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user:     { select: { username: true, avatar: true, discordId: true } },
      approver: { select: { username: true } },
    },
  })
  return NextResponse.json({ invoiri })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { reason, startDate, endDate } = await req.json()
  if (!reason || !startDate || !endDate) {
    return NextResponse.json({ error: 'Câmpuri lipsă' }, { status: 400 })
  }

  const invoire = await prisma.leaveRequest.create({
    data: {
      userId:    session!.user.id,
      reason,
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
    },
    include: { user: { select: { username: true, avatar: true } } },
  })

  // Notifica toti liderii
  const lideri = await prisma.user.findMany({
    where: { roleIds: { hasSome: LEADERSHIP_ROLES } },
    select: { id: true },
  })
  await Promise.all(lideri.map(l => notify({
    userId:  l.id,
    type:    'leave',
    title:   '🏖️ Cerere Invoire Nouă',
    message: `${session!.user.name} a depus o cerere de invoire. Verifică și aprobă!`,
  })))

  return NextResponse.json({ invoire })
}
