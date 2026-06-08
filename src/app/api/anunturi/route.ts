import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireLeadership } from '@/lib/middleware'

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  const anunturi = await (prisma as any).announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ anunturi })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { title, content, important } = await req.json()
  if (!title || !content) {
    return NextResponse.json({ error: 'Titlu și conținut obligatorii' }, { status: 400 })
  }

  const anunt = await (prisma as any).announcement.create({
    data: {
      title,
      content,
      important: important ?? false,
      author: session!.user.name,
      authorId: session!.user.id,
    },
  })
  return NextResponse.json({ anunt })
}
