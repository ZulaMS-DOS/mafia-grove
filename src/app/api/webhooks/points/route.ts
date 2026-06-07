import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'grove-webhook-secret-2026'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
  }

  const { discordId, amount, reason } = await req.json()
  if (!discordId || amount === undefined || !reason) {
    return NextResponse.json({ error: 'Campuri lipsa' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { discordId } })
  if (!user) {
    return NextResponse.json({ error: 'User negasit' }, { status: 404 })
  }

  const numAmount = parseInt(amount)
  if (isNaN(numAmount)) {
    return NextResponse.json({ error: 'Amount invalid' }, { status: 400 })
  }

  let moderator = await prisma.user.findFirst({
    where: { roleIds: { hasSome: ['955126889171804170', '955126890472022066'] } }
  })
  if (!moderator) moderator = user

  const [updatedUser, histEntry] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { points: { increment: numAmount } },
      select: { points: true, username: true, discordId: true },
    }),
    prisma.pointHistory.create({
      data: {
        userId: user.id,
        moderatorId: moderator.id,
        amount: numAmount,
        reason: `[Webhook] ${reason}`,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    user: updatedUser,
    message: `${numAmount > 0 ? '+' : ''}${numAmount} puncte pentru ${updatedUser.username}`,
  })
}
