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

export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const weekStart = getWeekStart()
  const [items, payments, members] = await Promise.all([
    (prisma as any).taxItem.findMany({ where: { weekStart }, orderBy: { createdAt: 'asc' } }),
    (prisma as any).taxPayment.findMany({
      where: { weekStart },
      include: { user: { select: { username: true, avatar: true, discordId: true } } },
    }),
    prisma.user.findMany({ select: { id: true, username: true, avatar: true, discordId: true } }),
  ])

  return NextResponse.json({ items, payments, members, weekStart: weekStart.toISOString() })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const body = await req.json()
  const items = body.items

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'Items invalid' }, { status: 400 })
  }

  const weekStart = getWeekStart()

  // Sterge TOATE itemele existente pentru saptamana curenta
  await (prisma as any).taxItem.deleteMany({ where: { weekStart } })

  // Daca lista e goala, returneaza imediat
  if (items.length === 0) {
    return NextResponse.json({ items: [] })
  }

  // Creeaza itemele noi
  const created = await Promise.all(
    items
      .filter((item: any) => item.name && item.name.trim() !== '')
      .map((item: any) =>
        (prisma as any).taxItem.create({
          data: {
            name:      item.name.trim(),
            bucati:    parseInt(item.bucati)  || 0,
            termen:    item.termen?.trim()    || '',
            weekStart,
            createdBy: session!.user.id,
          },
        })
      )
  )

  return NextResponse.json({ items: created })
}

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
