import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

// GET — toate invoirile (publice)
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

// POST — creare invoire
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
  return NextResponse.json({ invoire })
}
