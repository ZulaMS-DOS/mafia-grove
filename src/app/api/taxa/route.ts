import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

const LEADERSHIP_ROLES = ['955126889171804170','955126890472022066']

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
  const { session, error } = await requireAuth()
  if (error) return error

  const weekStart = getWeekStart()
  const userId    = session!.user.id
  const myRoleIds = session!.user.roleIds || []
  const now       = new Date()

  const [allItems, payment] = await Promise.all([
    (prisma as any).taxItem.findMany({
      where:   { weekStart },
      orderBy: { createdAt: 'asc' },
    }),
    (prisma as any).taxPayment.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    }),
  ])

  // Filtreaza dupa gradul userului
  const filtered = allItems.filter((item: any) =>
    !item.targetRoles?.length || item.targetRoles.some((r: string) => myRoleIds.includes(r))
  )

  // Marcheaza itemele expirate
  const items = filtered.map((item: any) => ({
    ...item,
    expired: item.termen ? new Date(item.termen) < now : false,
  }))

  // Verifica daca trebuie trimisa notificare "o zi inainte de expirare"
  // (doar pentru Lider/Co-Lider, o singura data pe zi)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  const expiringTomorrow = allItems.filter((item: any) => {
    if (!item.termen) return false
    const t = new Date(item.termen)
    return t >= tomorrow && t < dayAfterTomorrow
  })

  if (expiringTomorrow.length > 0) {
    const leaders = await prisma.user.findMany({
      where:  { roleIds: { hasSome: LEADERSHIP_ROLES } },
      select: { id: true },
    })

    for (const item of expiringTomorrow) {
      // Verifica daca notificarea a fost deja trimisa azi
      const alreadyNotified = await (prisma as any).notification.findFirst({
        where: {
          type:    'tax',
          title:   '⏰ Taxă Expiră Mâine',
          message: { contains: item.name },
          createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) },
        },
      })

      if (!alreadyNotified) {
        await Promise.all(
          leaders.map(l => notify({
            userId:  l.id,
            type:    'tax',
            title:   '⏰ Taxă Expiră Mâine',
            message: `Taxa "${item.name}" expiră mâine! Verifică plățile.`,
          }))
        )
      }
    }
  }

  return NextResponse.json({
    items,
    paid:      payment?.paid    ?? false,
    paidAt:    payment?.paidAt  ?? null,
    weekStart: weekStart.toISOString(),
  })
}
