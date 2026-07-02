import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'
import { notifyAll, notify } from '@/lib/notifications'

const ALL_ROLE_IDS      = ['955126889171804170','955126890472022066','1462444900388704317','1501319885488390184','1342912254542348298']
const LEADERSHIP_ROLES  = ['955126889171804170','955126890472022066']

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
      include: { user: { select: { username: true, avatar: true, discordId: true, roleIds: true } } },
    }),
    prisma.user.findMany({
      where:  { roleIds: { hasSome: ALL_ROLE_IDS } },
      select: { id: true, username: true, avatar: true, discordId: true, roleIds: true },
    })
  ])
  return NextResponse.json({ items, payments, members, weekStart: weekStart.toISOString() })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error
  const { items } = await req.json()
  if (!Array.isArray(items)) return NextResponse.json({ error: 'Items invalid' }, { status: 400 })
  const weekStart = getWeekStart()
  await (prisma as any).taxItem.deleteMany({ where: { weekStart } })
  if (items.length === 0) return NextResponse.json({ items: [] })

  const created = await Promise.all(
    items
      .filter((item: any) => item.name && item.name.trim() !== '')
      .map((item: any) =>
        (prisma as any).taxItem.create({
          data: {
            name:        item.name.trim(),
            bucati:      parseInt(item.bucati) || 0,
                        termen:      item.termen && item.termen.trim() !== '' ? new Date(item.termen) : null,
            targetRoles: Array.isArray(item.targetRoles) ? item.targetRoles : [],
            weekStart,
            createdBy:   session!.user.id,
          },
        })
      )
  )

  await notifyAll({
    type:    'tax',
    title:   '💰 Taxă Sindicat Nouă',
    message: `Taxa pentru săptămâna aceasta a fost setată. Verifică materialele de predat!`,
  })

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

export async function DELETE(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id lipsa' }, { status: 400 })
  await (prisma as any).taxItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
