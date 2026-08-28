import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

const VALID_ROLES = [
  '1107100643291828224', // Lider
  '1107099637644529684', // Co-Lider
  '1107098741510520852', // Tester
  '1107095888045801532', // Membru
  '1107093171026010203', // Muncitor
]

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const members = await prisma.user.findMany({
    where: {
      roleIds: { hasSome: VALID_ROLES }
    },
    orderBy: { username: 'asc' },
    select: {
      id: true, discordId: true, username: true,
      avatar: true, points: true, roleIds: true,
    },
  })

  return NextResponse.json({ members })
}
