import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// GET — materialele + statusul userului curent
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const weekStart = getWeekStart()
  const userId    = session!.user.id

  const [items, payment] = await Promise.all([
    (prisma as any).taxItem.findMany({
      where:   { weekStart },
      orderBy: { createdAt: 'asc' },
    }),
    (prisma as any).taxPayment.findUnique({
      where: { userId_weekStart: { userId, weekStart } },
    }),
  ])

  return NextResponse.json({
    items,
    paid:      payment?.paid    ?? false,
    paidAt:    payment?.paidAt  ?? null,
    weekStart: weekStart.toISOString(),
  })
}
