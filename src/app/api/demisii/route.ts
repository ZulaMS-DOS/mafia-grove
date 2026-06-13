import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error
  const demisii = await prisma.resignation.findMany({
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
  if (!reason) return NextResponse.json({ error: 'Motivul este obligatoriu' }, { status: 400 })
  const demisie = await prisma.resignation.create({
    data: { userId: session!.user.id, reason },
    include: { user: { select: { username: true, avatar: true } } },
  })
  return NextResponse.json({ demisie })
}
