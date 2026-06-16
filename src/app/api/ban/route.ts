import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireLeadership } from '@/lib/middleware'
import { notify } from '@/lib/notifications'

// GET — lista userilor banati + toti userii
export async function GET() {
  const { error } = await requireLeadership()
  if (error) return error

  const [banned, members] = await Promise.all([
    prisma.user.findMany({
      where:   { banned: true },
      orderBy: { bannedAt: 'desc' },
      select:  { id: true, username: true, avatar: true, discordId: true, bannedAt: true, banReason: true, bannedBy: true },
    }),
    prisma.user.findMany({
      where:   { banned: false },
      orderBy: { username: 'asc' },
      select:  { id: true, username: true, avatar: true, discordId: true },
    }),
  ])

  return NextResponse.json({ banned, members })
}

// POST — baneaza user
export async function POST(req: NextRequest) {
  const { session, error } = await requireLeadership()
  if (error) return error

  const { userId, reason } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId lipsa' }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    data:  {
      banned:    true,
      bannedAt:  new Date(),
      bannedBy:  session!.user.id,
      banReason: reason || 'Fără motiv specificat',
    },
  })

  await notify({
    userId,
    type:    'fine',
    title:   '🚫 Ai fost banat de pe site',
    message: `Motivul: ${reason || 'Fără motiv specificat'} — de la ${session!.user.name}`,
  })

  return NextResponse.json({ success: true })
}

// DELETE — unbaneaza user
export async function DELETE(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId lipsa' }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    data:  { banned: false, bannedAt: null, bannedBy: null, banReason: null },
  })

  return NextResponse.json({ success: true })
}
