import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// GET — toate platile + membrii (lider)
export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const weekStart = getWeekStart()
  const [items, payments, members] = await Promise.all([
    (prisma as any).taxItem.findMany({ where: { weekStart }, orderBy: { createdAt: 'asc' } }),
    (prisma as any).taxPayment.findMany({
      where:   { weekStart },
      include: { user: { select: { username: true, avatar: true, discordId: true } } },
    }),
    prisma.user.findMany({ select: { id: true, username: true, avatar: true, discordId: true } }),
  ])

  return NextResponse.json({ items, payments, members, weekStart: weekStart.toISOString() })
}

// POST — seteaza materialele saptamanii
export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { items } = await req.json()
  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Items invalid' }, { status: 400 })
  }

  const weekStart = getWeekStart()
  await (prisma as any).taxItem.deleteMany({ where: { weekStart } })

  const created = await Promise.all(
    items.map((item: { name: string; bucati: number; termen: string }) =>
      (prisma as any).taxItem.create({
        data: {
          name:      item.name,
          bucati:    item.bucati   || 0,
          termen:    item.termen   || '',
          weekStart,
          createdBy: session!.user.id,
        },
      })
    )
  )

  return NextResponse.json({ items: created })
}

// PATCH — marcheaza taxa unui membru ca platita/neplatita (doar lider)
export async function PATCH(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { userId, paid } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId lipsa' }, { status: 400 })

  const weekStart = getWeekStart()

  const payment = await (prisma as any).taxPayment.upsert({
    where:  { userId_weekStart: { userId, weekStart } },
    update: { paid, paidAt: paid ? new Date() : null },
    create: { userId, weekStart, paid, paidAt: paid ? new Date() : null },
  })

  return NextResponse.json({ payment })
}
