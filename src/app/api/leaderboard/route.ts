import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const [leaders, recentOrders, recentSpins, recentPoints] = await Promise.all([
    // Top 20 dupa puncte
    prisma.user.findMany({
      orderBy: { points: 'desc' },
      take:    20,
      select:  { id: true, username: true, avatar: true, points: true, discordId: true },
    }),

    // Ultimele 10 comenzi shop
    (prisma as any).shopOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take:    10,
      include: {
        user: { select: { username: true, avatar: true } },
        item: { select: { name: true } },
      },
    }),

    // Ultimele 10 spinuri roata
    (prisma as any).wheelSpin.findMany({
      orderBy: { createdAt: 'desc' },
      take:    10,
      include: { user: { select: { username: true, avatar: true } } },
    }),

    // Ultimele 10 puncte acordate
    prisma.pointHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take:    10,
      include: { user: { select: { username: true, avatar: true } } },
    }),
  ])

  // Combina activitatile si sorteaza dupa data
  const activities = [
    ...recentOrders.map((o: any) => ({
      id:          `shop-${o.id}`,
      type:        'shop' as const,
      username:    o.user.username,
      avatar:      o.user.avatar,
      description: `a cumpărat "${o.item.name}"`,
      createdAt:   o.createdAt.toISOString(),
    })),
    ...recentSpins.map((s: any) => ({
      id:          `wheel-${s.id}`,
      type:        'wheel' as const,
      username:    s.user.username,
      avatar:      s.user.avatar,
      description: `a câștigat "${s.prizeLabel}" la roată`,
      createdAt:   s.createdAt.toISOString(),
    })),
    ...recentPoints.map((p: any) => ({
      id:          `points-${p.id}`,
      type:        'points' as const,
      username:    p.user.username,
      avatar:      p.user.avatar,
      description: `${p.amount > 0 ? '+' : ''}${p.amount} pts — ${p.reason}`,
      createdAt:   p.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)

  return NextResponse.json({ leaders, activities })
}
