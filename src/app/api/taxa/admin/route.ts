import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

// GET — toate platile saptamanii (lider vede toti membrii)
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

  return NextResponse.json({ items, payments, members, weekStart })
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

  // Sterge itemele existente pentru saptamana curenta
  await (prisma as any).taxItem.deleteMany({ where: { weekStart } })

  // Creeaza itemele noi
  const created = await Promise.all(
    items.map((item: { name: string; neoficial: number; oficial: number }) =>
      (prisma as any).taxItem.create({
        data: {
          name:       item.name,
          neoficial:  item.neoficial || 0,
          oficial:    item.oficial || 0,
          weekStart,
          createdBy:  session!.user.id,
        },
      })
    )
  )

  return NextResponse.json({ items: created })
}
