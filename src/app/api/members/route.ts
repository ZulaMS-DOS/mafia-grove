import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

const VALID_ROLES = [
  '955126889171804170', // Lider
  '955126890472022066', // Co-Lider
  '1462444900388704317', // Tester
  '1501319885488390184', // Membru
  '1342912254542348298', // Muncitor
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
