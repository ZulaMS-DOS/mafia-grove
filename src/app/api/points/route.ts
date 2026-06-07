import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

// GET — punctele userului curent + istoric
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = req.nextUrl.searchParams.get('userId') || session!.user.id

  // Daca cere alt user, trebuie sa fie leadership
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

// POST — acorda / retrage puncte (Leadership only)
export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { targetUserId, amount, reason } = await req.json()
  if (!targetUserId || amount === undefined || !reason) {
    return NextResponse.json({ error: 'Câmpuri lipsă' }, { status: 400 })
  }

  const numAmount = parseInt(amount)
  if (isNaN(numAmount)) return NextResponse.json({ error: 'Amount invalid' }, { status: 400 })

  // Update puncte user + adauga in istoric
  const [updatedUser, histEntry] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data:  { points: { increment: numAmount } },
      select: { points: true, username: true },
    }),
    prisma.pointHistory.create({
      data: { userId: targetUserId, moderatorId: session!.user.id, amount: numAmount, reason },
      include: { moderator: { select: { username: true } }, user: { select: { username: true } } },
    }),
  ])

  return NextResponse.json({ user: updatedUser, entry: histEntry })
}
