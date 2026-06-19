import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

const SUPER_ADMIN_DISCORD_ID = '949760812518617138'

// GET — punctele userului curent + istoric
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = req.nextUrl.searchParams.get('userId') || session!.user.id

  if (userId !== session!.user.id && !session!.user.isLeadership) {
    return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })
  }

  const [user, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true, username: true } }),
    prisma.pointHistory.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    50,
      include: { moderator: { select: { username: true } } },
    }),
  ])

  return NextResponse.json({ points: user?.points ?? 0, history })
}

// POST — acorda / retrage puncte (doar Super Admin)
export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  if (session!.user.discordId !== SUPER_ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: 'Acces interzis — doar administratorul principal' }, { status: 403 })
  }

  const { targetUserId, amount, reason } = await req.json()
  if (!targetUserId || amount === undefined || !reason) {
    return NextResponse.json({ error: 'Câmpuri lipsă' }, { status: 400 })
  }

  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) return NextResponse.json({ error: 'Amount invalid' }, { status: 400 })
  if (Math.abs(numAmount) > 100000) {
    return NextResponse.json({ error: 'Valoare prea mare — verifică din nou suma' }, { status: 400 })
  }

  const [updatedUser, histEntry] = await prisma.$transaction([
    prisma.user.update({
      where:  { id: targetUserId },
      data:   { points: { increment: numAmount } },
      select: { points: true, username: true },
    }),
    prisma.pointHistory.create({
      data:    { userId: targetUserId, moderatorId: session!.user.id, amount: numAmount, reason },
      include: { moderator: { select: { username: true } }, user: { select: { username: true } } },
    }),
  ])

  return NextResponse.json({ user: updatedUser, entry: histEntry })
}
