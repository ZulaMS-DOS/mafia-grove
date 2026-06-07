import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

// GET /api/whitelist — lista tuturor intrarilor
export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const whitelist = await prisma.whitelist.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ whitelist })
}

// POST /api/whitelist — adauga un Discord ID
export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { discordId, username } = await req.json()

  if (!discordId) {
    return NextResponse.json({ error: 'discordId este obligatoriu' }, { status: 400 })
  }

  // Verifica formatul (trebuie sa fie numeric)
  if (!/^\d{17,20}$/.test(discordId)) {
    return NextResponse.json({
      error: 'Discord ID invalid — trebuie sa fie un numar de 17-20 cifre'
    }, { status: 400 })
  }

  const entry = await prisma.whitelist.upsert({
    where:  { discordId },
    update: { username: username || undefined },
    create: {
      discordId,
      username: username || null,
      addedBy:  session!.user.id,
    },
  })

  return NextResponse.json({ entry })
}
