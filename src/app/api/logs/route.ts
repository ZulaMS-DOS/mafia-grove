import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const categorie = req.nextUrl.searchParams.get('categorie')

  const logs = await (prisma as any).botLog.findMany({
    where:   categorie ? { categorie } : {},
    orderBy: { createdAt: 'desc' },
    take:    100,
  })

  return NextResponse.json({ logs })
}

export async function POST(req: NextRequest) {
  const { categorie, titlu, continut } = await req.json()
  if (!categorie || !titlu || !continut) {
    return NextResponse.json({ error: 'Date incomplete' }, { status: 400 })
  }

  const log = await (prisma as any).botLog.create({
    data: { categorie, titlu, continut },
  })

  return NextResponse.json({ log })
}
