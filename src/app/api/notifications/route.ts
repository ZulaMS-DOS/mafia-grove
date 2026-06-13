import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET — notificarile userului curent
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const userId = session!.user.id

  const notifications = await (prisma as any).notification.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })

  const unreadCount = notifications.filter((n: any) => !n.read).length

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH — marcheaza ca citite
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { id } = await req.json()
  const userId = session!.user.id

  if (id === 'all') {
    await (prisma as any).notification.updateMany({
      where: { userId, read: false },
      data:  { read: true },
    })
  } else {
    await (prisma as any).notification.update({
      where: { id },
      data:  { read: true },
    })
  }

  return NextResponse.json({ success: true })
}
