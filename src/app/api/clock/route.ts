import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET — istoricul sesiunilor userului curent
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user.id
  const now    = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const [sessions, activeSession] = await Promise.all([
    prisma.workSession.findMany({
      where:   { userId, createdAt: { gte: weekStart } },
      orderBy: { clockIn: 'desc' },
      take:    50,
    }),
    prisma.workSession.findFirst({
      where: { userId, clockOut: null },
    }),
  ])

  const minutesToday = sessions
    .filter(s => s.clockIn >= todayStart && s.totalMinutes)
    .reduce((a, s) => a + (s.totalMinutes ?? 0), 0)

  const minutesWeek = sessions
    .filter(s => s.totalMinutes)
    .reduce((a, s) => a + (s.totalMinutes ?? 0), 0)

  return NextResponse.json({ sessions, activeSession, minutesToday, minutesWeek })
}

// POST — clock in sau clock out
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId      = session!.user.id
  const { action }  = await req.json()

  if (action === 'in') {
    // Verifică dacă are sesiune activă
    const existing = await prisma.workSession.findFirst({ where: { userId, clockOut: null } })
    if (existing) return NextResponse.json({ error: 'Ești deja clock-in!' }, { status: 400 })

    const ws = await prisma.workSession.create({
      data: { userId, clockIn: new Date() },
    })
    return NextResponse.json({ session: ws })
  }

  if (action === 'out') {
    const active = await prisma.workSession.findFirst({ where: { userId, clockOut: null } })
    if (!active) return NextResponse.json({ error: 'Nu ești clock-in!' }, { status: 400 })

    const clockOut     = new Date()
    const totalMinutes = Math.floor((clockOut.getTime() - active.clockIn.getTime()) / 60000)

    const ws = await prisma.workSession.update({
      where: { id: active.id },
      data:  { clockOut, totalMinutes },
    })
    return NextResponse.json({ session: ws })
  }

  return NextResponse.json({ error: 'Acțiune invalidă' }, { status: 400 })
}
