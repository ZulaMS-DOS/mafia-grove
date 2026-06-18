import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'
import { notifyAll } from '@/lib/notifications'

// GET — membru vede ale lui, lider vede toate
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const all = req.nextUrl.searchParams.get('all') === 'true'

  if (all) {
    const { error: leaderError } = await requireLeadership()
    if (leaderError) return leaderError

    const reports = await (prisma as any).bugReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true, avatar: true } } },
    })
    return NextResponse.json({ reports })
  }

  const reports = await (prisma as any).bugReport.findMany({
    where:   { userId: session!.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ reports })
}

// POST — trimite bug report
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { title, description, mediaUrls } = await req.json()
  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Titlu și descriere obligatorii' }, { status: 400 })
  }

  const report = await (prisma as any).bugReport.create({
    data: {
      userId:      session!.user.id,
      title:       title.trim(),
      description: description.trim(),
      mediaUrls:   mediaUrls || [],
    },
  })

  await notifyAll({
    type:    'announcement',
    title:   '🐛 Bug Report Nou',
    message: `${session!.user.name} a raportat: ${title}`,
    excludeUserId: session!.user.id,
  })

  return NextResponse.json({ report })
}

// PATCH — schimba status (doar lider)
export async function PATCH(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id, status } = await req.json()
  const report = await (prisma as any).bugReport.update({
    where: { id },
    data:  { status },
  })
  return NextResponse.json({ report })
}

// DELETE — sterge report (doar lider)
export async function DELETE(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { id } = await req.json()
  await (prisma as any).bugReport.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
