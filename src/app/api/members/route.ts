import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { getGuildMember } from '@/lib/discord'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const users = await prisma.user.findMany({
    orderBy: { points: 'desc' },
    select: {
      id: true, discordId: true, username: true, avatar: true,
      roleIds: true, points: true, createdAt: true,
      sessions: { where: { clockOut: null }, select: { clockIn: true } },
    },
  })

  return NextResponse.json({ members: users })
}
